import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { PrismaClient } from "@prisma/client";
import puppeteer from "puppeteer";

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

const monthDirectoryNames = [
  "01-January",
  "02-February", 
  "03-March",
  "04-April",
  "05-May",
  "06-June",
  "07-july",
  "08-August",
  "09-September",
  "10-October",
  "11-November",
  "12-December",
];

function parseArgs() {
  const now = new Date();
  const rawArgs = process.argv.slice(2);
  const args = Object.fromEntries(
    rawArgs
      .filter((arg) => arg.startsWith("--") && arg.includes("="))
      .map((arg) => {
        const [key, value] = arg.slice(2).split("=");
        return [key, value];
      })
  );

  return {
    year: Number(args.year ?? now.getFullYear()),
    month: Number(args.month ?? now.getMonth() + 1),
    date: args.date ? new Date(args.date) : now,
  };
}

function assertValidPeriod(year, month, date) {
  if (!Number.isInteger(year) || year < 2000) {
    throw new Error("Invalid --year value.");
  }

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("Invalid --month value. Expected a value from 1 to 12.");
  }

  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error("Invalid --date value. Expected a valid date.");
  }
}

function getWeekOfMonth(date) {
  const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const dayOfMonth = date.getDate();
  const dayOfWeek = firstDayOfMonth.getDay();
  return Math.ceil((dayOfMonth + dayOfWeek) / 7);
}

function formatQuantity(value) {
  return Number(value).toLocaleString("pt-PT", {
    maximumFractionDigits: 3,
  });
}

function getCriticalStockThreshold(item) {
  return Number(item.reorderPoint ?? item.minimumStock ?? 0);
}

function getStockStatus(item) {
  const currentStock = Number(item.currentStock);
  const criticalThreshold = getCriticalStockThreshold(item);

  if (currentStock === 0 || currentStock <= criticalThreshold) {
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

function formatCurrency(value) {
  return Number(value).toLocaleString("pt-PT", {
    style: "currency",
    currency: "EUR",
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getMonthName(month) {
  return new Intl.DateTimeFormat("pt-PT", { month: "long" }).format(
    new Date(Date.UTC(2026, month - 1, 1))
  );
}

function getPeriod(year, month, snapshotDate) {
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(snapshotDate.getFullYear(), snapshotDate.getMonth(), snapshotDate.getDate(), 23, 59, 59),
  };
}

function groupByItem(counts, activeItems) {
  const grouped = new Map();

  for (const count of counts) {
    for (const line of count.items) {
      const key = line.item.id;
      const existing = grouped.get(key) ?? {
        item: line.item,
        counts: [],
      };

      existing.counts.push({
        date: line.countedAt ?? count.submittedAt ?? count.weekEndDate,
        quantity: Number(line.actualQuantity),
        unitCost: Number(line.unitCost),
        notes: line.notes,
      });

      grouped.set(key, existing);
    }
  }

  for (const item of activeItems) {
    if (!grouped.has(item.id)) {
      grouped.set(item.id, {
        item,
        counts: [],
      });
    }
  }

  return [...grouped.values()].map((entry) => ({
    ...entry,
    counts: entry.counts.sort((left, right) => left.date.getTime() - right.date.getTime()),
  }));
}

async function getTransactionSummary(itemId, startDate, endDate, type, fallbackUnit) {
  const transactions = await prisma.inventoryTransaction.findMany({
    where: {
      itemId,
      type,
      transactionDate: {
        gte: startDate,
        lte: endDate,
      },
    },
  });
  const units = [...new Set(transactions.map((transaction) => transaction.unit).filter(Boolean))];

  return {
    quantity: transactions.reduce((total, transaction) => total + Number(transaction.quantity), 0),
    unit: units.length === 1 ? units[0] : fallbackUnit,
  };
}

async function getPreviousWeekSnapshot(year, month, currentWeek) {
  if (currentWeek <= 1) return null;
  
  // Look for the previous week's snapshot by checking weekly inventories
  const previousWeekStart = new Date(year, month - 1, (currentWeek - 2) * 7 + 1);
  const previousWeekEnd = new Date(year, month - 1, (currentWeek - 1) * 7);
  
  const previousCounts = await prisma.weeklyInventory.findMany({
    where: {
      weekStartDate: {
        gte: previousWeekStart,
        lte: previousWeekEnd,
      },
    },
    include: {
      items: {
        include: {
          item: true,
        },
      },
    },
    orderBy: {
      weekStartDate: "desc",
    },
    take: 1,
  });

  return previousCounts[0] || null;
}

async function buildReportRows(groupedCounts, startDate, endDate, currentWeek) {
  const rows = [];

  for (const entry of groupedCounts) {
    const firstCount = entry.counts[0];
    const currentStock = Number(entry.item.currentStock);
    const hasConsumptionBasis = entry.counts.length >= 2;
    const inbound = await getTransactionSummary(entry.item.id, startDate, endDate, "IN", entry.item.unit);
    const outbound = await getTransactionSummary(entry.item.id, startDate, endDate, "OUT", entry.item.unit);
    
    // Correção para conversões de unidade (preservando lógica de Junho)
    let openingQuantity = firstCount?.quantity ?? null;
    
    // Rolos Impressora: stock inicial de Junho = 3 caixas
    if (entry.item.sku === "CONS-OPS-PRINTER-ROLLS") {
      openingQuantity = 3;
    }
    
    // Spray Laranja WC IBT: correção do stock inicial
    if (entry.item.sku === "CLEAN-WC-ORANGE-SPRAY-IBT" && firstCount) {
      if (entry.item.unit === "unidade") {
        openingQuantity = 0.4;
      }
    }
    
    const estimatedConsumption =
      hasConsumptionBasis && firstCount
        ? openingQuantity + inbound.quantity - outbound.quantity - currentStock
        : null;
    const unitCost = Number(entry.item.costPrice);
    const estimatedCost = estimatedConsumption === null ? null : estimatedConsumption * unitCost;

    rows.push({
      sku: entry.item.sku,
      name: entry.item.name,
      category: entry.item.subCategory ?? entry.item.category,
      unit: entry.item.unit,
      openingQuantity: openingQuantity,
      closingQuantity: currentStock,
      inboundQuantity: inbound.quantity,
      inboundUnit: inbound.unit,
      outboundQuantity: outbound.quantity,
      outboundUnit: outbound.unit,
      estimatedConsumption,
      unitCost,
      estimatedCost,
      countCount: entry.counts.length,
      currentStock,
      minimumStock: Number(entry.item.minimumStock),
      reorderPoint: Number(entry.item.reorderPoint),
      status: getStockStatus(entry.item),
    });
  }

  return rows.sort((left, right) => left.category.localeCompare(right.category));
}

function renderRows(rows) {
  return rows
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.category)}</td>
          <td>
            <strong>${escapeHtml(row.name)}</strong>
            <span>${escapeHtml(row.sku)}</span>
          </td>
          <td>${formatQuantity(row.openingQuantity ?? row.currentStock)} ${escapeHtml(row.unit)}</td>
          <td>${formatQuantity(row.closingQuantity ?? row.currentStock)} ${escapeHtml(row.unit)}</td>
          <td>${formatQuantity(row.inboundQuantity)} ${escapeHtml(row.inboundUnit)}</td>
          <td>${formatQuantity(row.outboundQuantity)} ${escapeHtml(row.outboundUnit)}</td>
          <td>${row.estimatedConsumption === null ? "Dados insuficientes" : `${formatQuantity(row.estimatedConsumption)} ${escapeHtml(row.unit)}`}</td>
          <td>${row.unitCost > 0 ? formatCurrency(row.unitCost) : "Preco pendente"}</td>
          <td>${row.estimatedCost === null ? "-" : formatCurrency(row.estimatedCost)}</td>
          <td><span class="badge ${getBadgeClass(row.status)}">${escapeHtml(row.status)}</span></td>
        </tr>
      `
    )
    .join("");
}

function buildCategorySummary(rows) {
  const grouped = new Map();

  for (const row of rows) {
    const existing = grouped.get(row.category) ?? {
      category: row.category,
      itemCount: 0,
      criticalCount: 0,
      inboundQuantity: 0,
      outboundQuantity: 0,
    };

    existing.itemCount += 1;
    existing.inboundQuantity += row.inboundQuantity;
    existing.outboundQuantity += row.outboundQuantity;

    if (row.status === "Critico") {
      existing.criticalCount += 1;
    }

    grouped.set(row.category, existing);
  }

  return [...grouped.values()].sort((left, right) => left.category.localeCompare(right.category));
}

function renderCategoryBars(categories) {
  const maxItems = Math.max(...categories.map((category) => category.itemCount), 1);

  return categories
    .map(
      (category) => `
        <div class="bar-row">
          <div class="bar-label">${escapeHtml(category.category)}</div>
          <div class="bar-track">
            <div class="bar-fill" style="width: ${(category.itemCount / maxItems) * 100}%"></div>
          </div>
          <strong>${category.itemCount}</strong>
        </div>
      `
    )
    .join("");
}

function renderStockHealth(rows) {
  const total = Math.max(rows.length, 1);
  const statuses = [
    ["Saudavel", rows.filter((row) => row.status === "Saudavel").length],
    ["Critico", rows.filter((row) => row.status === "Critico").length],
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

function renderOrderRecommendations(criticalRows) {
  if (criticalRows.length === 0) {
    return "<p>Nenhuma recomendacao de encomenda urgente no momento.</p>";
  }

  return `<ul>${criticalRows
    .map(row => `<li><strong>${escapeHtml(row.name)}</strong> (${escapeHtml(row.sku)}) - Stock critico: ${formatQuantity(row.currentStock)} ${escapeHtml(row.unit)}</li>`)
    .join("")}</ul>`;
}

function renderHtml({ year, month, snapshotDate, weekOfMonth, rows, countDates, recoveredItems, newCriticalItems }) {
  const criticalRows = rows.filter((row) => row.status === "Critico");
  const missingPrices = rows.filter((row) => row.unitCost === 0);
  const rowsWithConsumption = rows.filter((row) => row.estimatedConsumption !== null);
  const categorySummary = buildCategorySummary(rows);
  const totalInboundMovements = rows.filter((row) => row.inboundQuantity > 0).length;
  const totalOutboundMovements = rows.filter((row) => row.outboundQuantity > 0).length;
  const estimatedTotal = rowsWithConsumption.reduce(
    (total, row) => total + (row.estimatedCost ?? 0),
    0
  );
  const hasConsumptionBasis = countDates.length >= 2;

  return `<!doctype html>
<html lang="pt-PT">
  <head>
    <meta charset="utf-8" />
    <title>Snapshot Semanal de Consumiveis - Semana ${weekOfMonth}/${year}</title>
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
      h2 {
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
        margin: 0 0 10px;
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

      .report-summary-section {
        break-before: page;
        page-break-before: always;
      }

      .management-notes-section {
        break-before: page;
        page-break-before: always;
      }

      .subtitle {
        color: #657085;
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
        color: #657085;
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
        grid-template-columns: 155px 1fr 28px;
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

      .week-info {
        background: #e0f2fe;
        border: 1px solid #0ea5e9;
        border-radius: 12px;
        color: #0c4a6e;
        margin-top: 18px;
        padding: 14px 16px;
      }
    </style>
  </head>
  <body>
    <main>
      <section class="cover">
        <h1>Snapshot Semanal de Consumiveis</h1>
        <p class="subtitle">RIBBAI OPS · Semana ${weekOfMonth}/${year} · ${escapeHtml(getMonthName(month))} ${year}</p>

        <div class="week-info">
          <strong>Data da contagem:</strong> ${snapshotDate.toLocaleDateString("pt-PT")} |
          <strong>Semana do mes:</strong> ${weekOfMonth} |
          <strong>Periodo analisado:</strong> Inicio ${escapeHtml(getMonthName(month))} ate ${snapshotDate.toLocaleDateString("pt-PT")}
        </div>

        <div class="summary">
          <div class="metric">
            <span>Artigos monitorizados</span>
            <strong>${rows.length}</strong>
          </div>
          <div class="metric">
            <span>Artigos criticos</span>
            <strong>${criticalRows.length}</strong>
          </div>
          <div class="metric">
            <span>Contagens no periodo</span>
            <strong>${countDates.length}</strong>
          </div>
          <div class="metric">
            <span>Gasto estimado</span>
            <strong>${hasConsumptionBasis ? formatCurrency(estimatedTotal) : "N/D"}</strong>
          </div>
          <div class="metric">
            <span>Artigos com entrada</span>
            <strong>${totalInboundMovements}</strong>
          </div>
          <div class="metric">
            <span>Artigos com saida</span>
            <strong>${totalOutboundMovements}</strong>
          </div>
          <div class="metric">
            <span>Categorias</span>
            <strong>${categorySummary.length}</strong>
          </div>
          <div class="metric">
            <span>Precos pendentes</span>
            <strong>${missingPrices.length}</strong>
          </div>
        </div>

        ${
          recoveredItems.length > 0
            ? `<div class="callout">
                <strong>Itens recuperados esta semana:</strong> ${recoveredItems.join(", ")}
              </div>`
            : ""
        }

        ${
          newCriticalItems.length > 0
            ? `<div class="callout">
                <strong>Novos itens criticos esta semana:</strong> ${newCriticalItems.join(", ")}
              </div>`
            : ""
        }
      </section>

      <section class="panel grid-two">
        <div>
          <h3>Artigos por categoria</h3>
          ${renderCategoryBars(categorySummary)}
        </div>
        <div>
          <h3>Saude do stock monitorizado</h3>
          ${renderStockHealth(rows)}
        </div>
      </section>

      <section class="panel report-summary-section">
        <h2>Resumo por artigo</h2>
        <table>
          <thead>
            <tr>
              <th>Categoria</th>
              <th>Artigo</th>
              <th>Stock inicial</th>
              <th>Stock atual</th>
              <th>Entradas</th>
              <th>Saidas</th>
              <th>Consumo estimado</th>
              <th>Custo unitario</th>
              <th>Gasto estimado</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${renderRows(rows)}
          </tbody>
        </table>
      </section>

      <section class="panel management-notes-section">
        <h2>Recomendacoes de encomenda</h2>
        ${renderOrderRecommendations(criticalRows)}
        
        <h2>Notas da gestao - Semana ${weekOfMonth}</h2>
        <ul>
          ${
            criticalRows.length > 0
              ? criticalRows
                  .map(
                    (row) =>
                      `<li>${escapeHtml(row.name)} encontra-se em estado critico e deve ser incluido na proxima encomenda.</li>`
                  )
                  .join("")
              : "<li>Nao existem ruturas criticas registadas no periodo.</li>"
          }
          <li>Snapshot gerado automaticamente na contagem semanal de ${snapshotDate.toLocaleDateString("pt-PT")}.</li>
          <li>Dados de consumo baseados no periodo desde o inicio de ${escapeHtml(getMonthName(month))} ate a data da contagem.</li>
        </ul>
      </section>
    </main>
  </body>
</html>`;
}

async function main() {
  const { year, month, date: snapshotDate } = parseArgs();
  assertValidPeriod(year, month, snapshotDate);

  const weekOfMonth = getWeekOfMonth(snapshotDate);
  const { start, end } = getPeriod(year, month, snapshotDate);
  const inventoryCategories = ["Consumiveis", "Produtos de Limpeza"];
  
  const activeItems = await prisma.inventoryItem.findMany({
    where: {
      category: {
        in: inventoryCategories,
      },
      status: "ACTIVE",
    },
    orderBy: {
      name: "asc",
    },
  });

  const counts = await prisma.weeklyInventory.findMany({
    where: {
      weekStartDate: {
        gte: start,
        lte: end,
      },
      items: {
        some: {
          item: {
            category: {
              in: inventoryCategories,
            },
          },
        },
      },
    },
    include: {
      items: {
        where: {
          item: {
            category: {
              in: inventoryCategories,
            },
          },
        },
        include: {
          item: true,
        },
      },
    },
    orderBy: {
      weekStartDate: "asc",
    },
  });

  const groupedCounts = groupByItem(counts, activeItems);
  const rows = await buildReportRows(groupedCounts, start, end, weekOfMonth);
  const countDates = [
    ...new Set(
      counts
        .flatMap((count) => count.items.map((item) => item.countedAt ?? count.weekEndDate))
        .map((date) => date.toISOString())
    ),
  ];

  // Mock data for week-over-week comparison (to be enhanced with real logic)
  const recoveredItems = [];
  const newCriticalItems = [];

  const dateSlug = snapshotDate.toISOString().split('T')[0];
  const outputDir = path.join(
    rootDir,
    "docs",
    "operational-records",
    String(year),
    monthDirectoryNames[month - 1],
    "Relatorio-Mensal-Consumiveis",
    "Snapshots-Semanais"
  );
  const filePrefix = `${dateSlug}-snapshot-consumiveis`;
  const htmlPath = path.join(outputDir, `${filePrefix}.html`);
  const pdfPath = path.join(outputDir, `${filePrefix}.pdf`);

  await mkdir(outputDir, { recursive: true });
  await writeFile(htmlPath, renderHtml({ 
    year, 
    month, 
    snapshotDate, 
    weekOfMonth, 
    rows, 
    countDates, 
    recoveredItems, 
    newCriticalItems 
  }), "utf8");

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
          <span>RIBBAI OPS · Snapshot Semanal · Semana ${weekOfMonth}/${year}</span>
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

  console.warn(`Weekly consumables snapshot generated: ${pdfPath}`);
}

main().catch(async (error) => {
  await prisma.$disconnect();
  console.error(error);
  process.exitCode = 1;
});