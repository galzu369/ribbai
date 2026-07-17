import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logging";

// Conversion metadata
const REFERENCE_ID = "UNIT-CONVERSION-2026-07-01-PRINTER-ROLLS";
const REFERENCE_TYPE = "UNIT_CONVERSION";
const CONVERSION_DATE = new Date("2026-07-01T14:00:00.000Z");
const CREATED_BY = "Bruno";

// Conversion parameters
const CONVERSION_DATA = {
  sku: "CONS-OPS-PRINTER-ROLLS",
  fromUnit: "saco",
  toUnit: "caixa", 
  conversionFactor: new Prisma.Decimal("5"), // 5 sacos = 1 caixa
  newUnitPrice: new Prisma.Decimal("39.65"), // 7.93 × 5
  newMinimumStock: new Prisma.Decimal("2"), // 2 caixas
  newReorderPoint: new Prisma.Decimal("2"), // 2 caixas
};

function formatDecimal(value: Prisma.Decimal) {
  return Number(value).toLocaleString("pt-PT", { maximumFractionDigits: 3 });
}

function formatCurrency(value: Prisma.Decimal) {
  return Number(value).toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
}

/**
 * Calculate unit conversion with CMP adjustment
 */
function calculateUnitConversion(
  currentStock: Prisma.Decimal,
  currentCostPrice: Prisma.Decimal,
  currentAverageCost: Prisma.Decimal,
  conversionFactor: Prisma.Decimal,
  newUnitPrice: Prisma.Decimal
) {
  // Convert quantity (divide by conversion factor: sacos → caixas)
  const newStock = currentStock.div(conversionFactor);
  
  // Calculate current stock value using average cost
  const currentStockValue = currentStock.mul(currentAverageCost);
  
  // New stock value should remain the same (value preservation)
  const newStockValue = currentStockValue;
  
  // New average cost per new unit (to maintain same total value)
  const newAverageCost = newStockValue.div(newStock);
  
  return {
    newStock,
    newStockValue,
    newAverageCost,
    oldStock: currentStock,
    oldStockValue: currentStockValue,
  };
}

async function main() {
  const force = process.argv.includes("--force");
  
  // Check if conversion already exists
  if (!force) {
    const existingTransaction = await prisma.inventoryTransaction.findFirst({
      where: {
        referenceType: REFERENCE_TYPE,
        referenceId: REFERENCE_ID,
      },
    });
    
    if (existingTransaction) {
      logger.error("Unit conversion already exists. Use --force to reapply.", {
        referenceId: REFERENCE_ID,
        existingTransactionId: existingTransaction.id,
      });
      process.exitCode = 1;
      return;
    }
  }
  
  // Get current item state
  const currentItem = await prisma.inventoryItem.findUnique({
    where: { sku: CONVERSION_DATA.sku },
  });
  
  if (!currentItem) {
    logger.error("Item not found.", { sku: CONVERSION_DATA.sku });
    process.exitCode = 1;
    return;
  }
  
  // Validate current state
  if (currentItem.unit !== CONVERSION_DATA.fromUnit) {
    logger.error("Item unit mismatch. Expected unit different from current.", {
      sku: CONVERSION_DATA.sku,
      currentUnit: currentItem.unit,
      expectedUnit: CONVERSION_DATA.fromUnit,
    });
    process.exitCode = 1;
    return;
  }
  
  // Log current state
  logger.info("Current item state before conversion:", {
    sku: currentItem.sku,
    name: currentItem.name,
    unit: currentItem.unit,
    currentStock: currentItem.currentStock.toString(),
    costPrice: currentItem.costPrice.toString(),
    averageCost: currentItem.averageCost.toString(),
    stockValue: currentItem.stockValue.toString(),
    minimumStock: currentItem.minimumStock.toString(),
    reorderPoint: currentItem.reorderPoint.toString(),
  });
  
  // Calculate conversion
  const conversion = calculateUnitConversion(
    currentItem.currentStock,
    currentItem.costPrice,
    currentItem.averageCost,
    CONVERSION_DATA.conversionFactor,
    CONVERSION_DATA.newUnitPrice
  );
  
  // Validate conversion maintains value
  const valueDifference = conversion.newStockValue.sub(conversion.oldStockValue).abs();
  const tolerance = new Prisma.Decimal("0.01"); // 1 cent tolerance
  
  if (valueDifference.gt(tolerance)) {
    logger.error("Value preservation check failed.", {
      oldStockValue: conversion.oldStockValue.toString(),
      newStockValue: conversion.newStockValue.toString(),
      difference: valueDifference.toString(),
    });
    process.exitCode = 1;
    return;
  }
  
  // Log conversion details
  logger.info("Unit conversion calculation:", {
    conversion: {
      fromUnit: CONVERSION_DATA.fromUnit,
      toUnit: CONVERSION_DATA.toUnit,
      conversionFactor: CONVERSION_DATA.conversionFactor.toString(),
      oldStock: conversion.oldStock.toString(),
      newStock: conversion.newStock.toString(),
      oldStockValue: formatCurrency(conversion.oldStockValue),
      newStockValue: formatCurrency(conversion.newStockValue),
      oldAverageCost: formatCurrency(currentItem.averageCost),
      newAverageCost: formatCurrency(conversion.newAverageCost),
      newCostPrice: formatCurrency(CONVERSION_DATA.newUnitPrice),
    },
  });
  
  // Prepare conversion notes
  const conversionNotes = [
    `Conversão de unidade de medida: ${CONVERSION_DATA.fromUnit} → ${CONVERSION_DATA.toUnit}.`,
    `Fator de conversão: 1 ${CONVERSION_DATA.toUnit} = ${CONVERSION_DATA.conversionFactor} ${CONVERSION_DATA.fromUnit}.`,
    `Stock anterior: ${formatDecimal(conversion.oldStock)} ${CONVERSION_DATA.fromUnit}.`,
    `Stock convertido: ${formatDecimal(conversion.newStock)} ${CONVERSION_DATA.toUnit}.`,
    `Preço anterior: ${formatCurrency(currentItem.costPrice)}/${CONVERSION_DATA.fromUnit}.`,
    `Preço novo: ${formatCurrency(CONVERSION_DATA.newUnitPrice)}/${CONVERSION_DATA.toUnit}.`,
    `Valor do stock mantido: ${formatCurrency(conversion.newStockValue)}.`,
  ].join(" ");
  
  // Force revert if needed
  if (force) {
    const existingTransactions = await prisma.inventoryTransaction.findMany({
      where: {
        referenceType: REFERENCE_TYPE,
        referenceId: REFERENCE_ID,
      },
    });
    
    for (const tx of existingTransactions) {
      await prisma.inventoryTransaction.delete({
        where: { id: tx.id },
      });
    }
    
    logger.info("Existing conversion transactions removed for reapply.", {
      referenceId: REFERENCE_ID,
      removedTransactions: existingTransactions.length,
    });
  }
  
  // Apply conversion in transaction
  await prisma.$transaction(async (tx) => {
    // Update inventory item
    await tx.inventoryItem.update({
      where: { id: currentItem.id },
      data: {
        unit: CONVERSION_DATA.toUnit,
        currentStock: conversion.newStock,
        costPrice: CONVERSION_DATA.newUnitPrice,
        averageCost: conversion.newAverageCost,
        stockValue: conversion.newStockValue,
        minimumStock: CONVERSION_DATA.newMinimumStock,
        reorderPoint: CONVERSION_DATA.newReorderPoint,
        updatedBy: CREATED_BY,
      },
    });
    
    // Create audit transaction
    await tx.inventoryTransaction.create({
      data: {
        itemId: currentItem.id,
        type: "ADJUSTMENT",
        quantity: new Prisma.Decimal("0"), // No quantity change, just unit conversion
        unit: CONVERSION_DATA.toUnit,
        unitCost: CONVERSION_DATA.newUnitPrice,
        totalCost: new Prisma.Decimal("0"), // No cost impact, just conversion
        referenceType: REFERENCE_TYPE,
        referenceId: REFERENCE_ID,
        balanceAfter: conversion.newStock,
        reason: "Conversão de unidade de medida de saco para caixa",
        notes: conversionNotes,
        createdBy: CREATED_BY,
        transactionDate: CONVERSION_DATE,
      },
    });
  });
  
  // Get updated item to verify
  const updatedItem = await prisma.inventoryItem.findUnique({
    where: { sku: CONVERSION_DATA.sku },
  });
  
  if (!updatedItem) {
    logger.error("Failed to retrieve updated item.");
    process.exitCode = 1;
    return;
  }
  
  // Log success
  logger.info("Unit conversion completed successfully.", {
    referenceId: REFERENCE_ID,
    conversionDate: CONVERSION_DATE.toISOString(),
    item: {
      sku: updatedItem.sku,
      name: updatedItem.name,
      oldUnit: CONVERSION_DATA.fromUnit,
      newUnit: updatedItem.unit,
      oldStock: conversion.oldStock.toString(),
      newStock: updatedItem.currentStock.toString(),
      oldCostPrice: currentItem.costPrice.toString(),
      newCostPrice: updatedItem.costPrice.toString(),
      oldAverageCost: currentItem.averageCost.toString(),
      newAverageCost: updatedItem.averageCost.toString(),
      stockValue: updatedItem.stockValue.toString(),
      minimumStock: updatedItem.minimumStock.toString(),
      reorderPoint: updatedItem.reorderPoint.toString(),
    },
  });
  
  // Final validation
  console.log("\n=== CONVERSÃO DE UNIDADE COMPLETADA ===");
  console.log(`Artigo: ${updatedItem.name} (${updatedItem.sku})`);
  console.log(`Unidade: ${CONVERSION_DATA.fromUnit} → ${updatedItem.unit}`);
  console.log(`Stock: ${formatDecimal(conversion.oldStock)} ${CONVERSION_DATA.fromUnit} → ${formatDecimal(updatedItem.currentStock)} ${updatedItem.unit}`);
  console.log(`Preço: ${formatCurrency(currentItem.costPrice)}/${CONVERSION_DATA.fromUnit} → ${formatCurrency(updatedItem.costPrice)}/${updatedItem.unit}`);
  console.log(`Valor do stock: ${formatCurrency(conversion.oldStockValue)} → ${formatCurrency(updatedItem.stockValue)}`);
  console.log(`Thresholds: mín ${formatDecimal(updatedItem.minimumStock)}, reorder ${formatDecimal(updatedItem.reorderPoint)} ${updatedItem.unit}`);
  console.log("========================================\n");
}

main()
  .catch((error: unknown) => {
    logger.error("Failed to convert inventory unit", { error, referenceId: REFERENCE_ID });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });