import { PrismaClient, Prisma } from "@prisma/client";

const DEFAULT_DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5432/ribbai_ops?schema=public";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
    },
  },
});

const SKU = "CONS-OPS-PRINTER-ROLLS";
const NEW_THRESHOLD = 2;
const UPDATED_BY = "OPS-THRESHOLD-ADJUST";

async function main() {
  const item = await prisma.inventoryItem.findUnique({
    where: { sku: SKU },
    select: {
      id: true,
      sku: true,
      name: true,
      unit: true,
      minimumStock: true,
      reorderPoint: true,
      currentStock: true,
    },
  });

  if (!item) {
    throw new Error(`InventoryItem with SKU ${SKU} not found.`);
  }

  const updated = await prisma.inventoryItem.update({
    where: { id: item.id },
    data: {
      minimumStock: new Prisma.Decimal(String(NEW_THRESHOLD)),
      reorderPoint: new Prisma.Decimal(String(NEW_THRESHOLD)),
      updatedBy: UPDATED_BY,
    },
    select: {
      sku: true,
      name: true,
      unit: true,
      minimumStock: true,
      reorderPoint: true,
      currentStock: true,
    },
  });

  console.warn(
    JSON.stringify(
      {
        message: "Updated critical threshold for printer rolls",
        before: {
          minimumStock: item.minimumStock?.toString(),
          reorderPoint: item.reorderPoint?.toString(),
        },
        after: {
          minimumStock: updated.minimumStock.toString(),
          reorderPoint: updated.reorderPoint.toString(),
        },
        currentStock: updated.currentStock.toString(),
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
