import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PrismaClient } from "@prisma/client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const prisma = new PrismaClient();

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
        const [key, ...rest] = arg.slice(2).split("=");
        return [key, rest.join("=")];
      })
  );

  const preview = rawArgs.includes("--preview");

  const now = new Date();
  const year = Number(args.year ?? now.getFullYear());
  const month = Number(args.month ?? now.getMonth() + 1);

  if (!Number.isInteger(year) || year < 2000) {
    throw new Error("Invalid --year value.");
  }

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("Invalid --month value. Expected a value from 1 to 12.");
  }

  return { year, month, preview };
}

function stripHtml(text) {
  return text.replace(/<br\s*\/?>/gi, "").replace(/<\/?[^>]+>/g, "").trim();
}

function parseQuantityAndUnit(text) {
  const clean = stripHtml(text);
  if (!clean) return { quantity: null, unit: null };
  const parts = clean.split(/\s+/);
  if (parts.length === 1) {
    const normalized = parts[0].replace(",", ".");
    const value = Number(normalized);
    return {
      quantity: Number.isNaN(value) ? null : value,
      unit: null,
    };
  }
  const normalized = parts[0].replace(",", ".");
  const value = Number(normalized);
  return {
    quantity: Number.isNaN(value) ? null : value,
    unit: parts.slice(1).join(" "),
  };
}

async function loadReportRows({ year, month, preview }) {
  const monthSlug = String(month).padStart(2, "0");
  const monthDir = monthDirectoryNames[month - 1];
  const filePrefix = preview
    ? `${year}-${monthSlug}-preview-relatorio-mensal-consumiveis`
    : `${year}-${monthSlug}-relatorio-mensal-consumiveis`;

  const htmlPath = path.join(
    rootDir,
    "docs",
    "operational-records",
    String(year),
    monthDir,
    "monthly",
    `${filePrefix}.html`
  );

  const html = await readFile(htmlPath, "utf8");

  const rowRegex =
    /<tr>\s*<td>([\s\S]*?)<\/td>\s*<td>\s*<strong>([\s\S]*?)<\/strong>[\s\S]*?<span>([\s\S]*?)<\/span>[\s\S]*?<td>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>[\s\S]*?<td>([\s\S]*?)<\/td>/g;

  const rows = [];
  let match;
  while ((match = rowRegex.exec(html)) !== null) {
    const categoryCell = match[1];
    const nameCell = match[2];
    const skuCell = match[3];
    const openingCell = match[4];
    const closingCell = match[5];
    const inboundCell = match[6];

    const category = stripHtml(categoryCell);
    const name = stripHtml(nameCell);
    const rawSku = stripHtml(skuCell);

    if (!rawSku) continue;

    const { quantity: closingQty, unit: closingUnit } =
      parseQuantityAndUnit(closingCell);
    const { quantity: inboundQty, unit: inboundUnit } =
      parseQuantityAndUnit(inboundCell);

    rows.push({
      category,
      name,
      sku: rawSku,
      closingQuantity: closingQty,
      closingUnit,
      inboundQuantity: inboundQty,
      inboundUnit,
    });
  }

  return { htmlRowCount: rows.length, rows, htmlPath };
}

async function main() {
  const { year, month, preview } = parseArgs();
  const monthSlug = String(month).padStart(2, "0");

  console.log(
    `=== RIBBAI · Validacao de dados do relatorio mensal · ${monthSlug}/${year} ===`
  );

  const inventoryCategories = ["Consumiveis", "Produtos de Limpeza"];

  // 1) Carregar items base da BD (fonte de verdade)
  const dbItems = await prisma.inventoryItem.findMany({
    where: {
      category: {
        in: inventoryCategories,
      },
      status: "ACTIVE",
    },
  });
  const dbSkus = new Set(dbItems.map((item) => item.sku));

  // 2) Carregar linhas do HTML gerado
  const { htmlRowCount, rows, htmlPath } = await loadReportRows({
    year,
    month,
    preview,
  });
  const reportSkus = new Set(rows.map((row) => row.sku));

  console.log(`Items activos na BD: ${dbItems.length}`);
  console.log(`Linhas de artigos no relatorio: ${htmlRowCount}`);

  let hasError = false;

  // 2.1) Verificar contagem de linhas
  if (dbItems.length !== htmlRowCount) {
    console.error(
      `❌ Numero de linhas do relatorio (${htmlRowCount}) nao coincide com numero de InventoryItems activos (${dbItems.length}).`
    );
    hasError = true;
  } else {
    console.log("✔ Numero de linhas do relatorio coincide com a BD.");
  }

  // 2.2) Verificar que todos os SKUs activos aparecem no relatorio
  const missingInReport = [...dbSkus].filter((sku) => !reportSkus.has(sku));
  if (missingInReport.length > 0) {
    console.error(
      `❌ Existem SKUs activos na BD que nao aparecem no relatorio: ${missingInReport.join(
        ", "
      )}`
    );
    hasError = true;
  } else {
    console.log("✔ Todos os SKUs activos aparecem no relatorio.");
  }

  // 2.3) Validar que cada linha tem unidade de stock final
  const rowsWithoutUnit = rows.filter((row) => !row.closingUnit);
  if (rowsWithoutUnit.length > 0) {
    console.error(
      `❌ Existem linhas sem unidade em 'Stock final': ${rowsWithoutUnit
        .map((row) => row.sku)
        .join(", ")}`
    );
    hasError = true;
  } else {
    console.log("✔ Todas as linhas tem unidade em 'Stock final'.");
  }

  console.log("");
  console.log(`Fonte HTML validada: ${htmlPath}`);

  if (hasError) {
    process.exitCode = 1;
  } else {
    console.log("✅ Validacao de smoke test concluida sem erros.");
  }
}

main()
  .catch((error) => {
    console.error("❌ Erro na validacao de dados do relatorio mensal:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

