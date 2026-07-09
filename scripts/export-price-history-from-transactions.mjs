import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

function toDateString(date) {
  return new Date(date).toISOString().split("T")[0];
}

async function main() {
  const now = new Date();
  const todayStr = toDateString(now);
  const year = now.getFullYear();
  const monthDir = monthDirectoryNames[now.getMonth()];

  try {
    const transactions = await prisma.inventoryTransaction.findMany({
      where: {
        type: "IN",
        unitCost: { not: null },
      },
      select: {
        itemId: true,
        unit: true,
        unitCost: true,
        transactionDate: true,
        item: {
          select: {
            sku: true,
            name: true,
            unit: true,
            category: true,
            subCategory: true,
          },
        },
      },
      orderBy: {
        transactionDate: "asc",
      },
    });

    const bySku = new Map();

    for (const tx of transactions) {
      if (!tx.item) continue;
      const sku = tx.item.sku;
      if (!bySku.has(sku)) {
        bySku.set(sku, {
          sku,
          name: tx.item.name,
          category: tx.item.subCategory ?? tx.item.category,
          currentUnitInItem: tx.item.unit,
          priceEvents: [],
        });
      }

      const group = bySku.get(sku);
      const lastEvent = group.priceEvents[group.priceEvents.length - 1];
      const unitCostNum = Number(tx.unitCost ?? 0);

      if (
        lastEvent &&
        lastEvent.unit === tx.unit &&
        Number(lastEvent.unitCost) === unitCostNum
      ) {
        lastEvent.lastSeenAt = tx.transactionDate;
      } else {
        group.priceEvents.push({
          date: tx.transactionDate,
          unit: tx.unit,
          unitCost: unitCostNum,
          firstSeenAt: tx.transactionDate,
          lastSeenAt: tx.transactionDate,
        });
      }
    }

    const history = Array.from(bySku.values()).map((entry) => ({
      sku: entry.sku,
      name: entry.name,
      category: entry.category,
      currentUnitInItem: entry.currentUnitInItem,
      priceEvents: entry.priceEvents.map((event) => ({
        date: toDateString(event.date),
        unit: event.unit,
        unitCost: event.unitCost,
        firstSeenAt: toDateString(event.firstSeenAt),
        lastSeenAt: toDateString(event.lastSeenAt),
      })),
    }));

    const outputDir = path.join(
      rootDir,
      "docs",
      "operational-records",
      String(year),
      monthDir,
      "Relatorio-Mensal-Consumiveis",
      "Logs-Auditoria"
    );

    await mkdir(outputDir, { recursive: true });

    const jsonPath = path.join(
      outputDir,
      `price-history-from-transactions-${todayStr}.json`
    );

    await writeFile(jsonPath, JSON.stringify(history, null, 2), "utf8");

    console.warn(
      `Price history export written to JSON file: ${jsonPath} (artigos com histórico de preço: ${history.length})`
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Erro ao exportar histórico de preços a partir das transações:", error);
  process.exitCode = 1;
});

