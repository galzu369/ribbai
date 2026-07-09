import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

import { PrismaClient } from "@prisma/client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const DEFAULT_DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5432/ribbai_ops?schema=public";
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
    },
  },
});

const DATE = "2026-06-24";
const REFERENCE_ID = "STOCK-IN-2026-06-24-CONSUMABLES-DELIVERY";
const REFERENCE_TYPE = "SUPPLIER_DELIVERY";
const CREATED_BY = "Bruno";

const monthDirectoryNames = [
  "01-january",
  "02-february",
  "03-march",
  "04-april",
  "05-may",
  "06-june",
  "07-july",
  "08-august",
  "09-september",
  "10-october",
  "11-november",
  "12-december",
];

function formatQuantity(value) {
  return Number(value).toLocaleString("pt-PT", {
    maximumFractionDigits: 3,
  });
}

function formatCurrency(value) {
  return Number(value).toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

function toMarkdownTable(headers, rows) {
  const headerLine = `| ${headers.join(" | ")} |`;
  const sepLine = `| ${headers.map(() => "---").join(" | ")} |`;
  const rowLines = rows.map((row) => `| ${row.join(" | ")} |`);
  return [headerLine, sepLine, ...rowLines].join("\n");
}

function runCommand(command, args, { cwd } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      shell: process.platform === "win32",
      stdio: "inherit",
      env: process.env,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Command failed (${code}): ${command} ${args.join(" ")}`));
    });
  });
}

function getStockStatus(item) {
  const currentStock = Number(item.currentStock);
  const criticalThreshold = Number(item.reorderPoint ?? item.minimumStock ?? 0);
  if (currentStock === 0 || currentStock <= criticalThreshold) {
    return "Critico";
  }
  return "Saudavel";
}

async function loadEntryTransactions() {
  return prisma.inventoryTransaction.findMany({
    where: {
      referenceType: REFERENCE_TYPE,
      referenceId: REFERENCE_ID,
      type: "IN",
    },
    include: {
      item: true,
      supplier: true,
    },
    orderBy: [{ transactionDate: "asc" }, { createdAt: "asc" }],
  });
}

async function generateInventoryEntryRecord(outputDir, transactions) {
  const totalQuantity = transactions.reduce((sum, tx) => sum + Number(tx.quantity), 0);
  const totalCost = transactions.reduce((sum, tx) => sum + Number(tx.totalCost ?? 0), 0);
  const supplierName =
    transactions.find((tx) => tx.supplier?.name)?.supplier?.name ?? "Fornecedor de Consumiveis a Definir";

  const rows = transactions.map((tx) => [
    tx.item.name,
    tx.item.sku,
    `+${formatQuantity(tx.quantity)} ${tx.unit}`,
    `${formatQuantity(tx.balanceAfter)} ${tx.item.unit}`,
    tx.notes ?? "-",
  ]);

  const content = [
    `# Inventory Entry Record - ${DATE}`,
    "",
    "## Resumo",
    "",
    toMarkdownTable(
      ["Campo", "Valor"],
      [
        ["Data", DATE],
        ["Tipo", "Entrada de stock"],
        ["Referencia", REFERENCE_ID],
        ["Reference type", REFERENCE_TYPE],
        ["Autor", CREATED_BY],
        ["Fornecedor", supplierName],
        ["Artigos atualizados", String(transactions.length)],
        ["Quantidade total recebida", formatQuantity(totalQuantity)],
        ["Valor total da entrada", formatCurrency(totalCost)],
      ]
    ),
    "",
    "## Entradas registadas",
    "",
    rows.length === 0
      ? "Nao foram encontradas transacoes IN para esta referencia."
      : toMarkdownTable(["Artigo", "SKU", "Entrada", "Stock final", "Observacoes"], rows),
    "",
  ].join("\n");

  const filePath = path.join(outputDir, `${DATE}-inventory-entry-record.md`);
  await writeFile(filePath, content, "utf8");
}

async function generateInventoryChangeSummary(outputDir, transactions) {
  const rows = transactions.map((tx) => {
    const previousStock = Number(tx.balanceAfter) - Number(tx.quantity);
    const status = getStockStatus(tx.item);
    return [
      tx.item.name,
      tx.item.sku,
      `${formatQuantity(previousStock)} ${tx.unit}`,
      `+${formatQuantity(tx.quantity)} ${tx.unit}`,
      formatCurrency(tx.unitCost ?? 0),
      formatCurrency(tx.totalCost ?? 0),
      `${formatQuantity(tx.balanceAfter)} ${tx.unit}`,
      status,
    ];
  });

  const totalQuantity = transactions.reduce((sum, tx) => sum + Number(tx.quantity), 0);
  const totalCost = transactions.reduce((sum, tx) => sum + Number(tx.totalCost ?? 0), 0);

  const content = [
    `# Inventory Change Summary - ${DATE}`,
    "",
    "## Resumo",
    "",
    toMarkdownTable(
      ["Indicador", "Valor"],
      [
        ["Tipo de movimento", "Entrada em stock"],
        ["Referencia", REFERENCE_ID],
        ["Artigos atualizados", String(transactions.length)],
        ["Entradas registadas", formatQuantity(totalQuantity)],
        ["Valor total entrada", formatCurrency(totalCost)],
      ]
    ),
    "",
    "## Entradas registadas",
    "",
    rows.length === 0
      ? "Nao foram encontradas transacoes IN para esta referencia."
      : toMarkdownTable(
          [
            "Artigo",
            "SKU",
            "Stock anterior",
            "Entrada",
            "Custo unitario",
            "Custo total",
            "Stock final apos entrada",
            "Estado",
          ],
          rows
        ),
    "",
    "## Notas",
    "",
    "Entrada de stock registada para reforco de consumiveis, produtos de limpeza e economato em 24-06-2026. Historico anterior mantido sem alteracoes.",
    "",
  ].join("\n");

  const filePath = path.join(outputDir, `${DATE}-inventory-change-summary.md`);
  await writeFile(filePath, content, "utf8");
}

async function generateMovementLog(outputDir, transactions) {
  const rows = transactions.map((tx) => [
    formatDateTime(tx.transactionDate),
    tx.item.sku,
    tx.item.name,
    tx.type,
    `+${formatQuantity(tx.quantity)} ${tx.unit}`,
    `${formatQuantity(tx.balanceAfter)} ${tx.unit}`,
    tx.reason ?? "-",
    tx.notes ?? "-",
  ]);

  const content = [
    `# Inventory Movement Log - ${DATE}`,
    "",
    "## Movimentos registados",
    "",
    rows.length === 0
      ? "Nao foram encontrados movimentos para esta referencia."
      : toMarkdownTable(
          ["Data/Hora", "SKU", "Artigo", "Tipo", "Quantidade", "Balance after", "Motivo", "Notas"],
          rows
        ),
    "",
  ].join("\n");

  const filePath = path.join(outputDir, `${DATE}-inventory-movement-log.md`);
  await writeFile(filePath, content, "utf8");
}

async function generateAlertSummary(outputDir) {
  const monitoredCategories = ["Consumiveis", "Produtos de Limpeza"];
  const items = await prisma.inventoryItem.findMany({
    where: {
      category: { in: monitoredCategories },
      status: "ACTIVE",
    },
    orderBy: [{ category: "asc" }, { subCategory: "asc" }, { name: "asc" }],
  });

  const critical = items.filter(
    (item) => Number(item.currentStock) === 0 || Number(item.currentStock) <= Number(item.reorderPoint)
  );

  const rows = critical.map((item) => [
    "Critico",
    item.name,
    item.sku,
    `${formatQuantity(item.currentStock)} ${item.unit}`,
    `${formatQuantity(item.reorderPoint)} ${item.unit}`,
    Number(item.currentStock) === 0
      ? "Reposicao imediata / validar urgencia."
      : "Priorizar reposicao ou validar consumo.",
  ]);

  const content = [
    `# Alert Summary - ${DATE} (Entrada de Stock)`,
    "",
    "## Alertas atuais",
    "",
    rows.length === 0
      ? "Sem alertas de stock baixo ou rutura registados com base no reorder point atual."
      : toMarkdownTable(["Estado", "Artigo", "SKU", "Stock atual", "Limiar critico", "Acao recomendada"], rows),
    "",
  ].join("\n");

  const filePath = path.join(outputDir, `${DATE}-alert-summary.md`);
  await writeFile(filePath, content, "utf8");
  return { items };
}

async function generateDashboardMetrics(outputDir, items) {
  const statuses = items.reduce(
    (acc, item) => {
      const status = getStockStatus(item);
      acc[status] = (acc[status] ?? 0) + 1;
      return acc;
    },
    { Saudavel: 0, Critico: 0 }
  );

  const content = [
    `# Dashboard Metrics Refresh - ${DATE} (Entrada de Stock)`,
    "",
    "## Stock Health",
    "",
    toMarkdownTable(
      ["Estado", "Artigos"],
      [
        ["Saudavel", String(statuses.Saudavel ?? 0)],
        ["Critico", String(statuses.Critico ?? 0)],
      ]
    ),
    "",
  ].join("\n");

  const filePath = path.join(outputDir, `${DATE}-dashboard-metrics-refresh.md`);
  await writeFile(filePath, content, "utf8");
}

async function generatePurchasingMetrics(outputDir, transactions) {
  const monthStart = new Date("2026-06-01T00:00:00.000Z");
  const monthEnd = new Date("2026-07-01T00:00:00.000Z");

  const monthlyIn = await prisma.inventoryTransaction.findMany({
    where: {
      type: "IN",
      referenceType: "SUPPLIER_DELIVERY",
      transactionDate: {
        gte: monthStart,
        lt: monthEnd,
      },
    },
    include: {
      item: {
        select: {
          sku: true,
          name: true,
        },
      },
    },
    orderBy: [{ transactionDate: "asc" }],
  });

  const monthlySpend = monthlyIn.reduce((sum, tx) => sum + Number(tx.totalCost ?? 0), 0);
  const thisEntrySpend = transactions.reduce((sum, tx) => sum + Number(tx.totalCost ?? 0), 0);
  const monthlyQty = monthlyIn.reduce((sum, tx) => sum + Number(tx.quantity), 0);
  const thisEntryQty = transactions.reduce((sum, tx) => sum + Number(tx.quantity), 0);

  const content = [
    `# Procurement Metrics - ${DATE}`,
    "",
    "## Entrada atual",
    "",
    toMarkdownTable(
      ["Indicador", "Valor"],
      [
        ["Referencia", REFERENCE_ID],
        ["Artigos", String(transactions.length)],
        ["Quantidade comprada", formatQuantity(thisEntryQty)],
        ["Custo total compra", formatCurrency(thisEntrySpend)],
      ]
    ),
    "",
    "## Acumulado de compras no mes (junho/2026)",
    "",
    toMarkdownTable(
      ["Indicador", "Valor"],
      [
        ["Movimentos IN", String(monthlyIn.length)],
        ["Quantidade comprada", formatQuantity(monthlyQty)],
        ["Custo total compras", formatCurrency(monthlySpend)],
      ]
    ),
    "",
  ].join("\n");

  const filePath = path.join(outputDir, `${DATE}-purchasing-metrics.md`);
  await writeFile(filePath, content, "utf8");
}

async function main() {
  const force = process.argv.includes("--force");
  const reportDate = new Date(`${DATE}T12:00:00.000Z`);
  const year = reportDate.getUTCFullYear();
  const month = reportDate.getUTCMonth() + 1;
  const outputDir = path.join(
    rootDir,
    "docs",
    "operational-records",
    String(year),
    monthDirectoryNames[month - 1],
    "inventory-updates"
  );
  await mkdir(outputDir, { recursive: true });

  try {
    await runCommand(
      "npx",
      ["tsx", "scripts/database/record-stock-in-2026-06-24.ts", ...(force ? ["--force"] : [])],
      { cwd: rootDir }
    );

    const transactions = await loadEntryTransactions();
    if (transactions.length === 0) {
      throw new Error(`No IN transactions found for ${REFERENCE_ID}.`);
    }

    await generateInventoryEntryRecord(outputDir, transactions);
    await generateInventoryChangeSummary(outputDir, transactions);
    await generateMovementLog(outputDir, transactions);
    const alert = await generateAlertSummary(outputDir);
    await generateDashboardMetrics(outputDir, alert.items);
    await generatePurchasingMetrics(outputDir, transactions);

    await runCommand(
      "npm",
      ["run", "reports:inventory:update", "--", `--date=${DATE}`, `--referenceId=${REFERENCE_ID}`],
      { cwd: rootDir }
    );

    await runCommand(
      "npm",
      ["run", "reports:consumables:monthly", "--", "--year=2026", "--month=6", "--preview"],
      { cwd: rootDir }
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

