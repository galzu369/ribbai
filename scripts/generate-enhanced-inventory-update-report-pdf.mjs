import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { PrismaClient } from "@prisma/client";
import puppeteer from "puppeteer";

/**
 * Enhanced Inventory Update Report Generator with CMP Financial Integration
 * 
 * This enhanced version includes financial information:
 * - Current Average Cost (CMP)
 * - Last Purchase Cost  
 * - Stock Value
 * - Financial movement tracking
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const DEFAULT_DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/ribbai_ops?schema=public";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
    },
  },
});

const monthDirectoryNames = [
  "01-january", "02-february", "03-march", "04-april",
  "05-may", "06-june", "07-july", "08-august",
  "09-september", "10-october", "11-november", "12-december",
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

  const referenceId = args.referenceId ?? null;
  const includeSkusArg = args.includeSkus ?? "";
  const includeSkus = includeSkusArg.split(",").filter(Boolean);

  return { date, referenceId, includeSkus };
}

function escapeHtml(text) {
  if (typeof text !== "string") return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatQuantity(value) {
  const num = Number(value);
  return num % 1 === 0 ? num.toString() : num.toFixed(1);
}

function formatCurrency(value, currency = "EUR") {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency,
  }).format(amount);
}

function formatDate(date) {
  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "medium",
    timeZone: "Europe/Lisbon",
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
  return status === "Critico" ? "badge-red" : "badge-green";
}

function getFinancialImpactBadgeClass(impact) {
  if (impact === "HIGH_VALUE") return "badge-purple";
  if (impact === "PRICE_CHANGE") return "badge-orange";
  return "badge-blue";
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
      totalValue: 0,
    };

    existing.count += 1;

    if (transaction.type === "IN") {
      existing.inbound += Number(transaction.quantity);
      existing.totalValue += Number(transaction.totalCost ?? 0);
    } else if (transaction.type === "OUT") {
      existing.outbound += Number(transaction.quantity);
      existing.totalValue += Number(transaction.totalCost ?? 0);
    }

    grouped.set(category, existing);
  }

  return [...grouped.values()].sort((a, b) => b.totalValue - a.totalValue);
}

function buildEnhancedMovementRows(transactions) {
  return transactions.map((transaction) => {
    const isInboundAdjustment = transaction.type === "ADJUSTMENT" &&
      (transaction.reason ?? "").toLowerCase().includes("entrada");
    const isOutboundAdjustment = transaction.type === "ADJUSTMENT" &&
      (transaction.reason ?? "").toLowerCase().includes("saida");
    
    const movementSign = transaction.type === "IN" || isInboundAdjustment ? "+" :
                        transaction.type === "OUT" || isOutboundAdjustment ? "-" : "";
    
    const previousQuantity = transaction.type === "IN" || isInboundAdjustment ?
      Number(transaction.balanceAfter) - Number(transaction.quantity) :
      Number(transaction.balanceAfter) + Number(transaction.quantity);

    const item = transaction.item;
    const status = getStatus(item);
    const transactionValue = Number(transaction.totalCost ?? 0);

    // Financial calculations
    const currentCMP = Number(item.averageCost ?? 0);
    const lastPurchaseCost = Number(item.lastPurchaseCost ?? 0);
    const stockValue = Number(item.stockValue ?? 0);
    
    // Determine financial impact
    let financialImpact = "NORMAL";
    if (stockValue > 200) financialImpact = "HIGH_VALUE";
    if (Math.abs(currentCMP - lastPurchaseCost) / Math.max(currentCMP, 0.01) > 0.15) {
      financialImpact = "PRICE_CHANGE";
    }

    return {
      type: transaction.type,
      source: "TRANSACTION", 
      sku: item.sku,
      name: item.name,
      category: item.subCategory ?? item.category,
      previousQuantity,
      movementQuantity: Number(transaction.quantity),
      finalQuantity: Number(transaction.balanceAfter),
      movementSign,
      transactionUnit: transaction.unit,
      itemUnit: item.unit,
      totalCost: transactionValue,
      status,
      // Enhanced financial fields
      currentCMP,
      lastPurchaseCost,
      stockValue,
      financialImpact,
      unitCost: Number(transaction.unitCost ?? 0),
      createdAt: transaction.createdAt,
    };
  });
}

function buildConfigurationRows(configOnlyItems) {
  return configOnlyItems.map((item) => {
    const status = getStatus(item);
    const stockValue = Number(item.stockValue ?? 0);
    const currentCMP = Number(item.averageCost ?? 0);
    const lastPurchaseCost = Number(item.lastPurchaseCost ?? 0);

    let financialImpact = "NORMAL";
    if (stockValue > 200) financialImpact = "HIGH_VALUE";

    return {
      type: "CONFIG",
      source: "CONFIG_UPDATE",
      sku: item.sku,
      name: item.name,
      category: item.subCategory ?? item.category,
      previousQuantity: Number(item.currentStock),
      movementQuantity: 0,
      finalQuantity: Number(item.currentStock),
      movementSign: "",
      transactionUnit: item.unit,
      itemUnit: item.unit,
      totalCost: 0,
      status,
      currentCMP,
      lastPurchaseCost,
      stockValue,
      financialImpact,
      unitCost: Number(item.costPrice ?? 0),
      createdAt: item.updatedAt,
    };
  });
}

function renderEnhancedMovementRows(rows) {
  return rows
    .map((row) => `
      <tr>
        <td>${escapeHtml(row.category)}</td>
        <td>
          <strong>${escapeHtml(row.name)}</strong>
          <span>${escapeHtml(row.sku)}</span>
        </td>
        <td><span class="badge ${row.type === "IN" ? "badge-green" : row.type === "OUT" ? "badge-red" : "badge-blue"}">${escapeHtml(row.type)}</span></td>
        <td>${formatQuantity(row.previousQuantity)} ${escapeHtml(row.transactionUnit)}</td>
        <td>${row.type === "CONFIG" ? "Config" : `${row.movementSign}${formatQuantity(row.movementQuantity)} ${escapeHtml(row.transactionUnit)}`}</td>
        <td>${formatQuantity(row.finalQuantity)} ${escapeHtml(row.itemUnit)}</td>
        <td class="financial-cell">${formatCurrency(row.currentCMP)}</td>
        <td class="financial-cell">${formatCurrency(row.lastPurchaseCost)}</td>
        <td class="financial-cell"><strong>${formatCurrency(row.stockValue)}</strong></td>
        <td>${row.type === "CONFIG" ? "N/A" : formatCurrency(row.totalCost)}</td>
        <td><span class="badge ${getBadgeClass(row.status)}">${escapeHtml(row.status)}</span></td>
        <td><span class="badge ${getFinancialImpactBadgeClass(row.financialImpact)}">${row.financialImpact === "HIGH_VALUE" ? "Alto Valor" : row.financialImpact === "PRICE_CHANGE" ? "Variação Preço" : "Normal"}</span></td>
      </tr>
    `)
    .join("");
}

function buildReportHtml(
  date,
  reportTitle,
  rows,
  categories,
  newItemsCount,
  lowStockItemsCount,
  zeroStockItemsCount,
  totalFinancialValue
) {
  const formattedDate = formatDate(new Date(date));
  
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        line-height: 1.6;
        margin: 0;
        padding: 20px;
        color: #333;
        background-color: #f8f9fa;
      }
      
      .header {
        text-align: center;
        margin-bottom: 30px;
        padding: 20px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      
      .header h1 {
        margin: 0;
        color: #2c3e50;
        font-size: 28px;
      }
      
      .header p {
        margin: 10px 0 0 0;
        color: #7f8c8d;
        font-size: 16px;
      }
      
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
        margin-bottom: 30px;
      }
      
      .summary-card {
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        text-align: center;
      }
      
      .summary-card h3 {
        margin: 0 0 10px 0;
        font-size: 14px;
        color: #7f8c8d;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      
      .summary-card .value {
        font-size: 24px;
        font-weight: bold;
        color: #2c3e50;
      }
      
      .summary-card .financial-value {
        color: #27ae60;
      }
      
      .panel {
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        margin-bottom: 30px;
        overflow: hidden;
      }
      
      .panel h2 {
        background: #3498db;
        color: white;
        margin: 0;
        padding: 15px 20px;
        font-size: 18px;
      }
      
      .financial-panel h2 {
        background: #27ae60;
      }
      
      .panel-content {
        padding: 20px;
      }
      
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
      }
      
      th, td {
        text-align: left;
        padding: 8px 6px;
        border-bottom: 1px solid #ecf0f1;
      }
      
      th {
        background-color: #34495e;
        color: white;
        font-weight: 600;
        position: sticky;
        top: 0;
      }
      
      .financial-header {
        background-color: #27ae60 !important;
      }
      
      .financial-cell {
        font-weight: 600;
        color: #27ae60;
      }
      
      tbody tr:nth-child(even) {
        background-color: #f8f9fa;
      }
      
      tbody tr:hover {
        background-color: #e8f4f8;
      }
      
      .badge {
        display: inline-block;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .badge-green { background: #d4edda; color: #155724; }
      .badge-red { background: #f8d7da; color: #721c24; }
      .badge-blue { background: #cce7ff; color: #004085; }
      .badge-purple { background: #e2d4ff; color: #5a2d91; }
      .badge-orange { background: #fff3cd; color: #856404; }
      
      .category-row {
        font-weight: 600;
        background-color: #ecf0f1;
      }
      
      ul {
        padding-left: 20px;
      }
      
      li {
        margin-bottom: 8px;
      }
      
      @media print {
        body { background: white; }
        .panel { box-shadow: none; }
      }
    </style>
  </head>
  <body>
    <div class="header">
      <h1>Atualização de Inventário com Análise Financeira CMP</h1>
      <p>${reportTitle} - ${formattedDate}</p>
    </div>

    <div class="summary-grid">
      <div class="summary-card">
        <h3>Movimentos</h3>
        <div class="value">${rows.length}</div>
      </div>
      <div class="summary-card">
        <h3>Categorias</h3>
        <div class="value">${categories.length}</div>
      </div>
      <div class="summary-card">
        <h3>Novos Itens</h3>
        <div class="value">${newItemsCount}</div>
      </div>
      <div class="summary-card">
        <h3>Stock Baixo</h3>
        <div class="value">${lowStockItemsCount}</div>
      </div>
      <div class="summary-card">
        <h3>Stock Zero</h3>
        <div class="value">${zeroStockItemsCount}</div>
      </div>
      <div class="summary-card">
        <h3>Valor Total Stock</h3>
        <div class="value financial-value">${formatCurrency(totalFinancialValue)}</div>
      </div>
    </div>

    <div class="panel financial-panel">
      <h2>Movimentos de Inventário com Informação Financeira CMP</h2>
      <div class="panel-content">
        <table>
          <thead>
            <tr>
              <th>Categoria</th>
              <th>Item</th>
              <th>Tipo</th>
              <th>Stock Anterior</th>
              <th>Movimento</th>
              <th>Stock Final</th>
              <th class="financial-header">CMP</th>
              <th class="financial-header">Último Preço</th>
              <th class="financial-header">Valor Stock</th>
              <th class="financial-header">Valor Movimento</th>
              <th>Estado</th>
              <th class="financial-header">Impacto Financeiro</th>
            </tr>
          </thead>
          <tbody>
            ${renderEnhancedMovementRows(rows)}
          </tbody>
        </table>
      </div>
    </div>

    <div class="panel">
      <h2>Resumo por Categoria</h2>
      <div class="panel-content">
        <table>
          <thead>
            <tr>
              <th>Categoria</th>
              <th>Movimentos</th>
              <th>Entradas</th>
              <th>Saídas</th>
              <th class="financial-header">Valor Total</th>
            </tr>
          </thead>
          <tbody>
            ${categories
              .map(
                (cat) => `
              <tr>
                <td><strong>${escapeHtml(cat.category)}</strong></td>
                <td>${cat.count}</td>
                <td>${formatQuantity(cat.inbound)}</td>
                <td>${formatQuantity(cat.outbound)}</td>
                <td class="financial-cell">${formatCurrency(cat.totalValue)}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </div>

    <div class="panel">
      <h2>Notas Técnicas - Sistema CMP</h2>
      <div class="panel-content">
        <ul>
          <li><strong>CMP (Custo Médio Ponderado):</strong> Calculado automaticamente para todas as entradas de stock, proporcionando valorização precisa do inventário.</li>
          <li><strong>Valor do Stock:</strong> Calculado como Stock Atual × CMP, refletindo o valor real do inventário em cada momento.</li>
          <li><strong>Impacto Financeiro:</strong> Items marcados como "Alto Valor" (>€200) ou "Variação Preço" (>15% diferença entre CMP e último preço).</li>
          <li><strong>Rastreabilidade:</strong> Todos os movimentos mantêm histórico completo para auditoria e análise de tendências.</li>
          <li><strong>Compatibilidade:</strong> Sistema totalmente integrado com relatórios existentes e contagens semanais.</li>
        </ul>
      </div>
    </div>
  </body>
</html>`;
}

async function main() {
  const { date, referenceId, includeSkus } = parseArgs();
  const { start, end } = getDayPeriod(date);
  const where = {
    transactionDate: {
      gte: start,
      lte: end,
    },
  };

  if (referenceId) {
    where.referenceId = referenceId;
  }

  const transactions = await prisma.inventoryTransaction.findMany({
    where,
    include: {
      item: true,
    },
    orderBy: [{ transactionDate: "asc" }, { createdAt: "asc" }],
  });

  if (transactions.length === 0) {
    throw new Error(`No inventory transactions found for ${date}.`);
  }

  const transactionItemIds = [...new Set(transactions.map((transaction) => transaction.itemId))];
  const updatedItems = await prisma.inventoryItem.findMany({
    where: {
      OR: [
        {
          updatedAt: {
            gte: start,
            lte: end,
          },
        },
        {
          sku: {
            in: includeSkus,
          },
        },
      ],
    },
  });

  const configOnlyItems = updatedItems.filter((item) => !transactionItemIds.includes(item.id));
  const changedItemIds = [...new Set([...transactionItemIds, ...configOnlyItems.map((item) => item.id)])];
  
  const changedItems = await prisma.inventoryItem.findMany({
    where: {
      id: {
        in: changedItemIds,
      },
    },
  });

  const priorTransactions = await prisma.inventoryTransaction.findMany({
    where: {
      itemId: {
        in: changedItemIds,
      },
      transactionDate: {
        lt: start,
      },
    },
    select: {
      itemId: true,
    },
  });

  const existingItemIds = new Set(priorTransactions.map((transaction) => transaction.itemId));
  const newItems = changedItems.filter((item) => !existingItemIds.has(item.id));
  const lowStockItems = changedItems.filter(
    (item) => Number(item.currentStock) > 0 && Number(item.currentStock) <= Number(item.reorderPoint)
  );
  const zeroStockItems = changedItems.filter((item) => Number(item.currentStock) === 0);

  // Calculate total financial value
  const totalFinancialValue = changedItems.reduce((sum, item) => sum + Number(item.stockValue ?? 0), 0);

  const rows = [...buildEnhancedMovementRows(transactions), ...buildConfigurationRows(configOnlyItems)];
  const categories = groupByCategory([
    ...transactions,
    ...configOnlyItems.map((item) => ({
      type: "CONFIG",
      item,
      quantity: 0,
      totalCost: 0,
    })),
  ]);

  const reportTitle = referenceId ? `Referência: ${referenceId}` : "Relatório Diário";
  const html = buildReportHtml(
    date,
    reportTitle,
    rows,
    categories,
    newItems.length,
    lowStockItems.length,
    zeroStockItems.length,
    totalFinancialValue
  );

  // Save files
  const dateObj = new Date(date);
  const year = dateObj.getFullYear();
  const monthDir = monthDirectoryNames[dateObj.getMonth()];
  const outputDir = path.join(
    rootDir,
    "docs",
    "operational-records",
    year.toString(),
    monthDir,
    "inventory-updates"
  );

  await mkdir(outputDir, { recursive: true });

  const baseFilename = `${date}-atualizacao-inventario-cmp-${referenceId ?? "daily"}`.replace(/[^a-zA-Z0-9-_.]/g, "-");
  const htmlPath = path.join(outputDir, `${baseFilename}.html`);
  const pdfPath = path.join(outputDir, `${baseFilename}.pdf`);

  await writeFile(htmlPath, html, "utf-8");

  // Generate PDF
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(pathToFileURL(htmlPath).href);
  await page.pdf({
    path: pdfPath,
    format: "A4",
    margin: {
      top: "20mm",
      right: "15mm",
      bottom: "20mm",
      left: "15mm",
    },
  });
  await browser.close();

  console.log(`Enhanced CMP inventory report generated:`);
  console.log(`HTML: ${htmlPath}`);
  console.log(`PDF: ${pdfPath}`);
}

main()
  .catch((error) => {
    console.error("Error generating enhanced inventory report:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });