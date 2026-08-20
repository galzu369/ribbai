import { createHash } from "node:crypto";
import { copyFileSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { basename, join } from "node:path";
import {
  DUAL_BLOCK_BATCH_WORKBOOKS,
  GARNISHES_WORKBOOK_SHORT,
  loadAliases,
  loadRecipeYields,
  MENU_ITEMS_DIR,
  PATHS,
  QUANTITY_CORRECTIONS,
  RECIPE_CORRECTIONS,
} from "./lib/config";
import { parseFichaBlocks, type FichaBlock } from "./lib/ficha-parser";
import { classifyRow, type MatchContext, type MatchResult } from "./lib/matching";
import { planBlockMutations, type CellMutation } from "./lib/mutations";
import { parsePricebook, type Pricebook } from "./lib/pricebook";
import { computeAll, type BlockComputation } from "./lib/recompute";
import { parseSharedStrings, resolveCellText } from "./lib/shared-strings";
import {
  buildDependencyOrder,
  buildSubrecipeIndex,
  resolveSubrecipeTarget,
  type NodeRole,
} from "./lib/subrecipes";
import {
  financialChecks,
  scanErrorTokens,
  structuralChecks,
  type SubrecipeLinkCheck,
} from "./lib/validate";
import { createBackup } from "./lib/backup";
import { findLockedWorkbooks, formatLockedMessage } from "./lib/preflight";
import { planWorkbookCleanup } from "./lib/workbook-cleanup";
import { getCell, writeInlineStringCell, writeValueCell } from "./lib/xlsx-sheet";
import { formatNumber } from "./lib/xml-utils";
import {
  archiveToBytes,
  listSheets,
  openArchive,
  partText,
  setPartText,
  type Archive,
  type SheetRef,
} from "./lib/xlsx-zip";

const USAGE =
  "Uso: npx tsx scripts/kitchen/update-costing.ts [--apply|--dry-run]\n" +
  "  --dry-run (default): mostra o que mudaria sem escrever nada\n" +
  "  --apply: cria backup, escreve os workbooks e valida";

export function workbookShortName(file: string): string {
  return basename(file)
    .replace(/^Fichas Técnicas /u, "")
    .replace(/\.xlsx$/u, "");
}

export interface WorkbookState {
  short: string;
  path: string;
  archive: Archive;
  strings: string[];
  sheets: SheetRef[];
}

interface PartMutation {
  workbook: string;
  part: string;
  detail: string;
  apply: (archive: Archive) => void;
}

export interface Pipeline {
  pricebook: Pricebook;
  workbooks: Map<string, WorkbookState>;
  blocks: FichaBlock[];
  roles: Map<string, NodeRole>;
  matches: Map<string, MatchResult[]>;
  order: string[];
  comps: Map<string, BlockComputation>;
  cellMutations: CellMutation[];
  partMutations: PartMutation[];
}

export function workbookFiles(): { short: string; path: string }[] {
  // Só workbooks de fichas técnicas — ignora extras do Chefe (ex.: Lista Foodcost.xlsx).
  const menuFiles = readdirSync(MENU_ITEMS_DIR)
    .filter(
      (f) =>
        f.toLowerCase().endsWith(".xlsx") &&
        !f.startsWith("~$") &&
        /^Fichas Técnicas /u.test(f),
    )
    .sort((a, b) => a.localeCompare(b, "pt"));
  return [
    { short: GARNISHES_WORKBOOK_SHORT, path: PATHS.garnishesXlsx },
    ...menuFiles.map((f) => ({
      short: workbookShortName(f),
      path: join(MENU_ITEMS_DIR, f),
    })),
  ];
}

function blockRole(block: FichaBlock): NodeRole {
  if (block.workbook === GARNISHES_WORKBOOK_SHORT) return "garnish";
  if (DUAL_BLOCK_BATCH_WORKBOOKS.has(block.workbook) && block.blockIndex > 0) {
    return "batch";
  }
  if (block.workbook === "Acompanhamentos") return "side";
  return "menu";
}

/**
 * Correções declaradas ao source: renomes de ingrediente e correções de
 * quantidade. Aplicadas em memória ANTES do parse (para que o matching e o
 * costing já vejam os valores corretos) e de forma idempotente.
 */
function planCorrections(state: WorkbookState): PartMutation[] {
  const muts: PartMutation[] = [];

  const sheetFor = (name: string): SheetRef => {
    const sheet = state.sheets.find((s) => s.name === name);
    if (!sheet) {
      throw new Error(`Correção: folha "${name}" não existe em ${state.short}`);
    }
    return sheet;
  };

  for (const corr of RECIPE_CORRECTIONS) {
    if (corr.workbook !== state.short) continue;
    const sheet = sheetFor(corr.sheet);
    const xml = partText(state.archive, sheet.target);
    const cell = getCell(xml, corr.ref);
    const text =
      cell && cell.vRaw !== null
        ? resolveCellText(cell.t, cell.vRaw, state.strings)
        : null;
    if (text?.trim() === corr.to) continue; // já aplicada
    if (text?.trim() !== corr.from) {
      throw new Error(
        `Correção ${state.short}/${corr.sheet}!${corr.ref}: esperado "${corr.from}" ou "${corr.to}", encontrado "${text}"`,
      );
    }
    setPartText(state.archive, sheet.target, writeInlineStringCell(xml, corr.ref, corr.to));
    muts.push({
      workbook: state.short,
      part: sheet.target,
      detail: `${corr.sheet}!${corr.ref}: "${corr.from}" -> "${corr.to}" — ${corr.note}`,
      apply: () => undefined, // já aplicada em memória
    });
  }

  for (const corr of QUANTITY_CORRECTIONS) {
    if (corr.workbook !== state.short) continue;
    const sheet = sheetFor(corr.sheet);
    const xml = partText(state.archive, sheet.target);

    // guarda de segurança: a linha tem de ser mesmo a do ingrediente indicado
    const nameRef = corr.ref.replace(/^C/, "B");
    const nameCell = getCell(xml, nameRef);
    const name =
      nameCell && nameCell.vRaw !== null
        ? resolveCellText(nameCell.t, nameCell.vRaw, state.strings)?.trim()
        : null;
    if (name !== corr.ingredient) {
      throw new Error(
        `Correção de quantidade ${state.short}/${corr.sheet}!${corr.ref}: esperava o ingrediente "${corr.ingredient}" em ${nameRef}, encontrado "${name}"`,
      );
    }

    const qtyCell = getCell(xml, corr.ref);
    const current = qtyCell?.vRaw !== null && qtyCell?.vRaw !== undefined
      ? Number(qtyCell.vRaw)
      : NaN;
    if (formatNumber(corr.to) === (qtyCell?.vRaw ?? "")) continue; // já aplicada
    if (!Number.isFinite(current) || formatNumber(current) !== formatNumber(corr.from)) {
      throw new Error(
        `Correção de quantidade ${state.short}/${corr.sheet}!${corr.ref} ("${corr.ingredient}"): esperado ${corr.from} ou ${corr.to}, encontrado ${qtyCell?.vRaw ?? "(vazio)"}`,
      );
    }
    setPartText(
      state.archive,
      sheet.target,
      writeValueCell(xml, corr.ref, formatNumber(corr.to)),
    );
    muts.push({
      workbook: state.short,
      part: sheet.target,
      detail: `${corr.sheet}!${corr.ref} "${corr.ingredient}": quantidade ${corr.from} -> ${corr.to} — ${corr.note}`,
      apply: () => undefined, // já aplicada em memória
    });
  }

  return muts;
}

export function runPipeline(bytesByShort: Map<string, Uint8Array>): Pipeline {
  const pricebook = parsePricebook(openArchive(readFileSync(PATHS.pricebookXlsx)));

  const workbooks = new Map<string, WorkbookState>();
  const partMutations: PartMutation[] = [];
  const blocks: FichaBlock[] = [];

  for (const { short, path } of workbookFiles()) {
    const bytes = bytesByShort.get(short);
    if (!bytes) throw new Error(`Bytes em falta para o workbook ${short}`);
    const archive = openArchive(bytes);
    const strings = parseSharedStrings(partText(archive, "xl/sharedStrings.xml"));
    const sheets = listSheets(archive);
    const state: WorkbookState = { short, path, archive, strings, sheets };
    partMutations.push(...planCorrections(state));
    workbooks.set(short, state);
    for (const sheet of sheets) {
      blocks.push(
        ...parseFichaBlocks(
          short,
          sheet.name,
          sheet.target,
          partText(archive, sheet.target),
          strings,
        ),
      );
    }
  }

  const roles = new Map(blocks.map((b) => [b.nodeId, blockRole(b)]));
  const index = buildSubrecipeIndex(blocks, roles);
  const ctx: MatchContext = {
    pricebook,
    resolveSubrecipe: (req, name) => resolveSubrecipeTarget(index, req, name),
    aliases: loadAliases(),
  };
  const matches = new Map<string, MatchResult[]>(
    blocks.map((b) => [b.nodeId, b.rows.map((r) => classifyRow(r, b, ctx))]),
  );
  const order = buildDependencyOrder(blocks, matches);
  const recipeYields = loadRecipeYields();
  const comps = computeAll(blocks, matches, order, recipeYields);

  const cellMutations = blocks.flatMap((b) => {
    const comp = comps.get(b.nodeId);
    if (!comp) throw new Error(`Sem computação para "${b.nodeId}"`);
    const state = workbooks.get(b.workbook);
    return planBlockMutations(
      b,
      comp,
      {
        preserveSubIva: b.workbook !== GARNISHES_WORKBOOK_SHORT,
        recipeYield: recipeYields.get(b.nodeId),
      },
      state ? partText(state.archive, b.target) : undefined,
    );
  });
  for (const state of workbooks.values()) {
    partMutations.push(
      ...planWorkbookCleanup(state.archive).map((m) => ({
        workbook: state.short,
        part: m.part,
        detail: m.detail,
        apply: m.apply,
      })),
    );
  }

  return {
    pricebook,
    workbooks,
    blocks,
    roles,
    matches,
    order,
    comps,
    cellMutations,
    partMutations,
  };
}

export function subrecipeLinks(p: Pipeline): SubrecipeLinkCheck[] {
  const links: SubrecipeLinkCheck[] = [];
  for (const block of p.blocks) {
    const rowMatches = p.matches.get(block.nodeId) ?? [];
    for (let i = 0; i < block.rows.length; i++) {
      const m = rowMatches[i];
      if (m.status === "SUBRECIPE" && m.targetNode) {
        links.push({
          node: block.nodeId,
          row: block.rows[i].row,
          targetNode: m.targetNode,
        });
      }
    }
  }
  return links;
}

export function loadAllWorkbookBytes(): Map<string, Uint8Array> {
  const map = new Map<string, Uint8Array>();
  for (const { short, path } of workbookFiles()) {
    map.set(short, readFileSync(path));
  }
  return map;
}

function sha8(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex").slice(0, 8);
}

export async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const unknown = args.filter((a) => a !== "--apply" && a !== "--dry-run");
  if (unknown.length > 0) {
    console.error(`Argumentos desconhecidos: ${unknown.join(" ")}\n${USAGE}`);
    process.exit(2);
  }

  if (apply) {
    const locked = findLockedWorkbooks([
      PATHS.pricebookXlsx,
      ...workbookFiles().map((w) => w.path),
    ]);
    if (locked.length > 0) {
      console.error(formatLockedMessage(locked));
      process.exit(1);
    }
  }

  const bytesBefore = loadAllWorkbookBytes();
  const p = runPipeline(bytesBefore);

  const statusCounts = new Map<string, number>();
  let rowsTotal = 0;
  for (const list of p.matches.values()) {
    for (const m of list) {
      rowsTotal += 1;
      statusCounts.set(m.status, (statusCounts.get(m.status) ?? 0) + 1);
    }
  }
  const totalMut = p.cellMutations.length + p.partMutations.length;
  console.log(
    `\n${apply ? "APPLY" : "DRY-RUN"} — ${p.workbooks.size} workbooks, ${p.blocks.length} fichas/blocos, ${rowsTotal} linhas, ${totalMut} mutações planeadas`,
  );
  console.log(
    `  Estados: ${[...statusCounts.entries()].map(([k, v]) => `${k}=${v}`).join("  ")}\n`,
  );

  const perWb = new Map<string, number>();
  for (const m of p.cellMutations) perWb.set(m.workbook, (perWb.get(m.workbook) ?? 0) + 1);
  for (const [short] of p.workbooks) {
    const nBlocks = p.blocks.filter((b) => b.workbook === short).length;
    console.log(
      `  ${short.padEnd(22)} ${String(nBlocks).padStart(2)} blocos  ${perWb.get(short) ?? 0} alterações de células`,
    );
  }
  if (p.partMutations.length > 0) {
    console.log(`\n  Estruturais/correções:`);
    for (const m of p.partMutations) {
      console.log(`    [${m.workbook}] ${m.part}: ${m.detail}`);
    }
  }

  const unresolved: string[] = [];
  const warnings: string[] = [];
  for (const block of p.blocks) {
    const rowMatches = p.matches.get(block.nodeId) ?? [];
    rowMatches.forEach((m, i) => {
      const name = block.rows[i].name;
      if (["UNMATCHED", "AMBIGUOUS", "PENDING"].includes(m.status)) {
        unresolved.push(
          `${block.nodeId} · "${name}" [${m.status}]${m.candidates ? ` candidatos: ${m.candidates.join(", ")}` : ""}`,
        );
      }
      for (const f of m.flags) warnings.push(`${block.nodeId} · "${name}": ${f}`);
    });
  }
  if (unresolved.length > 0) {
    console.log(`\n  Por resolver (sem preço atribuído — nada foi inventado):`);
    for (const u of unresolved) console.log(`    ${u}`);
  }
  if (warnings.length > 0) {
    console.log(`\n  Avisos (${warnings.length}):`);
    for (const w of warnings.slice(0, 25)) console.log(`    ${w}`);
    if (warnings.length > 25) console.log(`    … +${warnings.length - 25}`);
  }

  if (!apply) {
    console.log(`\nDry-run concluído — nada foi alterado. Correr com --apply para escrever.`);
    return;
  }

  // aplicar mutações de células, agrupadas por workbook -> parte
  const byWorkbook = new Map<string, Map<string, CellMutation[]>>();
  for (const m of p.cellMutations) {
    let parts = byWorkbook.get(m.workbook);
    if (!parts) byWorkbook.set(m.workbook, (parts = new Map()));
    const list = parts.get(m.part);
    if (list) list.push(m);
    else parts.set(m.part, [m]);
  }
  for (const [short, parts] of byWorkbook) {
    const state = p.workbooks.get(short);
    if (!state) throw new Error(`Workbook desconhecido: ${short}`);
    for (const [part, muts] of parts) {
      let xml = partText(state.archive, part);
      for (const m of muts) xml = m.apply(xml);
      setPartText(state.archive, part, xml);
    }
  }
  for (const m of p.partMutations) {
    const state = p.workbooks.get(m.workbook);
    if (state) m.apply(state.archive);
  }

  // serializar e validar em memória ANTES de escrever
  const bytesAfter = new Map<string, Uint8Array>();
  for (const [short, state] of p.workbooks) {
    bytesAfter.set(short, archiveToBytes(state.archive));
  }

  const problems: string[] = [];
  for (const [short, bytes] of bytesAfter) {
    const archive = openArchive(bytes);
    problems.push(...scanErrorTokens(archive, `[${short}] `));
    problems.push(...structuralChecks(archive, `[${short}] `));
  }
  const second = runPipeline(bytesAfter);
  const yieldQuantities = new Map(
    [...loadRecipeYields().entries()].map(([k, v]) => [k, v.yieldQuantity]),
  );
  problems.push(
    ...financialChecks(second.blocks, subrecipeLinks(second), yieldQuantities),
  );
  const residual = second.cellMutations.length + second.partMutations.length;
  if (residual > 0) {
    problems.push(
      `Idempotência falhou: segunda passagem ainda planeia ${residual} mutações (${[
        ...second.cellMutations.map((m) => `${m.workbook}/${m.sheet}!${m.ref}`),
        ...second.partMutations.map((m) => `${m.workbook}:${m.part}`),
      ]
        .slice(0, 12)
        .join(", ")}…)`,
    );
  }

  if (problems.length > 0) {
    console.error(`\n✗ Validação falhou — NENHUM ficheiro foi alterado:`);
    for (const prob of problems) console.error(`  - ${prob}`);
    process.exit(1);
  }

  // Só escrever workbooks que tiveram alterações de conteúdo. A recompressão
  // do zip nunca reproduz os bytes originais do Excel, por isso comparar bytes
  // marcaria todos como alterados a cada execução.
  const touched = new Set<string>([
    ...p.cellMutations.map((m) => m.workbook),
    ...p.partMutations.map((m) => m.workbook),
  ]);

  const backup = createBackup(workbookFiles().map((w) => w.path));
  console.log(`\n  Backup: ${backup.dir} (${backup.files.length} ficheiros)`);

  // Escrever só depois de todas as validações. Se uma escrita falhar a meio
  // (ex.: alguém abriu o workbook no Excel entretanto), repor os já escritos a
  // partir do backup para não deixar o conjunto meio atualizado.
  const writtenPaths: string[] = [];
  try {
    for (const { short, path } of workbookFiles()) {
      const after = bytesAfter.get(short);
      if (!after || !touched.has(short)) continue;
      writeFileSync(path, after);
      writtenPaths.push(path);
      console.log(`  ✓ ${path} (${sha8(after)})`);
    }
  } catch (err: unknown) {
    for (const path of writtenPaths) {
      copyFileSync(join(backup.dir, basename(path)), path);
    }
    console.error(
      `\n✗ A sincronização falhou ao escrever. ${writtenPaths.length} ficheiro(s) repostos a partir de ${backup.dir}.`,
    );
    throw err;
  }
  console.log(
    `\n✓ ${writtenPaths.length} workbooks atualizados; validação financeira e idempotência OK.`,
  );
  if (unresolved.length > 0) {
    console.log(
      `\n  ⚠ ${unresolved.length} ingrediente(s) sem preço (edição do Chefe ou Preçário em falta):`,
    );
    for (const u of unresolved.slice(0, 20)) console.log(`    ${u}`);
    if (unresolved.length > 20) console.log(`    … +${unresolved.length - 20}`);
  }

  // relatório de execução
  mkdirSync(PATHS.reportsDir, { recursive: true });
  const runDate = new Date().toISOString().slice(0, 10);
  const reportPath = join(PATHS.reportsDir, `${runDate}_costing-update-report.md`);
  const lines: string[] = [];
  lines.push(`# Costing update — ${runDate}`);
  lines.push("");
  lines.push(`- Workbooks processados: ${p.workbooks.size} (${[...p.workbooks.keys()].join(", ")})`);
  lines.push(`- Blocos/fichas: ${p.blocks.length} · linhas: ${rowsTotal}`);
  lines.push(
    `- Mutações aplicadas: ${p.cellMutations.length} células + ${p.partMutations.length} estruturais/correções`,
  );
  lines.push(`- Estados: ${[...statusCounts.entries()].map(([k, v]) => `${k}=${v}`).join(", ")}`);
  lines.push("");
  if (p.partMutations.length > 0) {
    lines.push(`## Correções estruturais e de receita`);
    for (const m of p.partMutations) lines.push(`- [${m.workbook}] ${m.part}: ${m.detail}`);
    lines.push("");
  }
  if (unresolved.length > 0) {
    lines.push(`## Por resolver`);
    for (const u of unresolved) lines.push(`- ${u}`);
    lines.push("");
  }
  if (warnings.length > 0) {
    lines.push(`## Avisos`);
    for (const w of warnings) lines.push(`- ${w}`);
    lines.push("");
  }
  lines.push(`## Custo Mercadoria s/Iva por bloco`);
  lines.push("");
  lines.push(`| Nó | Papel | Custo | Venda s/IVA | Food cost |`);
  lines.push(`| --- | --- | ---: | ---: | ---: |`);
  for (const block of p.blocks) {
    const comp = p.comps.get(block.nodeId);
    if (!comp) continue;
    const fc = comp.foodCostRatio !== null ? `${(comp.foodCostRatio * 100).toFixed(1)}%` : "—";
    lines.push(
      `| ${block.nodeId} | ${p.roles.get(block.nodeId)} | ${comp.total.toFixed(4)} € | ${
        comp.vendaS !== null ? comp.vendaS.toFixed(4) + " €" : "—"
      } | ${fc} |`,
    );
  }
  lines.push("");
  writeFileSync(reportPath, lines.join("\n"), "utf-8");
  console.log(`✓ Relatório: ${reportPath}`);

  // Regenerar relatório executivo HTML + PDF com os valores atualizados.
  try {
    const {
      generatePostSyncReports,
      relativeToProject,
      reportsDirRelative,
    } = await import("./lib/post-sync-reports");
    console.log(`\n  A gerar relatório executivo (HTML + PDF)…`);
    const reports = generatePostSyncReports();
    for (const p of reports.htmlPaths) {
      console.log(`  ✓ HTML: ${relativeToProject(p)}`);
    }
    for (const p of reports.pdfPaths) {
      console.log(`  ✓ PDF:  ${relativeToProject(p)}`);
    }
    if (reports.pdfErrors.length > 0) {
      console.log(`\n  Aviso — PDF incompleto (${reports.pdfErrors.length}):`);
      for (const e of reports.pdfErrors.slice(0, 4)) console.log(`    ${e}`);
      console.log(
        `  Os HTML estão em ${reportsDirRelative()} — abra no browser e Ctrl+P se precisar do PDF.`,
      );
    }
  } catch (err: unknown) {
    // A sync das fichas já ficou gravada; o relatório é um passo extra.
    console.error(
      `\n⚠ Fichas atualizadas, mas o relatório executivo falhou:\n  ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}

const isDirectRun =
  process.argv[1]?.replace(/\\/g, "/").endsWith("update-costing.ts") ?? false;
if (isDirectRun) {
  main().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
