import { PrismaClient } from "@prisma/client";

const DEFAULT_DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5432/ribbai_ops?schema=public";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
    },
  },
});

async function main() {
  const items = await prisma.inventoryItem.findMany({
    where: {
      sku: {
        in: [
          "CONS-SERVICE-NAPKINS",
          "CONS-SERVICE-NAPKINS-LARGE",
          "CONS-SERVICE-NAPKINS-SMALL",
          "CONS-TAKEAWAY-MEDIUM-CUPS-LIDS",
          "CONS-TAKEAWAY-CUPS-MEDIUM",
          "CLEAN-SPLIT-LV-RINSE",
          "CLEAN-SPLIT-LV",
        ],
      },
    },
    select: {
      sku: true,
      name: true,
      unit: true,
      costPrice: true,
      averageCost: true,
      lastPurchaseCost: true,
      lastPurchaseDate: true,
      currentStock: true,
      stockValue: true,
      status: true,
    },
    orderBy: {
      sku: "asc",
    },
  });

  console.log("Guardanapos pricing snapshot:");
  for (const item of items) {
    console.log(
      JSON.stringify(
        {
          sku: item.sku,
          name: item.name,
          unit: item.unit,
          status: item.status,
          costPrice: item.costPrice?.toString(),
          averageCost: item.averageCost?.toString(),
          lastPurchaseCost: item.lastPurchaseCost?.toString(),
          lastPurchaseDate: item.lastPurchaseDate?.toISOString() ?? null,
          currentStock: item.currentStock?.toString(),
          stockValue: item.stockValue?.toString(),
        },
        null,
        2
      )
    );
  }
}

main()
  .catch((error) => {
    console.error("Error in debug-guardanapos-pricing:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

