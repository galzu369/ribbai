import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logging";
import { 
  calculateConsumptionValue, 
  generateStockExitUpdateData,
  validateStockExitInputs,
  type StockExitCalculationInput 
} from "@/lib/inventory-cmp";

/**
 * Enhanced Stock Exit Script Template with CMP Integration
 * 
 * This template handles stock exits (consumption, wastage, transfers) using
 * the current weighted-average cost for financial valuation.
 */

// Configuration - Update these for each stock-exit operation
const REFERENCE_ID = "STOCK-OUT-YYYY-MM-DD-DESCRIPTION"; // Update this
const REFERENCE_TYPE = "CONSUMPTION"; // CONSUMPTION, WASTAGE, TRANSFER, ADJUSTMENT
const TRANSACTION_DATE = new Date("2026-MM-DDTHH:mm:ss.000Z"); // Update this
const CREATED_BY = "SYSTEM"; // Update this
const REASON = "Stock consumption/wastage/transfer"; // Update this

type StockExitLine = {
  sku: string;
  quantity: Prisma.Decimal;
  unit: string;
  reason?: string;
  notes?: string;
};

// Stock-exit data - Update this array for each operation
// NOTE: Rolos Impressora (CONS-OPS-PRINTER-ROLLS) unit changed to "caixa" on 2026-07-01
const STOCK_EXIT_LINES: StockExitLine[] = [
  {
    sku: "EXAMPLE-SKU",
    quantity: new Prisma.Decimal("2"),
    unit: "unit",
    reason: "Consumption during service",
    notes: "Example stock exit",
  },
];

function formatCurrency(amount: Prisma.Decimal): string {
  return `€${amount.toFixed(2)}`;
}

function formatDecimal(amount: Prisma.Decimal): string {
  return amount.toFixed(3);
}

interface StockExitResult {
  sku: string;
  name: string;
  previousStock: Prisma.Decimal;
  exitQuantity: Prisma.Decimal;
  finalStock: Prisma.Decimal;
  averageCost: Prisma.Decimal;
  consumptionValue: Prisma.Decimal;
  newStockValue: Prisma.Decimal;
  cmpStatus: string;
}

async function processEnhancedStockExit(): Promise<void> {
  logger.info("Starting enhanced stock-exit processing with CMP integration", {
    referenceId: REFERENCE_ID,
    transactionDate: TRANSACTION_DATE.toISOString(),
    totalLines: STOCK_EXIT_LINES.length,
    transactionType: REFERENCE_TYPE,
  });

  // Check for existing transactions (for reruns)
  const existingTransactions = await prisma.inventoryTransaction.findMany({
    where: {
      referenceId: REFERENCE_ID,
      referenceType: REFERENCE_TYPE,
    },
    include: { item: true },
  });

  if (existingTransactions.length > 0) {
    logger.info("Found existing transactions - reverting for reapplication", {
      referenceId: REFERENCE_ID,
      transactionCount: existingTransactions.length,
    });

    for (const tx of existingTransactions) {
      const item = tx.item;
      const revertedStock = item.currentStock.add(tx.quantity); // Add back for exits
      const revertedStockValue = revertedStock.mul(item.averageCost);
      
      await prisma.inventoryItem.update({
        where: { id: item.id },
        data: {
          currentStock: revertedStock,
          stockValue: revertedStockValue,
        },
      });

      await prisma.inventoryTransaction.delete({
        where: { id: tx.id },
      });
    }

    logger.info("Existing transactions reverted successfully", {
      referenceId: REFERENCE_ID,
      revertedCount: existingTransactions.length,
    });
  }

  const results: StockExitResult[] = [];

  // Process each stock-exit line with CMP calculations
  for (const line of STOCK_EXIT_LINES) {
    logger.info("Processing stock-exit line", { sku: line.sku });

    // Get inventory item
    const item = await prisma.inventoryItem.findUnique({
      where: { sku: line.sku },
    });

    if (!item) {
      logger.error("Inventory item not found", { sku: line.sku });
      throw new Error(`Inventory item not found: ${line.sku}`);
    }

    // Skip if already processed
    const existingTransaction = await prisma.inventoryTransaction.findFirst({
      where: {
        itemId: item.id,
        referenceId: REFERENCE_ID,
        referenceType: REFERENCE_TYPE,
      },
    });

    if (existingTransaction) {
      logger.warn("Transaction already exists - skipping", {
        sku: line.sku,
        transactionId: existingTransaction.id,
      });
      continue;
    }

    // Validate stock availability
    if (item.currentStock.lt(line.quantity)) {
      logger.error("Insufficient stock for exit", {
        sku: line.sku,
        currentStock: item.currentStock.toString(),
        requestedQuantity: line.quantity.toString(),
      });
      throw new Error(`Insufficient stock for ${line.sku}: available ${item.currentStock}, requested ${line.quantity}`);
    }

    // Prepare stock exit calculation
    const previousStock = item.currentStock;
    const currentAverageCost = item.averageCost;
    const previousStockValue = item.stockValue;
    
    logger.info("Stock exit calculation - before", {
      sku: line.sku,
      previousStock: previousStock.toString(),
      currentAverageCost: currentAverageCost.toString(),
      previousStockValue: previousStockValue.toString(),
      exitQuantity: line.quantity.toString(),
    });

    const exitInput: StockExitCalculationInput = {
      currentStock: previousStock,
      currentAverageCost: currentAverageCost,
      exitQuantity: line.quantity,
    };

    // Validate inputs
    validateStockExitInputs(exitInput);

    // Calculate consumption value and new stock value
    const exitResult = calculateConsumptionValue(exitInput);
    
    logger.info("Stock exit calculation - after", {
      sku: line.sku,
      newTotalQuantity: exitResult.newTotalQuantity.toString(),
      averageCost: exitResult.averageCost.toString(), // Same as before
      consumptionValue: exitResult.consumptionValue.toString(),
      newStockValue: exitResult.newStockValue.toString(),
    });

    // Generate update data (averageCost remains unchanged for exits)
    const exitUpdateData = generateStockExitUpdateData(exitResult);
    
    const finalUpdateData = {
      ...exitUpdateData,
      updatedBy: CREATED_BY,
    };

    // Prepare transaction notes
    const lineNotes = [
      `Saída CMP - ${REFERENCE_TYPE}: ${formatDecimal(line.quantity)} ${line.unit}.`,
      `CMP: ${formatCurrency(currentAverageCost)} (inalterado para saídas).`,
      `Stock: ${formatDecimal(previousStock)} → ${formatDecimal(exitResult.newTotalQuantity)}.`,
      `Valor consumo: ${formatCurrency(exitResult.consumptionValue)}.`,
      `Valor stock: ${formatCurrency(previousStockValue)} → ${formatCurrency(exitResult.newStockValue)}.`,
      line.reason ?? "",
      line.notes ?? "",
    ]
      .filter(Boolean)
      .join(" ");

    // Execute transaction
    await prisma.$transaction([
      prisma.inventoryItem.update({
        where: { id: item.id },
        data: finalUpdateData,
      }),
      prisma.inventoryTransaction.create({
        data: {
          itemId: item.id,
          type: REFERENCE_TYPE === "CONSUMPTION" ? "OUT" : REFERENCE_TYPE,
          quantity: line.quantity,
          unit: line.unit,
          unitCost: currentAverageCost, // Use current CMP as unit cost for exits
          totalCost: exitResult.consumptionValue, // Total consumption value
          referenceType: REFERENCE_TYPE,
          referenceId: REFERENCE_ID,
          balanceAfter: exitResult.newTotalQuantity,
          reason: REASON,
          notes: lineNotes,
          createdBy: CREATED_BY,
          transactionDate: TRANSACTION_DATE,
        },
      }),
    ]);

    results.push({
      sku: line.sku,
      name: item.name,
      previousStock,
      exitQuantity: line.quantity,
      finalStock: exitResult.newTotalQuantity,
      averageCost: exitResult.averageCost, // Unchanged
      consumptionValue: exitResult.consumptionValue,
      newStockValue: exitResult.newStockValue,
      cmpStatus: "CMP_CONSUMPTION_CALCULATED",
    });

    logger.info("Stock-exit line processed with CMP", {
      sku: line.sku,
      previousStock: previousStock.toString(),
      finalStock: exitResult.newTotalQuantity.toString(),
      averageCost: exitResult.averageCost.toString(),
      consumptionValue: exitResult.consumptionValue.toString(),
      newStockValue: exitResult.newStockValue.toString(),
    });
  }

  // Log summary
  const totalConsumptionValue = results.reduce((sum, row) => sum.add(row.consumptionValue), new Prisma.Decimal("0"));
  const totalNewStockValue = results.reduce((sum, row) => sum.add(row.newStockValue), new Prisma.Decimal("0"));

  logger.info("Enhanced stock-exit processing completed", {
    referenceId: REFERENCE_ID,
    transactionDate: TRANSACTION_DATE.toISOString(),
    linesProcessed: results.length,
    totalConsumptionValue: totalConsumptionValue.toString(),
    totalNewStockValue: totalNewStockValue.toString(),
    cmpStatus: "ALL_CONSUMPTION_CALCULATED",
    results: results.map((row) => ({
      sku: row.sku,
      name: row.name,
      stockChange: `${row.previousStock.toString()} → ${row.finalStock.toString()}`,
      averageCost: formatCurrency(row.averageCost),
      consumptionValue: formatCurrency(row.consumptionValue),
      newStockValue: formatCurrency(row.newStockValue),
    })),
  });
}

async function main(): Promise<void> {
  await processEnhancedStockExit();
}

// Template usage instructions (remove in actual implementations)
console.log("======================================");
console.log("ENHANCED STOCK-EXIT TEMPLATE WITH CMP");
console.log("======================================");
console.log("Before using this template:");
console.log("1. Update REFERENCE_ID with unique identifier");
console.log("2. Update REFERENCE_TYPE (CONSUMPTION, WASTAGE, TRANSFER, ADJUSTMENT)");
console.log("3. Update TRANSACTION_DATE with actual date");
console.log("4. Update CREATED_BY with actual user");
console.log("5. Update REASON with operation description");
console.log("6. Replace STOCK_EXIT_LINES with actual data");
console.log("7. Remove these console.log statements");
console.log("======================================");

main()
  .catch((error: unknown) => {
    logger.error("Failed to process enhanced stock-exit", { error, referenceId: REFERENCE_ID });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });