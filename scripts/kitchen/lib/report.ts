import type { MatchStatus } from "./matching";

export type StatusCounts = Record<MatchStatus, number>;

export interface AuditRow {
  ficha: string;
  ingrediente: string;
  quantidade: number | null;
  tipo: "Matéria-prima" | "Guarnição" | "Sem custo" | "Por resolver";
  fonte: string;
  match: string;
  precoSIva: number | null;
  iva: number | null;
  status: string;
  flags: string[];
  candidatos?: string[];
}

export interface HealthChecks {
  architecture: boolean;
  schedules: boolean;
  priceList: boolean;
  garnishWorkbook: boolean;
  backups: boolean;
  documentation: boolean;
  workflow: boolean;
}

export interface RunStats {
  statusCounts: StatusCounts;
  unitWarnings: number;
  missingQty: number;
  formulaErrors: number;
  brokenReferences: number;
  checks: HealthChecks;
}

function line(label: string, value: string): string {
  const dots = ".".repeat(Math.max(2, 34 - label.length));
  return `${label} ${dots} ${value}`;
}

export function buildHealthCheck(s: RunStats): string {
  const c = s.statusCounts;
  const linked = c.EXACT + c.ALIAS + c.NORMALIZED;
  const eligible = linked + c.PENDING + c.AMBIGUOUS + c.UNMATCHED;
  const ok = (b: boolean) => (b ? "OK" : "FALTA");
  const lines = [
    "================================================",
    "RIBBAÍ — KITCHEN COSTING HEALTH CHECK",
    "================================================",
    "",
    line("Kitchen architecture", ok(s.checks.architecture)),
    line("August schedules archived", ok(s.checks.schedules)),
    line("Price list source", ok(s.checks.priceList)),
    line("Garnish workbook", ok(s.checks.garnishWorkbook)),
    line("Ingredient linking", `${linked}/${eligible}`),
    line("Subrecipe linking", `${c.SUBRECIPE}/${c.SUBRECIPE}`),
    line("Ambiguous ingredients", String(c.AMBIGUOUS)),
    line("Unmatched ingredients", String(c.UNMATCHED)),
  ];
  if (c.PENDING > 0) lines.push(line("Pending alias decisions", String(c.PENDING)));
  lines.push(
    line("Unit warnings", String(s.unitWarnings)),
    line("Formula errors", String(s.formulaErrors)),
    line("Broken references", String(s.brokenReferences)),
    line("Original backups", ok(s.checks.backups)),
    line("Documentation", ok(s.checks.documentation)),
    line("Reusable update workflow", ok(s.checks.workflow)),
    "================================================",
  );
  return lines.join("\n");
}

function money(n: number | null): string {
  return n === null ? "—" : `€${n.toFixed(4)}`;
}

function ivaPct(n: number | null): string {
  return n === null ? "N/A" : `${Math.round(n * 100)}%`;
}

export interface ReportMeta {
  runDate: string;
  applied: boolean;
  pricebookPath: string;
  garnishesPath: string;
  pricebookHash: string;
  garnishesHashBefore: string;
  garnishesHashAfter: string | null;
  cellMutations: number;
  partMutations: number;
  topoOrder: string[];
  subrecipeEdges: string[];
  sheetTotals: { sheet: string; total: number }[];
  validationProblems: string[];
  warnings: string[];
}

export function buildMarkdownReport(
  meta: ReportMeta,
  stats: RunStats,
  auditRows: AuditRow[],
): string {
  const c = stats.statusCounts;
  const linked = c.EXACT + c.ALIAS + c.NORMALIZED;
  const out: string[] = [];
  out.push(`# Relatório de linking de preços — Fichas Técnicas Guarnições`);
  out.push("");
  out.push(`- **Data**: ${meta.runDate}`);
  out.push(`- **Modo**: ${meta.applied ? "apply (workbook atualizado)" : "dry-run (nada alterado)"}`);
  out.push(`- **Preçário (fonte de verdade)**: \`${meta.pricebookPath}\` — SHA256 \`${meta.pricebookHash.slice(0, 16)}…\``);
  out.push(`- **Workbook de Guarnições**: \`${meta.garnishesPath}\``);
  out.push(`  - SHA256 antes: \`${meta.garnishesHashBefore.slice(0, 16)}…\`${meta.garnishesHashAfter ? ` · depois: \`${meta.garnishesHashAfter.slice(0, 16)}…\`` : ""}`);
  out.push("");
  out.push(`## Sumário`);
  out.push("");
  out.push(`| Métrica | Valor |`);
  out.push(`| --- | ---: |`);
  out.push(`| Total de linhas de ingredientes analisadas | ${auditRows.length} |`);
  out.push(`| Exact matches | ${c.EXACT} |`);
  out.push(`| Normalized matches | ${c.NORMALIZED} |`);
  out.push(`| Alias matches | ${c.ALIAS} |`);
  out.push(`| Subrecipe matches (Guarnições) | ${c.SUBRECIPE} |`);
  out.push(`| Matérias-primas ligadas ao Preçário | ${linked} |`);
  out.push(`| Sem custo por template ("-") | ${c.NO_COST} |`);
  out.push(`| Unmatched | ${c.UNMATCHED} |`);
  out.push(`| Ambiguous | ${c.AMBIGUOUS} |`);
  out.push(`| Pendentes de decisão (aliases) | ${c.PENDING} |`);
  out.push(`| Unit warnings | ${stats.unitWarnings} |`);
  out.push(`| Linhas sem quantidade | ${stats.missingQty} |`);
  out.push(`| Erros de fórmula (#REF! etc.) | ${stats.formulaErrors} |`);
  out.push(`| Referências quebradas | ${stats.brokenReferences} |`);
  out.push(`| Mutações de células | ${meta.cellMutations} |`);
  out.push(`| Mutações estruturais do workbook | ${meta.partMutations} |`);
  out.push("");
  out.push(`## Custo Mercadoria s/Iva por Guarnição`);
  out.push("");
  out.push(`| Guarnição | Custo Mercadoria s/Iva |`);
  out.push(`| --- | ---: |`);
  for (const t of meta.sheetTotals) {
    out.push(`| ${t.sheet} | ${money(t.total)} |`);
  }
  out.push("");
  out.push(`## Subreceitas`);
  out.push("");
  if (meta.subrecipeEdges.length === 0) {
    out.push(`(nenhuma dependência entre fichas)`);
  } else {
    for (const e of meta.subrecipeEdges) out.push(`- ${e}`);
  }
  out.push("");
  out.push(`Ordem topológica de cálculo: ${meta.topoOrder.join(" → ")}`);
  out.push("");
  out.push(`## Por resolver (decisão humana necessária)`);
  out.push("");
  const unresolved = auditRows.filter((r) =>
    ["UNMATCHED", "AMBIGUOUS", "PENDING"].includes(r.status),
  );
  if (unresolved.length === 0) {
    out.push(`Nada pendente.`);
  } else {
    out.push(`| Ficha | Ingrediente | Quantidade | Estado | Possíveis matches |`);
    out.push(`| --- | --- | ---: | --- | --- |`);
    for (const r of unresolved) {
      out.push(
        `| ${r.ficha} | ${r.ingrediente} | ${r.quantidade ?? "—"} | ${r.status} | ${r.candidatos?.join(", ") ?? "(nenhum no Preçário)"} |`,
      );
    }
  }
  out.push("");
  if (meta.warnings.length > 0) {
    out.push(`## Avisos`);
    out.push("");
    for (const w of meta.warnings) out.push(`- ${w}`);
    out.push("");
  }
  out.push(`## Validação`);
  out.push("");
  if (meta.validationProblems.length === 0) {
    out.push(`Sem problemas: fórmulas sem erros, F = D+(D×E), G = C×D, totais = ΣG, subreceitas = Custo Mercadoria da origem, segunda execução sem mutações.`);
  } else {
    for (const p of meta.validationProblems) out.push(`- ⚠ ${p}`);
  }
  out.push("");
  out.push(`## Tabela de auditoria`);
  out.push("");
  out.push(`| Ficha | Ingrediente | Tipo | Fonte | Match | Preço s/IVA | IVA | Status |`);
  out.push(`| --- | --- | --- | --- | --- | ---: | ---: | --- |`);
  for (const r of auditRows) {
    const flags = r.flags.length > 0 ? ` (${r.flags.join(", ")})` : "";
    out.push(
      `| ${r.ficha} | ${r.ingrediente} | ${r.tipo} | ${r.fonte} | ${r.match} | ${money(r.precoSIva)} | ${ivaPct(r.iva)} | ${r.status}${flags} |`,
    );
  }
  out.push("");
  return out.join("\n");
}
