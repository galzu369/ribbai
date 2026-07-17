import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { monthDirFor, dateStamp } from "./cli";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..", "..", "..");

export interface MovementRow {
  sku: string;
  name: string;
  unit: string;
  previousStock: string;
  delta: string;
  finalStock: string;
  unitCost?: string;
  totalCost?: string;
  status?: "Saudavel" | "Critico";
  notes?: string;
}

export type OperationKind = "entry" | "exit" | "count";

export interface OperationMeta {
  kind: OperationKind;
  referenceId: string;
  referenceType: string;
  date: Date;
  createdBy: string;
  title: string;
  extraSummary?: Record<string, string>;
}

async function operationalRecordsDir(date: Date): Promise<string> {
  const { year, monthDir } = monthDirFor(date);
  const dir = path.join(
    rootDir,
    "docs",
    "operational-records",
    String(year),
    monthDir,
    "inventory-updates",
  );
  await mkdir(dir, { recursive: true });
  return dir;
}

function recordSuffix(kind: OperationKind): string {
  if (kind === "entry") return "inventory-entry-record.md";
  if (kind === "exit") return "inventory-exit-record.md";
  return "inventory-count-record.md";
}

export async function writeOperationDocs(
  meta: OperationMeta,
  rows: MovementRow[],
): Promise<{ recordPath: string; movementLogPath: string; changeSummaryPath: string }> {
  const dir = await operationalRecordsDir(meta.date);
  const stamp = dateStamp(meta.date);

  const recordPath = path.join(dir, `${stamp}-${recordSuffix(meta.kind)}`);
  const movementLogPath = path.join(dir, `${stamp}-inventory-movement-log.md`);
  const changeSummaryPath = path.join(dir, `${stamp}-inventory-change-summary.md`);

  await writeFile(recordPath, buildRecordDoc(meta, rows), "utf-8");
  await writeFile(movementLogPath, buildMovementLogDoc(meta, rows), "utf-8");
  await writeFile(changeSummaryPath, buildChangeSummaryDoc(meta, rows), "utf-8");

  return { recordPath, movementLogPath, changeSummaryPath };
}

function buildRecordDoc(meta: OperationMeta, rows: MovementRow[]): string {
  const stamp = dateStamp(meta.date);
  const extra = Object.entries(meta.extraSummary ?? {})
    .map(([label, value]) => `| ${label} | ${value} |`)
    .join("\n");

  const rowsTable = rows
    .map(
      (row) =>
        `| ${row.name} | ${row.sku} | ${row.delta} ${row.unit} | ${row.finalStock} ${row.unit} | ${row.notes ?? ""} |`,
    )
    .join("\n");

  return `# ${meta.title} - ${stamp}

## Resumo da Operacao

| Campo | Valor |
| --- | --- |
| Data | ${stamp} |
| Referencia | ${meta.referenceId} |
| Reference type | ${meta.referenceType} |
| Autor | ${meta.createdBy} |
| Artigos atualizados | ${rows.length} |
${extra}

## Artigos

| Artigo | SKU | Movimento | Stock final | Observacoes |
| --- | --- | --- | --- | --- |
${rowsTable}

## Workflow Executado

Esta operacao seguiu o workflow canonico RIBBAI (\`scripts/stock/apply-*\`):
- Escrita atomica de \`InventoryItem.currentStock\` e \`InventoryTransaction\` na mesma transacao Prisma.
- Guarda de coerencia pos-escrita confirmada (\`currentStock === balanceAfter\`).
- Documentacao gerada automaticamente a partir dos mesmos dados gravados na base de dados.
`;
}

function buildMovementLogDoc(meta: OperationMeta, rows: MovementRow[]): string {
  const stamp = dateStamp(meta.date);
  const rowsTable = rows
    .map(
      (row) =>
        `| ${meta.date.toISOString()} | ${row.sku} | ${row.name} | ${row.delta} ${row.unit} | ${row.finalStock} ${row.unit} | ${row.notes ?? ""} |`,
    )
    .join("\n");

  return `# Inventory Movement Log - ${stamp}

## Movimentos registados

Referencia da operacao: \`${meta.referenceId}\`.

| Data/Hora | SKU | Artigo | Quantidade | Balance after | Notas |
| --- | --- | --- | --- | --- | --- |
${rowsTable}

## Auditoria

Todos os movimentos foram registados com referencia ${meta.referenceId} para rastreabilidade completa.
`;
}

function buildChangeSummaryDoc(meta: OperationMeta, rows: MovementRow[]): string {
  const stamp = dateStamp(meta.date);
  const hasCost = rows.some((row) => row.unitCost !== undefined);

  const header = hasCost
    ? "| Artigo | SKU | Stock anterior | Movimento | Custo unitario | Custo total | Stock final | Estado |"
    : "| Artigo | SKU | Stock anterior | Movimento | Stock final | Estado |";
  const divider = hasCost
    ? "| --- | --- | --- | --- | --- | --- | --- | --- |"
    : "| --- | --- | --- | --- | --- | --- |";

  const rowsTable = rows
    .map((row) => {
      const status = row.status ?? "Saudavel";
      if (hasCost) {
        return `| ${row.name} | ${row.sku} | ${row.previousStock} ${row.unit} | ${row.delta} ${row.unit} | ${row.unitCost ?? "-"} | ${row.totalCost ?? "-"} | ${row.finalStock} ${row.unit} | ${status} |`;
      }
      return `| ${row.name} | ${row.sku} | ${row.previousStock} ${row.unit} | ${row.delta} ${row.unit} | ${row.finalStock} ${row.unit} | ${status} |`;
    })
    .join("\n");

  return `# Inventory Change Summary - ${stamp}

## Resumo

| Indicador | Valor |
| --- | --- |
| Referencia | ${meta.referenceId} |
| Artigos atualizados | ${rows.length} |

## Alteracoes registadas

${header}
${divider}
${rowsTable}
`;
}
