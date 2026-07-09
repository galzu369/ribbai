import { prisma } from "@/lib/db";
import { logger } from "@/lib/logging";

type RenameLine = {
  sku: string;
  fromName: string;
  toName: string;
};

const CREATED_BY = "OPS-AUTOMATION";

const RENAMES: RenameLine[] = [
  {
    sku: "CONS-TAKEAWAY-BURGER-BOX",
    fromName: "Box Hamburguer",
    toName: "Box grande 1980ml",
  },
  {
    sku: "CONS-TAKEAWAY-TOAST-BOX",
    fromName: "Box Tostas",
    toName: "Box Média 1350",
  },
];

async function main() {
  const results: Array<{
    sku: string;
    previousName: string | null;
    newName: string;
    changed: boolean;
  }> = [];

  for (const rename of RENAMES) {
    const item = await prisma.inventoryItem.findUnique({
      where: { sku: rename.sku },
      select: { id: true, sku: true, name: true },
    });

    if (!item) {
      logger.warn("Inventory item not found; skipping rename.", {
        sku: rename.sku,
        expectedFromName: rename.fromName,
        targetName: rename.toName,
      });
      results.push({
        sku: rename.sku,
        previousName: null,
        newName: rename.toName,
        changed: false,
      });
      continue;
    }

    if (item.name === rename.toName) {
      results.push({
        sku: rename.sku,
        previousName: item.name,
        newName: rename.toName,
        changed: false,
      });
      continue;
    }

    await prisma.inventoryItem.update({
      where: { id: item.id },
      data: {
        name: rename.toName,
        updatedBy: CREATED_BY,
      },
    });

    results.push({
      sku: rename.sku,
      previousName: item.name,
      newName: rename.toName,
      changed: true,
    });
  }

  logger.info("Inventory item renames applied.", {
    updatedBy: CREATED_BY,
    count: results.length,
    results,
  });
}

main()
  .catch((error: unknown) => {
    logger.error("Failed to rename inventory items", { error });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

