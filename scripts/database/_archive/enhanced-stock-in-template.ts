import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logging";
import { 
  calculateCMPForStockEntry, 
  generateCMPUpdateData,
  validateCMPInputs,
  type CMPCalculationInput 
} from "@/lib/inventory-cmp";

// Helper function to format currency
function formatCurrency(amount: Prisma.Decimal): string {
  return `€${amount.toFixed(2)}`;
}

// Helper function to format decimal
function formatDecimal(amount: Prisma.Decimal): string {
  return amount.toFixed(3);
}

/**
 * Enhanced Stock-In Script Template with CMP Integration
 * 
 * This template demonstrates how to create stock-in scripts that automatically
 * calculate and update weighted-average cost (CMP) for inventory items.
 */

// Configuration - Update these for each stock-in operation
const REFERENCE_ID = "STOCK-IN-YYYY-MM-DD-DESCRIPTION"; // Update this
const REFERENCE_TYPE = "SUPPLIER_DELIVERY";
const TRANSACTION_DATE = new Date("2026-MM-DDTHH:mm:ss.000Z"); // Update this
const CREATED_BY = "SYSTEM"; // Update this
const SUPPLIER_CODE = "SUPPLIER-CODE"; // Update this

type StockInLine = {
  sku: string;
  name: string;
  category: string;
  subCategory: string;
  unit: string;
  quantity: Prisma.Decimal;
  unitCost: Prisma.Decimal;
  minimumStock?: Prisma.Decimal;
  reorderPoint?: Prisma.Decimal;
  notes?: string;
};

// Stock-in data - Update this array for each operation
// NOTE: Rolos Impressora (CONS-OPS-PRINTER-ROLLS) unit changed to "caixa" on 2026-07-01
const STOCK_IN_LINES: StockInLine[] = [
  {
    sku: "EXAMPLE-SKU",
    name: "Example Item",
    category: "Example Category",
    subCategory: "Example SubCategory",
    unit: "unit",
    quantity: new Prisma.Decimal("10"),
    unitCost: new Prisma.Decimal("5.50"),
    minimumStock: new Prisma.Decimal("2"),
    reorderPoint: new Prisma.Decimal("2"),
    notes: "Example stock entry",
  },
];

interface StockInResult {
  sku: string;
  name: string;
  previousStock: Prisma.Decimal;
  previousAverageCost: Prisma.Decimal;
  quantity: Prisma.Decimal;
  unitCost: Prisma.Decimal;
  finalStock: Prisma.Decimal;
  newAverageCost: Prisma.Decimal;
  entryValue: Prisma.Decimal;
  newStockValue: Prisma.Decimal;
  cmtStatus: string;
}

async function processEnhancedStockIn(): Promise<void> {
  logger.info("Starting enhanced stock-in processing with CMP integration", {
    referenceId: REFERENCE_ID,
    transactionDate: TRANSACTION_DATE.toISOString(),
    totalLines: STOCK_IN_LINES.length,
  });

  // Get or create supplier
  const supplier = await prisma.supplier.upsert({
    where: { code: SUPPLIER_CODE },
    update: { status: "ACTIVE" },
    create: {
      code: SUPPLIER_CODE,
      name: SUPPLIER_CODE,
      status: "ACTIVE",
      createdBy: CREATED_BY,
    },
  });

  logger.info("Supplier resolved", { supplierId: supplier.id, supplierCode: SUPPLIER_CODE });

  // Check for existing transactions and revert if needed (for reruns)
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
      // Revert the CMP calculation by recalculating without this entry
      const item = tx.item;
      const revertedStock = item.currentStock.sub(tx.quantity);
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

  const results: StockInResult[] = [];

  // Process each stock-in line with CMP calculations
  for (const line of STOCK_IN_LINES) {
    logger.info("Processing stock-in line", { sku: line.sku, name: line.name });

    // Upsert inventory item
    const item = await prisma.inventoryItem.upsert({
      where: { sku: line.sku },
      update: {
        name: line.name,
        category: line.category,
        subCategory: line.subCategory,
        supplierId: supplier.id,
        unit: line.unit,
        status: "ACTIVE",
        updatedBy: CREATED_BY,
      },
      create: {
        sku: line.sku,
        name: line.name,
        category: line.category,
        subCategory: line.subCategory,
        supplierId: supplier.id,
        unit: line.unit,
        costPrice: line.unitCost,
        currentStock: new Prisma.Decimal("0"),
        minimumStock: line.minimumStock ?? new Prisma.Decimal("1"),
        reorderPoint: line.reorderPoint ?? new Prisma.Decimal("1"),
        // Initialize CMP fields for new items
        averageCost: new Prisma.Decimal("0"),
        lastPurchaseCost: new Prisma.Decimal("0"),
        stockValue: new Prisma.Decimal("0"),
        status: "ACTIVE",
        createdBy: CREATED_BY,
        updatedBy: CREATED_BY,
      },
    });

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

    // Prepare CMP calculation
    const previousStock = item.currentStock;
    const previousAverageCost = item.averageCost;
    
    const cmpInput: CMPCalculationInput = {
      currentStock: previousStock,
      currentAverageCost: previousAverageCost,
      incomingQuantity: line.quantity,
      incomingUnitCost: line.unitCost,
    };

    // Validate inputs
    validateCMPInputs(cmpInput);

    // Calculate new CMP values
    const cmpResult = calculateCMPForStockEntry(cmpInput);
    
    // Generate update data
    const cmpUpdateData = generateCMPUpdateData(
      cmpResult,
      line.unitCost, // lastPurchaseCost
      TRANSACTION_DATE // lastPurchaseDate
    );

    // Additional item-specific update data
    const additionalUpdateData: Record<string, unknown> = {
      costPrice: line.unitCost, // Update current cost price
      updatedBy: CREATED_BY,
    };

    // Add minimum stock and reorder point if provided
    if (line.minimumStock !== undefined) {
      additionalUpdateData.minimumStock = line.minimumStock;
    }
    if (line.reorderPoint !== undefined) {
      additionalUpdateData.reorderPoint = line.reorderPoint;
    }

    // Merge update data
    const finalUpdateData = { ...cmpUpdateData, ...additionalUpdateData };

    // Prepare transaction notes
    const totalCost = cmpResult.entryValue;
    const lineNotes = [
      `Entrada CMP em ${REFERENCE_ID}: ${formatDecimal(line.quantity)} ${line.unit} a ${formatCurrency(line.unitCost)}/${line.unit}.`,
      `CMP anterior: ${formatCurrency(previousAverageCost)} → CMP novo: ${formatCurrency(cmpResult.newAverageCost)}.`,
      `Valor entrada: ${formatCurrency(cmpResult.entryValue)} | Valor stock final: ${formatCurrency(cmpResult.newStockValue)}.`,
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
          type: "IN",
          quantity: line.quantity,
          unit: line.unit,
          unitCost: line.unitCost,
          totalCost,
          referenceType: REFERENCE_TYPE,
          referenceId: REFERENCE_ID,
          supplierId: supplier.id,
          balanceAfter: cmpResult.newTotalQuantity,
          reason: "Entrada de stock com cálculo CMP automático.",
          notes: lineNotes,
          createdBy: CREATED_BY,
          transactionDate: TRANSACTION_DATE,
        },
      }),
    ]);

    results.push({
      sku: line.sku,
      name: line.name,
      previousStock,
      previousAverageCost,
      quantity: line.quantity,
      unitCost: line.unitCost,
      finalStock: cmpResult.newTotalQuantity,
      newAverageCost: cmpResult.newAverageCost,
      entryValue: cmpResult.entryValue,
      newStockValue: cmpResult.newStockValue,
      cmtStatus: "CMP_CALCULATED",
    });

    logger.info("Stock-in line processed with CMP", {
      sku: line.sku,
      previousStock: previousStock.toString(),
      previousAverageCost: previousAverageCost.toString(),
      finalStock: cmpResult.newTotalQuantity.toString(),
      newAverageCost: cmpResult.newAverageCost.toString(),
      entryValue: cmpResult.entryValue.toString(),
      newStockValue: cmpResult.newStockValue.toString(),
    });
  }

  // Log summary
  const totalEntryValue = results.reduce((sum, row) => sum.add(row.entryValue), new Prisma.Decimal("0"));
  const totalNewStockValue = results.reduce((sum, row) => sum.add(row.newStockValue), new Prisma.Decimal("0"));

  logger.info("Enhanced stock-in processing completed", {
    referenceId: REFERENCE_ID,
    transactionDate: TRANSACTION_DATE.toISOString(),
    linesProcessed: results.length,
    totalEntryValue: totalEntryValue.toString(),
    totalNewStockValue: totalNewStockValue.toString(),
    cmpStatus: "ALL_CALCULATED",
    results: results.map((row) => ({
      sku: row.sku,
      name: row.name,
      previousStock: row.previousStock.toString(),
      previousCMP: row.previousAverageCost.toString(),
      quantity: row.quantity.toString(),
      unitCost: row.unitCost.toString(),
      finalStock: row.finalStock.toString(),
      newCMP: row.newAverageCost.toString(),
      entryValue: row.entryValue.toString(),
      newStockValue: row.newStockValue.toString(),
    })),
  });
}

async function main(): Promise<void> {
  await processEnhancedStockIn();
}

// Template usage instructions (remove in actual implementations)
console.log("=====================================");
console.log("ENHANCED STOCK-IN TEMPLATE WITH CMP");
console.log("=====================================");
console.log("Before using this template:");
console.log("1. Update REFERENCE_ID with unique identifier");
console.log("2. Update TRANSACTION_DATE with actual date");
console.log("3. Update CREATED_BY with actual user");
console.log("4. Update SUPPLIER_CODE with actual supplier");
console.log("5. Replace STOCK_IN_LINES with actual data");
console.log("6. Remove these console.log statements");
console.log("=====================================");

main()
  .catch((error: unknown) => {
    logger.error("Failed to process enhanced stock-in", { error, referenceId: REFERENCE_ID });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });