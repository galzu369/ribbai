import { mkdir, writeFile, readFile } from "node:fs/promises";
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
    preview: rawArgs.includes("--preview"),
  };
}

function assertValidPeriod(year, month) {
  if (!Number.isInteger(year) || year < 2000) {
    throw new Error("Invalid --year value.");
  }

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("Invalid --month value. Expected a value from 1 to 12.");
  }
}

function getMonthEndDate(year, month) {
  return new Date(year, month, 0);
}

function isSameMonth(date, year, month) {
  return date.getFullYear() === year && date.getMonth() + 1 === month;
}

function isCurrentMonthClosed(year, month, today = new Date()) {
  const monthEndDate = getMonthEndDate(year, month);

  if (isSameMonth(today, year, month)) {
    return today.getDate() === monthEndDate.getDate();
  }

  return today > monthEndDate;
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
    // Ano arbitrário, apenas o mês interessa para o nome
    new Date(Date.UTC(2000, month - 1, 1))
  );
}

function getPeriod(year, month) {
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 1)),
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

async function buildReportRows(
  groupedCounts,
  windowStartDate,
  monthStartDate,
  monthEndDate,
  openingSnapshot
) {
  const rows = [];

  for (const entry of groupedCounts) {
    // Selecionar contagens dentro da janela analisada
    const countsInWindow = entry.counts.filter(
      (count) => count.date >= windowStartDate && count.date <= monthEndDate
    );
    const relevantCounts =
      countsInWindow.length > 0 ? countsInWindow : entry.counts;

    // Usar sempre até às 4 últimas contagens (3 anteriores + atual)
    const lastFourCounts = relevantCounts.slice(-4);
    const hasConsumptionBasis = lastFourCounts.length >= 2;
    const firstWindowCount = lastFourCounts[0] ?? null;
    const lastWindowCount =
      lastFourCounts[lastFourCounts.length - 1] ?? null;

    // Stock final considerado = stock atual no sistema (após última contagem)
    const closingQuantity = Number(entry.item.currentStock);

    // Período de movimentos para cálculo de consumo:
    // da primeira contagem da janela até ao fim do período analisado
    const movementStartDate =
      hasConsumptionBasis && firstWindowCount
        ? firstWindowCount.date
        : windowStartDate;

    // Movimentos usados para cálculo de consumo (podem atravessar meses)
    const movementInbound = await getTransactionSummary(
      entry.item.id,
      movementStartDate,
      monthEndDate,
      "IN",
      entry.item.unit
    );
    const movementOutbound = await getTransactionSummary(
      entry.item.id,
      movementStartDate,
      monthEndDate,
      "OUT",
      entry.item.unit
    );

    // Movimentos apresentados nas colunas \"Entradas\"/\"Saídas\" do relatório:
    // apenas transações do próprio mês (requisito de periodo mensal)
    const displayInbound = await getTransactionSummary(
      entry.item.id,
      monthStartDate,
      monthEndDate,
      "IN",
      entry.item.unit
    );
    const displayOutbound = await getTransactionSummary(
      entry.item.id,
      monthStartDate,
      monthEndDate,
      "OUT",
      entry.item.unit
    );

    // Quantidade inicial baseada na primeira contagem da janela
    // Prioridade 1: snapshot de fim de mês anterior (stock inicial oficial)
    let openingQuantity =
      openingSnapshot?.get(entry.item.sku)?.closingQuantity ??
      firstWindowCount?.quantity ??
      null;

    // Correções específicas já existentes
    // Rolos Impressora: stock inicial de Junho = 3 caixas
    if (entry.item.sku === "CONS-OPS-PRINTER-ROLLS") {
      openingQuantity = 3;
    }

    // Spray Laranja WC IBT: correção do stock inicial após conversão de unidade
    // Apenas aplicar quando NÃO existe snapshot de fim de mês anterior (ex.: relatório de Junho 2026).
    if (
      entry.item.sku === "CLEAN-WC-ORANGE-SPRAY-IBT" &&
      firstWindowCount &&
      !openingSnapshot?.has(entry.item.sku)
    ) {
      if (entry.item.unit === "unidade") {
        // Stock inicial correto: 2 litros = 0,4 unidades (2 ÷ 5)
        openingQuantity = 0.4;
      }
    }

    const estimatedConsumption =
      hasConsumptionBasis && openingQuantity !== null
        ? openingQuantity +
          movementInbound.quantity -
          movementOutbound.quantity -
          closingQuantity
        : null;

    const unitCost = Number(entry.item.costPrice);
    const estimatedCost =
      estimatedConsumption === null ? null : estimatedConsumption * unitCost;

    rows.push({
      sku: entry.item.sku,
      name: entry.item.name,
      category: entry.item.subCategory ?? entry.item.category,
      unit: entry.item.unit,
      openingQuantity: openingQuantity,
      closingQuantity,
      inboundQuantity: displayInbound.quantity,
      inboundUnit: displayInbound.unit,
      outboundQuantity: displayOutbound.quantity,
      outboundUnit: displayOutbound.unit,
      estimatedConsumption,
      unitCost,
      estimatedCost,
      countCount: entry.counts.length,
      currentStock: Number(entry.item.currentStock),
      stockValue: Number(entry.item.stockValue ?? 0),
      minimumStock: Number(entry.item.minimumStock),
      reorderPoint: Number(entry.item.reorderPoint),
      status: getStockStatus(entry.item),
    });
  }

  return rows.sort((left, right) =>
    left.category.localeCompare(right.category)
  );
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

// Normalização específica: combinar Guardanapos Pequenos e remover alias duplicado
function normalizeGuardanaposPequenos(rows) {
  const aliasSku = "CONS-SERVICE-SMALL-NAPKINS";
  const canonicalSku = "CONS-SERVICE-NAPKINS-SMALL";

  // Remover linha duplicada do alias
  const filtered = rows.filter((row) => row.sku !== aliasSku);

  const guardIndex = filtered.findIndex(
    (row) => row.sku === "CONS-SERVICE-NAPKINS"
  );
  const smallIndex = filtered.findIndex((row) => row.sku === canonicalSku);

  if (guardIndex === -1 || smallIndex === -1) {
    return filtered;
  }

  // Reposicionar Guardanapos Pequenos logo a seguir a Guardanapos
  if (smallIndex !== guardIndex + 1) {
    const [smallRow] = filtered.splice(smallIndex, 1);
    filtered.splice(guardIndex + 1, 0, smallRow);
  }

  return filtered;
}

function renderHtml({ year, month, rows, countDates, preview }) {
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
  // Passa a haver base de consumo assim que existir pelo menos um artigo
  // com consumo estimado calculado a partir da janela de contagens
  const hasConsumptionBasis = rowsWithConsumption.length > 0;
  const totalStockValue = rows.reduce(
    (total, row) =>
      total + (typeof row.stockValue === "number" ? row.stockValue : row.currentStock * row.unitCost),
    0
  );

  return `<!doctype html>
<html lang="pt-PT">
  <head>
    <meta charset="utf-8" />
    <title>${preview ? "Preview - " : ""}Relatorio Mensal de Inventario - ${escapeHtml(getMonthName(month))} ${year}</title>
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
    </style>
  </head>
  <body>
    <main>
      <section class="cover">
        <h1>${preview ? "Preview do Relatorio Mensal de Inventario" : "Relatorio Mensal de Inventario"}</h1>
        <p class="subtitle">RIBBAI OPS · ${escapeHtml(getMonthName(month))} ${year}</p>

        ${
          preview
            ? `<div class="callout">
                Documento provisorio gerado antes do fecho mensal. Deve ser usado apenas para controlo interno
                e nao como relatorio oficial para gestao.
              </div>`
            : ""
        }

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
            <span>Valor total do stock</span>
            <strong>${formatCurrency(totalStockValue)}</strong>
          </div>
          <div class="metric">
            <span>Precos pendentes</span>
            <strong>${missingPrices.length}</strong>
          </div>
        </div>

        ${
          hasConsumptionBasis
            ? ""
            : `<div class="callout">
                Ainda existe apenas uma contagem no periodo. O relatorio mostra stock atual e alertas,
                mas o consumo medio e a previsao de gastos requerem pelo menos duas contagens comparaveis.
              </div>`
        }

        ${
          missingPrices.length > 0
            ? `<div class="callout">
                ${missingPrices.length} artigos ainda nao tem preco unitario configurado. Os valores
                monetarios ficam incompletos ate os custos serem preenchidos em InventoryItem.costPrice.
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
              <th>Stock final</th>
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
        <h2>Notas para a gestao</h2>
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
          <li>Para calcular gasto medio e previsao de rutura, manter contagens semanais consistentes.</li>
          <li>Registar entradas de fornecedores como transacoes IN para separar reposicao de consumo real.</li>
        </ul>
      </section>
    </main>
  </body>
</html>`;
}

async function main() {
  const { year, month, preview } = parseArgs();
  assertValidPeriod(year, month);

  if (!preview && !isCurrentMonthClosed(year, month)) {
    const monthEndDate = getMonthEndDate(year, month);
    throw new Error(
      `Relatorio mensal final bloqueado. Para ${String(month).padStart(2, "0")}/${year}, o relatorio oficial so deve ser gerado no fecho do mes (${monthEndDate.toLocaleDateString("pt-PT")}). Use --preview para gerar uma versao provisoria interna.`
    );
  }

  const { start: monthStart, end: monthEnd } = getPeriod(year, month);
  // Janela móvel de 4 semanas para cálculo de consumo médio (3 contagens anteriores + atual)
  // Recuamos 21 dias a partir do início do mês para garantir que apanhamos
  // as 3 últimas terças-feiras de junho + a primeira terça de julho.
  const windowStart = new Date(monthStart);
  windowStart.setDate(windowStart.getDate() - 21);
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

  // Carregar snapshot de fim de mês anterior (para stock inicial)
  let openingSnapshotMap = null;
  try {
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonthDir = monthDirectoryNames[prevMonth - 1];
    const prevMonthSlug = String(prevMonth).padStart(2, "0");
    const snapshotPath = path.join(
      rootDir,
      "docs",
      "operational-records",
      String(prevYear),
      prevMonthDir,
      "monthly",
      `${prevYear}-${prevMonthSlug}-month-end-snapshot.json`
    );
    const rawSnapshot = await readFile(snapshotPath, "utf8");
    const snapshot = JSON.parse(rawSnapshot);
    openingSnapshotMap = new Map();
    for (const item of snapshot.items ?? []) {
      openingSnapshotMap.set(item.sku, item);
    }
  } catch {
    // Se não houver snapshot, seguimos sem ele (fallback para contagens)
    openingSnapshotMap = null;
  }

  const counts = await prisma.weeklyInventory.findMany({
    where: {
      weekStartDate: {
        gte: windowStart,
        lt: monthEnd,
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
  const rawRows = await buildReportRows(
    groupedCounts,
    windowStart,
    monthStart,
    monthEnd,
    openingSnapshotMap
  );
  const rows = normalizeGuardanaposPequenos(rawRows);

  // Contagens a partir de WeeklyInventory (modelo analítico antigo)
  const weeklyInventoryCountDates = [
    ...new Set(
      counts
        // Apenas contagens cujo período pertença ao mês analisado
        .filter(
          (count) =>
            count.weekStartDate >= monthStart && count.weekStartDate < monthEnd
        )
        .flatMap((count) =>
          count.items.map((item) => item.countedAt ?? count.weekEndDate)
        )
        .map((date) => date.toISOString())
    ),
  ];

  // Contagens oficiais a partir das transações WEEKLY_COUNT (workflow operacional)
  const weeklyCountTransactions = await prisma.inventoryTransaction.findMany({
    where: {
      referenceType: "WEEKLY_COUNT",
      transactionDate: {
        gte: monthStart,
        lt: monthEnd,
      },
    },
    select: {
      transactionDate: true,
    },
  });

  const weeklyCountTxDates = [
    ...new Set(
      weeklyCountTransactions.map((tx) =>
        tx.transactionDate.toISOString()
      )
    ),
  ];

  // Contagens no período = união das duas fontes, sem duplicados
  const countDates = [
    ...new Set([...weeklyInventoryCountDates, ...weeklyCountTxDates]),
  ];

  const monthSlug = String(month).padStart(2, "0");
  const outputDir = path.join(
    rootDir,
    "docs",
    "operational-records",
    String(year),
    monthDirectoryNames[month - 1],
    "monthly"
  );
  const filePrefix = preview
    ? `${year}-${monthSlug}-preview-relatorio-mensal-consumiveis`
    : `${year}-${monthSlug}-relatorio-mensal-consumiveis`;
  const htmlPath = path.join(outputDir, `${filePrefix}.html`);
  const pdfPath = path.join(outputDir, `${filePrefix}.pdf`);

  await mkdir(outputDir, { recursive: true });
  await writeFile(htmlPath, renderHtml({ year, month, rows, countDates, preview }), "utf8");

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
          <span>RIBBAI OPS · ${preview ? "Preview · " : ""}Relatorio Mensal de Inventario · ${monthSlug}/${year}</span>
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

  console.warn(`${preview ? "Monthly consumables preview" : "Monthly consumables report"} generated: ${pdfPath}`);
}

main().catch(async (error) => {
  await prisma.$disconnect();
  console.error(error);
  process.exitCode = 1;
});
