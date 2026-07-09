import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logging";

/**
 * Initialize CMP (Weighted-Average Cost) fields for existing inventory items
 * 
 * This script runs once to populate the new CMP fields with appropriate default values:
 * - averageCost: Set to current costPrice (best initial approximation)
 * - lastPurchaseCost: Set to current costPrice 
 * - stockValue: Set to currentStock * costPrice
 * - lastPurchaseDate: Find last purchase transaction or use item creation date
 * - lastInventoryDate: Find last inventory count or leave null
 */

async function initializeCMPFields(): Promise<void> {
  logger.info("Starting CMP fields initialization for existing inventory items");

  const items = await prisma.inventoryItem.findMany({
    select: {
      id: true,
      sku: true,
      name: true,
      currentStock: true,
      costPrice: true,
      averageCost: true,
      createdAt: true,
    },
  });

  logger.info(`Found ${items.length} inventory items to process`);

  let processedCount = 0;
  let skippedCount = 0;

  for (const item of items) {
    // Skip if CMP fields are already initialized (non-zero averageCost)
    if (item.averageCost.gt(0)) {
      logger.debug(`Skipping ${item.sku} - CMP fields already initialized`);
      skippedCount++;
      continue;
    }

    // Calculate initial stock value
    const initialStockValue = item.currentStock.mul(item.costPrice);

    // Find last purchase transaction for this item
    const lastPurchaseTransaction = await prisma.inventoryTransaction.findFirst({
      where: {
        itemId: item.id,
        type: "IN",
        unitCost: { not: null },
      },
      orderBy: { transactionDate: "desc" },
      select: {
        unitCost: true,
        transactionDate: true,
      },
    });

    // Find last inventory count (weekly inventory)
    const lastInventoryCount = await prisma.weeklyInventoryItem.findFirst({
      where: { itemId: item.id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    const updateData = {
      averageCost: item.costPrice, // Initialize with current cost price
      lastPurchaseCost: lastPurchaseTransaction?.unitCost ?? item.costPrice,
      stockValue: initialStockValue,
      lastPurchaseDate: lastPurchaseTransaction?.transactionDate ?? item.createdAt,
      lastInventoryDate: lastInventoryCount?.createdAt ?? null,
    };

    await prisma.inventoryItem.update({
      where: { id: item.id },
      data: updateData,
    });

    logger.info(`Initialized CMP fields for ${item.sku}`, {
      sku: item.sku,
      name: item.name,
      currentStock: item.currentStock.toString(),
      initialAverageCost: updateData.averageCost.toString(),
      initialStockValue: updateData.stockValue.toString(),
      lastPurchaseDate: updateData.lastPurchaseDate?.toISOString(),
      lastInventoryDate: updateData.lastInventoryDate?.toISOString(),
    });

    processedCount++;
  }

  logger.info("CMP fields initialization completed", {
    totalItems: items.length,
    processed: processedCount,
    skipped: skippedCount,
  });
}

async function main(): Promise<void> {
  await initializeCMPFields();
}

main()
  .catch((error: unknown) => {
    logger.error("Failed to initialize CMP fields", { error });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });