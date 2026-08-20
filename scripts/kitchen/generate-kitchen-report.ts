import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  computeAllergenProfiles,
  buildUsedInMap,
  glutenStatus,
  loadAllergenMap,
  ALLERGENS_JSON_PATH,
} from "./lib/allergens";
import {
  loadMenu,
  loadMenuAliases,
  MENU_ALIASES_PATH,
  MENU_JSON_PATH,
  PATHS,
} from "./lib/config";
import { analyseMenu, type MenuAnalysis } from "./lib/menu-analysis";
import { fromRoot, KITCHEN_CONFIG } from "./lib/project-root";
import type {
  LayoutName,
  NodeRowView,
  NodeView,
  ReportModel,
} from "./lib/report-html";
import { renderReport, setFichaScales, type FichaFit } from "./lib/report-sections";
import { loadAllWorkbookBytes, runPipeline, subrecipeLinks } from "./update-costing";

const REPORT_BASENAME = "ribbai-kitchen-menu-costing-technical-sheets";

/**
 * V1 (portrait) e V2 (landscape) são duas renderizações do MESMO modelo de
 * dados — ficheiros distintos, nunca se sobrepõem.
 */
const LAYOUT_SUFFIX: Record<LayoutName, string> = {
  portrait: "",
  landscape: "-v2-landscape",
  readable: "-v3-landscape-readable",
  "readable-tight": "-v3-1-landscape-readable",
};

export function reportPathFor(layout: LayoutName): string {
  return join(PATHS.reportsDir, `${REPORT_BASENAME}${LAYOUT_SUFFIX[layout]}.html`);
}

/** Escalas individuais das fichas (artefacto de layout, gerado por :fit). */
export const FICHA_SCALES_PATH = join(
  fromRoot(KITCHEN_CONFIG.paths.mappingsDir),
  "ficha-layout-scales.json",
);

function loadFichaScales(): Record<string, FichaFit> {
  try {
    const raw = JSON.parse(readFileSync(FICHA_SCALES_PATH, "utf-8")) as {
      scales?: Record<string, FichaFit>;
    };
    return raw.scales ?? {};
  } catch {
    return {};
  }
}

function sha8Path(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex").slice(0, 8);
}

/** Rótulo de base a partir do título da ficha ("… - 1KG (X…)", "(15 DOSES)"). */
function baseLabel(title: string | null, role: string): string {
  if (title) {
    if (/\b1\s*KG\b/i.test(title)) return "1 kg";
    if (/\b1\s*L\b/i.test(title)) return "1 L";
    const doses = /\((\d+)\s*DOSES?\)/i.exec(title);
    if (doses) return `${doses[1]} doses`;
    if (/\(dose\)/i.test(title)) return "dose";
  }
  if (role === "batch") return "lote";
  if (role === "side") return "dose";
  return "dose";
}

export function buildModel(): { model: ReportModel; analysis: MenuAnalysis } {
  const bytes = loadAllWorkbookBytes();
  const p = runPipeline(bytes);

  const allergenMap = loadAllergenMap();
  const profiles = computeAllergenProfiles(p.blocks, p.matches, p.order, allergenMap);
  const usedIn = buildUsedInMap(p.blocks, p.matches);
  const { salesVatRate, items: menuItems } = loadMenu();
  const menuAliases = loadMenuAliases();

  const analysis = analyseMenu({
    blocks: p.blocks,
    roles: p.roles,
    comps: p.comps,
    matches: p.matches,
    allergenProfiles: profiles,
    usedIn,
    menu: menuItems,
    menuAliases,
    salesVatRate,
  });

  // nodeId -> item de menu (para rotular as fichas)
  const menuByNode = new Map<string, { name: string; category: string }>();
  for (const item of analysis.items) {
    for (const n of item.nodes) {
      menuByNode.set(n, { name: item.name, category: item.category });
    }
  }

  const nodeById = new Map(p.blocks.map((b) => [b.nodeId, b]));
  const nodes: NodeView[] = p.blocks.map((block) => {
    const comp = p.comps.get(block.nodeId);
    const profile = profiles.get(block.nodeId);
    const rowMatches = p.matches.get(block.nodeId) ?? [];
    if (!comp || !profile) throw new Error(`Dados em falta para "${block.nodeId}"`);
    const role = p.roles.get(block.nodeId) ?? "menu";

    const costingPending: string[] = [];
    const rows: NodeRowView[] = comp.rows.map((rc, i) => {
      const match = rowMatches[i];
      const row = rc.row;
      let kind: NodeRowView["kind"];
      let unit: string | null = null;
      let statusLabel = "";
      let targetLabel: string | undefined;
      if (match.status === "NO_COST") {
        kind = "nocost";
        statusLabel = "sem custo (template)";
      } else if (match.status === "SUBRECIPE") {
        kind = "sub";
        const target = nodeById.get(match.targetNode as string);
        targetLabel = target ? `${target.workbook}/${target.sheetName}` : match.targetNode;
        unit = target ? baseLabel(target.title, p.roles.get(target.nodeId) ?? "menu") : null;
      } else if (rc.writes) {
        kind = "raw";
        unit = match.article?.unit ?? null;
      } else {
        kind = "pending";
        statusLabel =
          match.status === "UNMATCHED"
            ? "sem correspondência no Preçário"
            : match.status === "AMBIGUOUS"
              ? `ambíguo: ${match.candidates?.join(" / ")}`
              : "aguarda decisão (alias pendente)";
        costingPending.push(`«${row.name}» ${statusLabel}`);
      }
      if (match.flags.includes("MISSING_QTY")) {
        costingPending.push(`«${row.name}» sem quantidade`);
      }
      return {
        name: row.name,
        qty: row.qty,
        unit,
        price: rc.writes ? rc.d : null,
        iva: rc.e,
        cost: kind === "nocost" ? null : rc.writes ? rc.g : null,
        kind,
        statusLabel,
        targetNode: match.targetNode,
        targetLabel,
        flags: match.flags,
      };
    });
    if (block.rows.length === 0) costingPending.push("ficha sem ingredientes");

    const menuInfo = menuByNode.get(block.nodeId);
    const vendaS = comp.vendaS;
    // indicadores da ficha usam sempre o custo da unidade vendável
    const unitCost = comp.portionCost;
    const grossMarginEur =
      vendaS !== null && unitCost > 0 ? vendaS - unitCost : null;

    return {
      nodeId: block.nodeId,
      workbook: block.workbook,
      sheetName: block.sheetName,
      role,
      title: block.title ?? "",
      baseLabel: baseLabel(block.title, role),
      total: comp.total,
      yieldQuantity: comp.yieldQuantity,
      yieldUnit: comp.yieldUnit,
      portionCost: comp.portionCost,
      vendaC: comp.vendaC,
      vendaS,
      foodCostPct: unitCost > 0 ? comp.foodCostRatio : null,
      grossMarginEur,
      grossMarginPct:
        grossMarginEur !== null && vendaS !== null && vendaS > 0
          ? grossMarginEur / vendaS
          : null,
      markup: vendaS !== null && unitCost > 0 ? vendaS / unitCost : null,
      menuItem: menuInfo?.name ?? null,
      category: menuInfo?.category ?? null,
      rows,
      allergens: profile.allergens,
      allergenPending: profile.pending,
      allergenComplete: profile.complete,
      glutenSources: profile.perIngredient
        .filter((x) => x.allergens.includes("GL"))
        .map((x) => x.name),
      gf: glutenStatus(profile),
      usedIn: (usedIn.get(block.nodeId) ?? []).map((n) => {
        const target = nodeById.get(n);
        return target ? `${target.workbook}/${target.sheetName}` : n;
      }),
      usesSubrecipes: rows.filter((r) => r.kind === "sub").map((r) => r.targetLabel ?? ""),
      costingComplete: costingPending.length === 0,
      costingPending: [...new Set(costingPending)],
    };
  });

  // contagens e qualidade
  const uniqueIngredients = new Set<string>();
  let unmatched = 0;
  let ambiguous = 0;
  let unitWarnings = 0;
  let missingQty = 0;
  let linked = 0;
  let eligible = 0;
  let rowsTotal = 0;
  for (const block of p.blocks) {
    const rowMatches = p.matches.get(block.nodeId) ?? [];
    rowMatches.forEach((m, i) => {
      rowsTotal += 1;
      const name = m.article?.name ?? block.rows[i].name;
      if (m.status !== "SUBRECIPE" && m.status !== "NO_COST") {
        uniqueIngredients.add(name.toLowerCase());
        eligible += 1;
        if (["EXACT", "ALIAS", "NORMALIZED"].includes(m.status)) linked += 1;
      }
      if (m.status === "UNMATCHED") unmatched += 1;
      if (m.status === "AMBIGUOUS") ambiguous += 1;
      if (m.flags.includes("UNIT_WARNING")) unitWarnings += 1;
      if (m.flags.includes("MISSING_QTY")) missingQty += 1;
    });
  }

  const now = new Date();
  const generatedDate = now.toISOString().slice(0, 10);
  const generatedDateTime = new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(now);

  const sheetsHash = createHash("sha256");
  for (const [, b] of [...bytes.entries()].sort((a, b2) => a[0].localeCompare(b2[0]))) {
    sheetsHash.update(b);
  }

  // ordenar fichas de menu pela ordem das categorias do menu
  const categoryOrder = [...new Set(analysis.items.map((i) => i.category))];
  const menuNodes = nodes
    .filter((n) => n.role === "menu" || n.role === "side")
    .sort((a, b) => {
      const ca = categoryOrder.indexOf(a.category ?? "");
      const cb = categoryOrder.indexOf(b.category ?? "");
      return (
        (ca === -1 ? 999 : ca) - (cb === -1 ? 999 : cb) ||
        (a.menuItem ?? a.sheetName).localeCompare(b.menuItem ?? b.sheetName, "pt")
      );
    });

  const model: ReportModel = {
    generatedDate,
    generatedDateTime,
    versions: {
      priceList: sha8Path(PATHS.pricebookXlsx),
      menu: `v1 ${sha8Path(MENU_JSON_PATH)}`,
      technicalSheets: sheetsHash.digest("hex").slice(0, 8),
      allergens: `v1 ${sha8Path(ALLERGENS_JSON_PATH)}`,
      aliases: `v2 ${sha8Path(PATHS.aliasesJson)}/${sha8Path(MENU_ALIASES_PATH)}`,
    },
    pricebook: p.pricebook.articles,
    analysis,
    nodes,
    menuNodes,
    garnishNodes: nodes.filter((n) => n.role === "garnish"),
    internalNodes: nodes.filter((n) => n.role === "batch"),
    counts: {
      workbooks: p.workbooks.size,
      blocks: p.blocks.length,
      ingredientRows: rowsTotal,
      uniqueIngredients: uniqueIngredients.size,
      subrecipeLinks: subrecipeLinks(p).length,
    },
    quality: {
      priceLinkingPct: eligible > 0 ? (linked / eligible) * 100 : 0,
      unmatchedIngredients: unmatched,
      ambiguousIngredients: ambiguous,
      unitWarnings,
      missingQty,
    },
  };

  return { model, analysis };
}

// ------------------------------------------------------------- validations

export function validateModel(model: ReportModel): string[] {
  const problems: string[] = [];
  const nodeById = new Map(model.nodes.map((n) => [n.nodeId, n]));

  // coerência financeira item a item
  for (const item of model.analysis.items) {
    if (item.priceSIva === null || item.priceCIva === null) continue;
    const expectedS = item.priceCIva / (1 + item.vatRate);
    if (Math.abs(item.priceSIva - expectedS) > 0.005) {
      problems.push(`"${item.name}": venda s/IVA ${item.priceSIva} != c/IVA ÷ (1+IVA)`);
    }
    if (item.cost !== null && item.foodCostPct !== null) {
      const expectedFc = item.cost / item.priceSIva;
      if (Math.abs(item.foodCostPct - expectedFc) > 1e-9) {
        problems.push(`"${item.name}": food cost inconsistente`);
      }
      const expectedGm = item.priceSIva - item.cost;
      if (Math.abs((item.grossMarginEur as number) - expectedGm) > 1e-9) {
        problems.push(`"${item.name}": margem bruta inconsistente`);
      }
      const expectedMarkup = item.priceSIva / item.cost;
      if (Math.abs((item.markup as number) - expectedMarkup) > 1e-9) {
        problems.push(`"${item.name}": markup inconsistente`);
      }
      if (
        item.foodCostPct !== null &&
        item.grossMarginPct !== null &&
        Math.abs(item.foodCostPct + item.grossMarginPct - 1) > 1e-9
      ) {
        problems.push(`"${item.name}": food cost + margem bruta % != 100%`);
      }
    }
    // custo do item == custo unitário do(s) bloco(s), não o custo do lote
    const nodeCosts = item.nodes
      .map((n) => nodeById.get(n)?.portionCost)
      .filter((x): x is number => typeof x === "number");
    if (nodeCosts.length > 0 && item.cost !== null) {
      const avgCost = nodeCosts.reduce((a, b) => a + b, 0) / nodeCosts.length;
      if (Math.abs(avgCost - item.cost) > 1e-9) {
        problems.push(`"${item.name}": custo agregado != custo das fichas`);
      }
    }
  }

  // alergénios: propagação e coerência GF
  for (const n of model.nodes) {
    if (new Set(n.allergens).size !== n.allergens.length) {
      problems.push(`"${n.nodeId}": alergénios duplicados`);
    }
    for (const row of n.rows) {
      if (row.kind !== "sub" || !row.targetNode) continue;
      const target = nodeById.get(row.targetNode);
      if (!target) continue;
      for (const code of target.allergens) {
        if (!n.allergens.includes(code)) {
          problems.push(`"${n.nodeId}": não herdou ${code} de "${row.targetNode}"`);
        }
      }
    }
    if (n.gf === "GF_CANDIDATE" && (n.allergens.includes("GL") || !n.allergenComplete)) {
      problems.push(`"${n.nodeId}": GF✱ com GL ou perfil incompleto`);
    }
  }
  for (const item of model.analysis.items) {
    if (item.gf === "GF_CANDIDATE" && item.allergens.includes("GL")) {
      problems.push(`Item "${item.name}": classificado GF✱ mas contém GL`);
    }
  }

  // todos os itens do menu presentes
  const menuNames = new Set(model.analysis.items.map((i) => i.name + "|" + i.category));
  if (menuNames.size !== model.analysis.items.length) {
    problems.push("Itens de menu duplicados na análise");
  }

  return problems;
}

export function validateHtml(html: string, layout: LayoutName = "portrait"): string[] {
  const problems: string[] = [];
  if (layout !== "portrait") {
    if (!/@page\{size:A4 landscape/.test(html)) {
      problems.push("falta @page size:A4 landscape");
    }
    const min = layout === "landscape" ? 12 : 13;
    const bodies = [...html.matchAll(/@media print\{[\s\S]*?body\{font-size:([\d.]+)px/g)];
    const printBody = bodies.length > 0 ? Number(bodies[bodies.length - 1][1]) : 0;
    if (printBody < min) {
      problems.push(`corpo de texto em print demasiado pequeno (${printBody}px, mínimo ${min}px)`);
    }
    const marks: Partial<Record<LayoutName, string>> = {
      landscape: "Versão 2 · Formato Horizontal",
      readable: "Versão 3 · Formato Horizontal · Leitura Ampliada",
      "readable-tight": "Versão 3.1 · Fichas Indivisíveis",
    };
    const mark = marks[layout];
    if (mark && !html.includes(mark)) {
      problems.push(`falta a identificação da edição na capa ("${mark}")`);
    }
  }
  for (const token of ["NaN", ">undefined<", ">null<", "Infinity", "[object Object]"]) {
    if (html.includes(token)) problems.push(`HTML contém "${token}"`);
  }
  for (const m of html.matchAll(/href="#([^"]+)"/g)) {
    if (!html.includes(`id="${m[1]}"`)) problems.push(`Âncora quebrada: #${m[1]}`);
  }
  const svgCount = (html.match(/<svg class="chart"/g) ?? []).length;
  if (svgCount < 7) problems.push(`Só ${svgCount} gráficos gerados (esperados ≥ 7)`);
  if (!html.includes("@media print")) problems.push("CSS de impressão em falta");
  // Terminologia proibida como MÉTRICA: procurar apenas em rótulos (cabeçalhos de
  // tabela, labels de KPI, títulos). Em texto corrido os termos são legítimos —
  // é lá que se explica precisamente que estas métricas NÃO são isso.
  const bannedTerms = /lucro|rentabilidade líquida|resultado líquido|EBITDA|resultado operacional/i;
  const labelPatterns = [
    /<th[^>]*>([\s\S]*?)<\/th>/g,
    /<div class="l">([\s\S]*?)<\/div>/g,
    /<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/g,
    /<div class="label">([\s\S]*?)<\/div>/g,
  ];
  for (const pattern of labelPatterns) {
    for (const m of html.matchAll(pattern)) {
      const label = m[1].replace(/<[^>]+>/g, " ").trim();
      if (bannedTerms.test(label)) {
        problems.push(`Terminologia proibida usada como rótulo/métrica: "${label}"`);
      }
    }
  }
  return problems;
}

// -------------------------------------------------------------------- main

function line(label: string, value: string): string {
  return `${label} ${".".repeat(Math.max(2, 38 - label.length))} ${value}`;
}

const pct = (n: number | null): string => (n === null ? "—" : `${(n * 100).toFixed(1)}%`);
const eur = (n: number | null): string => (n === null ? "—" : `€${n.toFixed(2)}`);

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const layoutArg = args.find((a) => a.startsWith("--layout="))?.split("=")[1];
  const valid = ["portrait", "landscape", "readable", "readable-tight"];
  if (layoutArg !== undefined && !valid.includes(layoutArg)) {
    console.error(`Layout desconhecido: "${layoutArg}". Usar ${valid.join(", ")}.`);
    process.exit(2);
  }
  const layout = (layoutArg ?? "portrait") as LayoutName;
  const reportPath = reportPathFor(layout);

  setFichaScales(layout === "readable-tight" ? loadFichaScales() : {});
  const { model } = buildModel();
  const modelProblems = validateModel(model);
  const html = renderReport(model, layout);
  const htmlProblems = validateHtml(html, layout);
  const problems = [...modelProblems, ...htmlProblems];

  if (problems.length > 0) {
    console.error("✗ Validação do relatório falhou — ficheiro NÃO escrito:");
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }

  writeFileSync(reportPath, html, "utf-8");

  const a = model.analysis;
  const k = a.kpis;
  const q = model.quality;
  const withSheet = a.items.filter((i) => i.nodes.length > 0).length;
  const chartCount = (html.match(/<svg class="chart"/g) ?? []).length;
  const tableCount = (html.match(/<table/g) ?? []).length;
  const gfPending = a.items.filter((i) => i.gf === "INDETERMINATE").length;
  const gfCandidates = a.items.filter((i) => i.gf === "GF_CANDIDATE").length;

  console.log(`
========================================================
RIBBAÍ — KITCHEN COSTING & MENU FINANCIAL HEALTH CHECK
${layout === "landscape" ? "V2 — A4 LANDSCAPE" : "V1 — A4 PORTRAIT"}
========================================================

${line("New files processed", String(model.counts.workbooks))}

${line("Menu items", String(k.totalItems))}
${line("Technical sheets (blocks)", String(model.counts.blocks))}
${line("Subrecipes / internal preps", String(model.garnishNodes.length + model.internalNodes.length))}
${line("Price-list articles", String(model.pricebook.length))}

${line("Menu → Recipe matches", `${withSheet}/${k.totalItems}`)}
${line("Full costing coverage", `${k.costingCoveragePct.toFixed(0)}%`)}
${line("Selling price coverage", `${k.priceCoveragePct.toFixed(0)}%`)}
${line("Food Cost calculated", `${k.costedItems}/${k.totalItems}`)}
${line("Gross Margins calculated", `${k.costedItems}/${k.totalItems}`)}
${line("Markup calculated", `${k.costedItems}/${k.totalItems}`)}

${line("Average Food Cost", pct(k.avgFoodCostPct))}
${line("Median Food Cost", pct(k.medianFoodCostPct))}

${line("Average Gross Margin €", eur(k.avgGrossMarginEur))}
${line("Average Gross Margin %", pct(k.avgGrossMarginPct))}
${line("Median Gross Margin %", pct(k.medianGrossMarginPct))}

${line("Average Markup", k.avgMarkup === null ? "—" : `${k.avgMarkup.toFixed(2)}x`)}
${line("Menu Financial Health (analytical)", `${a.health.score}/100`)}

${line("Missing technical sheets", String(k.totalItems - withSheet))}
${line("Missing prices", String(k.totalItems - a.items.filter((i) => i.priceCIva !== null).length))}
${line("Ambiguous mappings", String(q.ambiguousIngredients))}
${line("Ingredient price gaps", String(q.unmatchedIngredients))}
${line("Unit warnings", String(q.unitWarnings))}
${line("Alerts (critical/warning/info)", `${a.alerts.filter((x) => x.severity === "critical").length}/${a.alerts.filter((x) => x.severity === "warning").length}/${a.alerts.filter((x) => x.severity === "info").length}`)}

${line("Allergen coverage", `${k.allergenCoveragePct.toFixed(0)}%`)}
${line("GF classification coverage", `${k.gfCoveragePct.toFixed(0)}%`)}
${line("GF candidates / validation required", `${gfCandidates} / ${gfPending}`)}

${line("Charts generated", String(chartCount))}
${line("Tables generated", String(tableCount))}

${line("Formula validation", "PASS")}
${line("Financial reconciliation", "PASS")}
${line("HTML regeneration", "PASS")}
${line("PDF readiness", "PASS (CSS @media print)")}

========================================================

✓ Relatório (${layout}): ${reportPath}`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
