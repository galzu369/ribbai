import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

  const now = new Date();
  const year = Number(args.year ?? now.getFullYear());
  const month = Number(args.month ?? now.getMonth() + 1);

  if (!Number.isInteger(year) || year < 2000) {
    throw new Error("Invalid --year value.");
  }

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("Invalid --month value. Expected a value from 1 to 12.");
  }

  return { year, month };
}

async function loadMasterList() {
  const configPath = path.join(
    rootDir,
    "config",
    "inventory-weekly-master-list.json"
  );
  const raw = await readFile(configPath, "utf8");
  const parsed = JSON.parse(raw);
  const bySku = new Map();
  for (const item of parsed.items ?? []) {
    if (item.canonicalSku) {
      bySku.set(item.canonicalSku, item);
    }
  }
  return bySku;
}

async function main() {
  const { year, month } = parseArgs();
  const monthSlug = String(month).padStart(2, "0");
  const monthDir = monthDirectoryNames[month - 1];

  const htmlPath = path.join(
    rootDir,
    "docs",
    "operational-records",
    String(year),
    monthDir,
    "monthly",
    `${year}-${monthSlug}-relatorio-mensal-consumiveis.html`
  );

  const html = await readFile(htmlPath, "utf8");
  const masterBySku = await loadMasterList();

  console.log("=== RIBBAI - Snapshot de fim de mês ===");
  console.log(`Mes: ${monthSlug}/${year}`);
  console.log(`Fonte: ${htmlPath}`);
  console.log("");

  const rowRegex =
    /<tr>\s*<td>([\s\S]*?)<\/td>\s*<td>\s*<strong>([\s\S]*?)<\/strong>[\s\S]*?<span>([\s\S]*?)<\/span>[\s\S]*?<td>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>/g;

  const items = [];
  let match;
  while ((match = rowRegex.exec(html)) !== null) {
    const categoryCell = match[1];
    const nameCell = match[2];
    const skuCell = match[3];
    const openingCell = match[4];
    const closingCell = match[5];

    const category = stripHtml(categoryCell);
    const name = stripHtml(nameCell);
    const rawSku = stripHtml(skuCell);

    if (!rawSku) continue;

    const { quantity: closingQty, unit: closingUnit } =
      parseQuantityAndUnit(closingCell);

    if (closingQty === null) continue;

    const master = masterBySku.get(rawSku) ?? null;
    let newUnit = closingUnit;
    let convertedQty = closingQty;

    if (master && master.unit) {
      newUnit = master.unit;
      if (
        master.caseUnit &&
        master.caseUnit === closingUnit &&
        master.packsPerCase
      ) {
        // Ex.: 1,5 caixa -> sacos: 1,5 * packsPerCase
        convertedQty = closingQty * master.packsPerCase;
      }
    }

    items.push({
      category,
      name,
      sku: rawSku,
      unit: newUnit,
      closingQuantity: convertedQty,
      originalUnit: closingUnit,
      originalClosingQuantity: closingQty,
    });
  }

  console.log(`Artigos no snapshot: ${items.length}`);

  const snapshot = {
    year,
    month,
    generatedAt: new Date().toISOString(),
    items,
  };

  const outputDir = path.join(
    rootDir,
    "docs",
    "operational-records",
    String(year),
    monthDir,
    "monthly"
  );
  await mkdir(outputDir, { recursive: true });
  const snapshotPath = path.join(
    outputDir,
    `${year}-${monthSlug}-month-end-snapshot.json`
  );
  await writeFile(snapshotPath, JSON.stringify(snapshot, null, 2), "utf8");

  console.log("");
  console.log(`📄 Snapshot de fim de mês criado: ${snapshotPath}`);
}

main().catch((error) => {
  console.error("❌ Erro ao gerar snapshot de fim de mês:", error);
  process.exitCode = 1;
});

