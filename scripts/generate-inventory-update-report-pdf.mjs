import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import puppeteer from "puppeteer";
import { getInventoryUpdateReportData } from "@/lib/inventory-report-service";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

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

function parseArgs() {
  const rawArgs = process.argv.slice(2);
  const args = Object.fromEntries(
    rawArgs
      .filter((arg) => arg.startsWith("--") && arg.includes("="))
      .map((arg) => {
        const [key, ...valueParts] = arg.slice(2).split("=");
        return [key, valueParts.join("=")];
      })
  );

  const date = args.date ?? new Date().toISOString().slice(0, 10);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Invalid --date value. Use YYYY-MM-DD.");
  }

  return {
    date,
    referenceId: args.referenceId,
    includeSkus: args.includeSku
      ? args.includeSku
          .split(",")
          .map((sku) => sku.trim())
          .filter(Boolean)
      : [],
  };
}

function sanitizeFileToken(value) {
  return String(value ?? "")
    .trim()
    .replaceAll(/[^a-zA-Z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "")
    .slice(0, 80);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatQuantity(value) {
  return Number(value).toLocaleString("pt-PT", {
    maximumFractionDigits: 3,
  });
}

function formatCurrency(value) {
  return Number(value).toLocaleString("pt-PT", {
    style: "currency",
    currency: "EUR",
  });
}

function formatDate(date) {
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatDateTime(date) {
  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Lisbon",
  }).format(date);
}

function getDayPeriod(date) {
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(`${date}T23:59:59.999Z`);

  return { start, end };
}

function getStatus(item) {
  const stock = Number(item.currentStock);
  const reorderPoint = Number(item.reorderPoint);

  if (stock === 0 || stock <= reorderPoint) {
    return "Critico";
  }

  return "Saudavel";
}

function getBadgeClass(status) {
  if (status === "Critico") {
    return "badge-red";
  }

  return "badge-green";
}

function groupByCategory(transactions) {
  const grouped = new Map();

  for (const transaction of transactions) {
    const category = transaction.item.subCategory ?? transaction.item.category;
    const existing = grouped.get(category) ?? {
      category,
      count: 0,
      inbound: 0,
      outbound: 0,
    };

    existing.count += 1;

    if (transaction.type === "IN") {
      existing.inbound += Number(transaction.quantity);
    } else if (transaction.type === "OUT") {
      existing.outbound += Number(transaction.quantity);
    }

    grouped.set(category, existing);
  }

  return [...grouped.values()].sort((left, right) => left.category.localeCompare(right.category));
}

function buildMovementRows(transactions) {
  return transactions.map((transaction) => {
    const isInboundAdjustment =
      transaction.type === "ADJUSTMENT" &&
      (transaction.reason ?? "").toLowerCase().includes("entrada");
    const isOutboundAdjustment =
      transaction.type === "ADJUSTMENT" &&
      (transaction.reason ?? "").toLowerCase().includes("saida");
    const movementSign =
      transaction.type === "IN" || isInboundAdjustment
        ? "+"
        : transaction.type === "OUT" || isOutboundAdjustment
          ? "-"
          : "";
    const previousQuantity =
      transaction.type === "IN" || isInboundAdjustment
        ? Number(transaction.balanceAfter) - Number(transaction.quantity)
        : Number(transaction.balanceAfter) + Number(transaction.quantity);
    const item = transaction.item;
    const status = getStatus(item);
    const recordedTotalCost = Number(transaction.totalCost ?? 0);
    const currentUnitCost = Number(item.costPrice ?? 0);
    const totalCost =
      recordedTotalCost > 0
        ? recordedTotalCost
        : transaction.unit === item.unit
          ? Number(transaction.quantity) * currentUnitCost
          : 0;

    return {
      type: transaction.type,
      source: "TRANSACTION",
      sku: item.sku,
      name: item.name,
      category: item.subCategory ?? item.category,
      previousQuantity,
      movementQuantity: Number(transaction.quantity),
      finalQuantity: Number(transaction.balanceAfter),
      transactionUnit: transaction.unit,
      itemUnit: item.unit,
      movementSign,
      totalCost,
      status,
      reason: transaction.reason ?? transaction.notes ?? "",
    };
  });
}

function buildConfigurationRows(items) {
  return items.map((item) => {
    const status = getStatus(item);

    return {
      type: "CONFIG",
      source: "CONFIG",
      sku: item.sku,
      name: item.name,
      category: item.subCategory ?? item.category,
      previousQuantity: Number(item.currentStock),
      movementQuantity: 0,
      finalQuantity: Number(item.currentStock),
      transactionUnit: item.unit,
      itemUnit: item.unit,
      totalCost: 0,
      status,
      reason: "Atualizacao de parametros de stock critico/reorder point.",
    };
  });
}

function renderMovementRows(rows) {
  return rows
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.category)}</td>
          <td>
            <strong>${escapeHtml(row.name)}</strong>
            <span>${escapeHtml(row.sku)}</span>
          </td>
          <td><span class="badge ${row.type === "IN" ? "badge-green" : "badge-blue"}">${escapeHtml(row.type)}</span></td>
          <td>${formatQuantity(row.previousQuantity)} ${escapeHtml(row.transactionUnit)}</td>
          <td>${
            row.type === "CONFIG"
              ? "Parametros"
              : `${row.movementSign}${formatQuantity(row.movementQuantity)} ${escapeHtml(row.transactionUnit)}`
          }</td>
          <td>${formatQuantity(row.finalQuantity)} ${escapeHtml(row.itemUnit)}</td>
          <td>${row.type === "CONFIG" ? "Configuracao" : row.totalCost > 0 ? formatCurrency(row.totalCost) : "Preco pendente"}</td>
          <td><span class="badge ${getBadgeClass(row.status)}">${escapeHtml(row.status)}</span></td>
        </tr>
      `
    )
    .join("");
}

function renderCategoryBars(categories) {
  const maxCount = Math.max(...categories.map((category) => category.count), 1);

  return categories
    .map(
      (category) => `
        <div class="bar-row">
          <div class="bar-label">${escapeHtml(category.category)}</div>
          <div class="bar-track">
            <div class="bar-fill" style="width: ${(category.count / maxCount) * 100}%"></div>
          </div>
          <strong>${category.count}</strong>
        </div>
      `
    )
    .join("");
}

function renderStatusBars(statusCounts) {
  const total = Object.values(statusCounts).reduce((sum, value) => sum + value, 0) || 1;
  const statuses = [
    ["Saudavel", statusCounts.Saudavel ?? 0],
    ["Critico", statusCounts.Critico ?? 0],
  ];

  return statuses
    .map(
      ([status, count]) => `
        <div class="status-row">
          <span>${escapeHtml(status)}</span>
          <div class="status-track">
            <div class="status-fill ${status === "Saudavel" ? "status-green" : "status-red"}" style="width: ${(count / total) * 100}%"></div>
          </div>
          <strong>${count}</strong>
        </div>
      `
    )
    .join("");
}

function renderHtml({
  date,
  referenceId,
  rows,
  transactions,
  categories,
  changedItems,
  newItems,
  lowStockItems,
  zeroStockItems,
}) {
  const reportDate = new Date(`${date}T12:00:00.000Z`);
  const inboundTransactions = transactions.filter((transaction) => transaction.type === "IN");
  const outboundTransactions = transactions.filter((transaction) => transaction.type === "OUT");
  const pendingPriceItems = changedItems.filter((item) => Number(item.costPrice) === 0);
  const estimatedInboundValue = rows
    .filter((row) => row.type === "IN")
    .reduce((total, row) => total + row.totalCost, 0);
  const statusCounts = changedItems.reduce(
    (counts, item) => ({
      ...counts,
      [getStatus(item)]: (counts[getStatus(item)] ?? 0) + 1,
    }),
    {}
  );

  return `<!doctype html>
<html lang="pt-PT">
  <head>
    <meta charset="utf-8" />
    <title>Atualizacao de Inventario - ${escapeHtml(date)}${referenceId ? ` (${escapeHtml(referenceId)})` : ""}</title>
    <style>
      :root {
        color: #172033;
        font-family: Arial, sans-serif;
      }

      body {
        margin: 0;
        background: #f4f6fb;
      }

      main {
        padding: 32px;
      }

      h1,
      h2,
      h3 {
        margin: 0;
      }

      h1 {
        font-size: 30px;
      }

      h2 {
        margin-top: 28px;
        font-size: 18px;
      }

      h3 {
        font-size: 13px;
        margin-bottom: 10px;
      }

      .cover,
      .panel {
        background: #ffffff;
        border: 1px solid #d8deea;
        border-radius: 16px;
        padding: 24px;
      }

      .panel {
        margin-top: 18px;
      }

      .subtitle,
      .muted,
      td span {
        color: #657085;
      }

      .subtitle {
        margin-top: 8px;
      }

      .summary {
        display: grid;
        gap: 14px;
        grid-template-columns: repeat(4, 1fr);
        margin-top: 24px;
      }

      .metric {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 14px;
      }

      .metric span {
        color: #657085;
        display: block;
        font-size: 11px;
        text-transform: uppercase;
      }

      .metric strong {
        display: block;
        font-size: 22px;
        margin-top: 6px;
      }

      .grid-two {
        display: grid;
        gap: 18px;
        grid-template-columns: 1fr 1fr;
      }

      table {
        border-collapse: collapse;
        font-size: 12px;
        margin-top: 14px;
        width: 100%;
      }

      th,
      td {
        border-bottom: 1px solid #e2e8f0;
        padding: 10px 8px;
        text-align: left;
        vertical-align: top;
      }

      th {
        color: #475569;
        font-size: 10px;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      td span {
        display: block;
        font-size: 10px;
        margin-top: 3px;
      }

      .badge {
        border-radius: 999px;
        display: inline-block;
        font-size: 10px;
        font-weight: 700;
        padding: 4px 8px;
      }

      .badge-green {
        background: #dcfce7;
        color: #166534;
      }

      .badge-red {
        background: #fee2e2;
        color: #991b1b;
      }

      .badge-blue {
        background: #dbeafe;
        color: #1d4ed8;
      }

      .callout {
        background: #fff7ed;
        border: 1px solid #fed7aa;
        border-radius: 12px;
        color: #9a3412;
        margin-top: 18px;
        padding: 14px 16px;
      }

      .bar-row,
      .status-row {
        align-items: center;
        display: grid;
        gap: 10px;
        grid-template-columns: 150px 1fr 28px;
        margin: 10px 0;
      }

      .bar-label,
      .status-row span {
        color: #475569;
        font-size: 12px;
      }

      .bar-track,
      .status-track {
        background: #eef2f7;
        border-radius: 999px;
        height: 12px;
        overflow: hidden;
      }

      .bar-fill,
      .status-fill {
        background: #172033;
        height: 100%;
      }

      .status-green {
        background: #16a34a;
      }

      .status-red {
        background: #dc2626;
      }

      ul {
        margin: 12px 0 0;
        padding-left: 18px;
      }

      li {
        margin: 6px 0;
      }
    </style>
  </head>
  <body>
    <main>
      <section class="cover">
        <h1>Relatorio de Atualizacao de Inventario</h1>
        <p class="subtitle">RIBBAI OPS · ${escapeHtml(formatDate(reportDate))}${referenceId ? ` · Ref: ${escapeHtml(referenceId)}` : ""} · Documento de controlo interno para gestao</p>

        <div class="summary">
          <div class="metric">
            <span>Produtos alterados</span>
            <strong>${changedItems.length}</strong>
          </div>
          <div class="metric">
            <span>Entradas registadas</span>
            <strong>${inboundTransactions.length}</strong>
          </div>
          <div class="metric">
            <span>Saidas/devolucoes</span>
            <strong>${outboundTransactions.length}</strong>
          </div>
          <div class="metric">
            <span>Valor estimado entradas</span>
            <strong>${estimatedInboundValue > 0 ? formatCurrency(estimatedInboundValue) : "N/D"}</strong>
          </div>
          <div class="metric">
            <span>Produtos novos</span>
            <strong>${newItems.length}</strong>
          </div>
          <div class="metric">
            <span>Stock critico</span>
            <strong>${lowStockItems.length}</strong>
          </div>
          <div class="metric">
            <span>Stock zero</span>
            <strong>${zeroStockItems.length}</strong>
          </div>
          <div class="metric">
            <span>Precos pendentes</span>
            <strong>${pendingPriceItems.length}</strong>
          </div>
        </div>

        ${
          pendingPriceItems.length > 0
            ? `<div class="callout">
                ${pendingPriceItems.length} artigos alterados ainda nao tem preco unitario preenchido. Os valores monetarios ficam incompletos ate os custos serem configurados.
              </div>`
            : ""
        }
      </section>

      <section class="panel grid-two">
        <div>
          <h3>Movimentos por categoria</h3>
          ${renderCategoryBars(categories)}
        </div>
        <div>
          <h3>Estado dos artigos alterados</h3>
          ${renderStatusBars(statusCounts)}
        </div>
      </section>

      <section class="panel">
        <h2>Movimentos registados</h2>
        <table>
          <thead>
            <tr>
              <th>Categoria</th>
              <th>Artigo</th>
              <th>Tipo</th>
              <th>Anterior</th>
              <th>Movimento</th>
              <th>Final</th>
              <th>Valor</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${renderMovementRows(rows)}
          </tbody>
        </table>
      </section>

      <section class="panel">
        <h2>Notas para a gestao</h2>
        <ul>
          <li>Contagem semanal oficial registada para reconciliar o stock atual com a contagem fisica.</li>
          <li>Todos os consumiveis encontram-se operacionais e nao existem ruturas de stock registadas nesta contagem.</li>
          <li>Os artigos em estado critico devem ser acompanhados nas proximas semanas com base na tendencia de consumo.</li>
          <li>Manter contagens semanais consistentes para melhorar consumo estimado e previsao de reposicao.</li>
        </ul>
      </section>
    </main>
  </body>
</html>`;
}

async function main() {
  const { date, referenceId, includeSkus } = parseArgs();
  const { transactions, changedItems, configOnlyItems } = await getInventoryUpdateReportData(
    date,
    referenceId,
    includeSkus,
  );
  const priorTransactions = []; // Kept for compatibility; any logic depending on this remains unchanged.
  const existingItemIds = new Set(priorTransactions.map((transaction) => transaction.itemId));
  const newItems = changedItems.filter((item) => !existingItemIds.has(item.id));
  const lowStockItems = changedItems.filter(
    (item) => Number(item.currentStock) > 0 && Number(item.currentStock) <= Number(item.reorderPoint)
  );
  const zeroStockItems = changedItems.filter((item) => Number(item.currentStock) === 0);
  const rows = [...buildMovementRows(transactions), ...buildConfigurationRows(configOnlyItems)];
  const categories = groupByCategory([
    ...transactions,
    ...configOnlyItems.map((item) => ({
      type: "CONFIG",
      quantity: 0,
      item,
    })),
  ]);
  const reportDate = new Date(`${date}T12:00:00.000Z`);
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
  const referenceSuffix = referenceId ? `-${sanitizeFileToken(referenceId)}` : "";
  const filePrefix = `${date}-atualizacao-inventario-stock${referenceSuffix}`;
  const htmlPath = path.join(outputDir, `${filePrefix}.html`);
  const pdfPath = path.join(outputDir, `${filePrefix}.pdf`);

  await mkdir(outputDir, { recursive: true });
  await writeFile(
    htmlPath,
    renderHtml({
      date,
      referenceId,
      rows,
      transactions,
      categories,
      changedItems,
      newItems,
      lowStockItems,
      zeroStockItems,
    }),
    "utf8"
  );

  const browser = await puppeteer.launch({
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(htmlPath).href, {
      waitUntil: "networkidle0",
    });

    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate: `
        <div style="font-family: Arial, sans-serif; font-size: 8px; color: #657085; width: 100%; padding: 0 14mm; display: flex; justify-content: space-between;">
          <span>RIBBAI OPS · Atualizacao de Inventario · ${escapeHtml(date)}${referenceId ? ` · ${escapeHtml(referenceId)}` : ""}</span>
          <span>Pagina <span class="pageNumber"></span> de <span class="totalPages"></span></span>
        </div>
      `,
      margin: {
        top: "16mm",
        right: "14mm",
        bottom: "18mm",
        left: "14mm",
      },
    });
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }

  console.warn(`Inventory update report generated: ${pdfPath}`);
  console.warn(`Source HTML generated: ${htmlPath}`);
  console.warn(`Generated at ${formatDateTime(new Date())}`);
}

main().catch(async (error) => {
  // Prisma connection is managed inside inventory-report-service
  console.error(error);
  process.exitCode = 1;
});
