import { readFile } from "node:fs/promises";
import path from "node:path";

import { PrismaClient, Prisma } from "@prisma/client";
import { updateMonthlyPreview } from "./update-monthly-preview.mjs";

const DEFAULT_DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5432/ribbai_ops?schema=public";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
    },
  },
});

// SKU alias map for inventory normalization.
// Ensures that historical or legacy SKUs are always mapped to the current canonical item.
// Example: CONS-TAKEAWAY-CUPS-SMALL (copos pequenos take away + tampas)
// deve ser tratado como o artigo canónico de copos médios café take away.
const SKU_ALIAS_MAP = {
  "CONS-TAKEAWAY-CUPS-SMALL": "CONS-TAKEAWAY-MEDIUM-COFFEE-CUPS",
};

const REFERENCE_TYPE = "WEEKLY_COUNT";
const SUPPLIER_CODE = "CONSUMABLES-PENDING";
const COUNTED_BY = "Filipe Catalao";
const CREATED_BY = "OPS-AUTOMATION-JSON";

function decimal(value) {
  if (value instanceof Prisma.Decimal) {
    return value;
  }
  return new Prisma.Decimal(String(value));
}

function calculateVariancePercentage(systemQuantity, variance) {
  if (systemQuantity.isZero()) {
    return new Prisma.Decimal("0");
  }
  return variance.div(systemQuantity).mul(new Prisma.Decimal("100"));
}

function sanitizeReasonDelta(delta) {
  if (delta.isZero()) {
    return "Ajuste de inventario semanal (sem diferenca).";
  }
  return delta.greaterThan(0)
    ? "Ajuste de inventario semanal (entrada por contagem)."
    : "Ajuste de inventario semanal (saida por contagem).";
}

async function ensureSupplier() {
  return prisma.supplier.upsert({
    where: { code: SUPPLIER_CODE },
    update: { name: "Fornecedor de Consumiveis a Definir", status: "ACTIVE" },
    create: { code: SUPPLIER_CODE, name: "Fornecedor de Consumiveis a Definir", status: "ACTIVE" },
  });
}

function getWeekRangeUtc(date) {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0=Sun,1=Mon,...6=Sat
  const diffToMonday = (day + 6) % 7; // Mon->0, Tue->1, ...
  const monday = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diffToMonday)
  );
  const sunday = new Date(
    Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + 6)
  );
  return { weekStartDate: monday, weekEndDate: sunday };
}

async function main() {
  const rawArgs = process.argv.slice(2);
  const args = Object.fromEntries(
    rawArgs
      .filter((arg) => arg.startsWith("--") && arg.includes("="))
      .map((arg) => {
        const [key, ...rest] = arg.slice(2).split("=");
        return [key, rest.join("=")];
      })
  );
  const force = rawArgs.includes("--force");

  const jsonPathArg = args.json;
  if (!jsonPathArg) {
    throw new Error("Missing --json=path/to/weekly-count.json");
  }
  const jsonPath = path.resolve(jsonPathArg);
  const raw = await readFile(jsonPath, "utf8");
  const payload = JSON.parse(raw);

  const dateStr = args.date ?? payload.date;
  if (!dateStr) {
    throw new Error("Missing date (provide --date=YYYY-MM-DD or include \"date\" in JSON).");
  }

  const weekNumber = Number(args.weekNumber ?? payload.weekNumber);
  const year = Number(args.year ?? payload.year);
  if (!Number.isInteger(weekNumber) || !Number.isInteger(year)) {
    throw new Error("Invalid weekNumber/year. Provide --weekNumber and --year or in JSON.");
  }

  const countedAt = new Date(`${dateStr}T12:00:00.000Z`);
  const { weekStartDate, weekEndDate } = getWeekRangeUtc(countedAt);
  const referenceId = `WEEKLY-COUNT-${dateStr}`;

  const rawLines = Array.isArray(payload.lines) ? payload.lines : [];
  if (rawLines.length === 0) {
    throw new Error("JSON lines array is empty.");
  }

  // Normalizar SKUs com base no mapa de aliases para garantir que
  // SKUs históricos (ex.: CONS-TAKEAWAY-CUPS-SMALL) são sempre
  // aplicados ao artigo canónico atual.
  const lines = rawLines.map((line) => ({
    ...line,
    sku: SKU_ALIAS_MAP[line.sku] ?? line.sku,
  }));

  const supplier = await ensureSupplier();

  const existingTxCount = await prisma.inventoryTransaction.count({
    where: {
      referenceType: REFERENCE_TYPE,
      referenceId,
    },
  });

  if (existingTxCount > 0 && !force) {
    throw new Error(
      `Weekly inventory already recorded for ${referenceId}. Re-run with --force to regenerate.`
    );
  }

  if (existingTxCount > 0 && force) {
    await prisma.inventoryTransaction.deleteMany({
      where: {
        referenceType: REFERENCE_TYPE,
        referenceId,
      },
    });
  }

  const skus = lines.map((line) => line.sku);
  const items = await prisma.inventoryItem.findMany({
    where: {
      sku: {
        in: skus,
      },
    },
  });
  const itemsBySku = new Map(items.map((item) => [item.sku, item]));
  const missingSkus = skus.filter((sku) => !itemsBySku.has(sku));
  if (missingSkus.length > 0) {
    throw new Error(`Missing InventoryItem records for SKUs: ${missingSkus.join(", ")}`);
  }

  const results = [];
  let totalValue = new Prisma.Decimal("0");
  let totalVarianceValue = new Prisma.Decimal("0");

  for (const line of lines) {
    const item = itemsBySku.get(line.sku);
    const systemQuantity = decimal(item.currentStock);
    const actualQuantity = decimal(line.quantity);
    const variance = actualQuantity.sub(systemQuantity);
    const varianceAbs = variance.abs();
    const unitCost = decimal(item.costPrice ?? "0");
    const lineTotalValue = unitCost.mul(actualQuantity);
    const lineVarianceValue = unitCost.mul(variance);

    totalValue = totalValue.add(lineTotalValue);
    totalVarianceValue = totalVarianceValue.add(lineVarianceValue);

    const operations = [
      prisma.inventoryItem.update({
        where: { id: item.id },
        data: {
          currentStock: actualQuantity,
          status: "ACTIVE",
          updatedBy: CREATED_BY,
        },
      }),
    ];

    if (!varianceAbs.isZero()) {
      operations.push(
        prisma.inventoryTransaction.create({
          data: {
            itemId: item.id,
            type: "ADJUSTMENT",
            quantity: varianceAbs,
            unit: item.unit,
            unitCost,
            totalCost: unitCost.mul(varianceAbs),
            referenceType: REFERENCE_TYPE,
            referenceId,
            supplierId: supplier.id,
            balanceAfter: actualQuantity,
            reason: sanitizeReasonDelta(variance),
            notes: `Contagem fisica oficial registada em ${dateStr} por ${COUNTED_BY}.`,
            createdBy: CREATED_BY,
            transactionDate: countedAt,
          },
        })
      );
    }

    await prisma.$transaction(operations);

    results.push({
      sku: line.sku,
      name: item.name,
      unit: item.unit,
      systemQuantity,
      actualQuantity,
      variance,
    });
  }

  console.warn(
    JSON.stringify(
      {
        message: "Weekly inventory from JSON applied.",
        referenceId,
        date: dateStr,
        weekNumber,
        year,
        items: results.length,
      },
      null,
      2
    )
  );

  // Atualizar automaticamente o preview do relatório mensal
  // para o mês da contagem aplicada (mantém KPIs sempre alinhados).
  try {
    const countedDate = new Date(`${dateStr}T12:00:00.000Z`);
    const previewYear = countedDate.getUTCFullYear();
    const previewMonth = countedDate.getUTCMonth() + 1;
    await updateMonthlyPreview({ year: previewYear, month: previewMonth });
  } catch (previewError) {
    console.error(
      "Falha ao atualizar preview mensal apos aplicar weekly inventory (Prisma).",
      previewError
    );
  }
}

main()
  .catch((error) => {
    console.error("Failed to apply weekly inventory from JSON", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

