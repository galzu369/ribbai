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
  const items = await prisma.inventoryItem.findMany();
  const total = items.reduce(
    (sum, item) => sum + Number(item.currentStock) * Number(item.costPrice ?? 0),
    0
  );

  // Rounded to 2 decimal places for reporting.
  console.log("TOTAL_INVENTORY_VALUE_EUR", total.toFixed(2));
}

main()
  .catch((error) => {
    console.error("Failed to compute inventory value", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

