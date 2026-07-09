import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logging";
import { 
  calculateCMPForStockEntry, 
  generateCMPUpdateData,
  validateCMPInputs,
  type CMPCalculationInput 
} from "@/lib/inventory-cmp";

const REFERENCE_ID = "STOCK-IN-2026-06-26-CMP-TEST";
const REFERENCE_TYPE = "SUPPLIER_DELIVERY";
const TRANSACTION_DATE = new Date("2026-06-26T16:00:00.000Z");
const CREATED_BY = "CMP-SYSTEM-TEST";
const SUPPLIER_CODE = "CMP-TEST-SUPPLIER";

function formatCurrency(amount: Prisma.Decimal): string {
  return `€${amount.toFixed(2)}`;
}

function formatDecimal(amount: Prisma.Decimal): string {
  return amount.toFixed(3);
}

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

// Test with existing items to see CMP calculation in action
const STOCK_IN_LINES: StockInLine[] = [
  {
    sku: "CONS-WC-TOILET-PAPER",
    name: "Papel Higienico",
    category: "Consumiveis",
    subCategory: "Consumiveis WC",
    unit: "pack",
    quantity: new Prisma.Decimal("5"),
    unitCost: new Prisma.Decimal("15.00"), // Different price to test CMP calculation
    notes: "Teste do sistema CMP - entrada com preço diferente para validar cálculo da média ponderada.",
  },
  {
    sku: "CLEAN-LAVA-TUDO",
    name: "Lava-Tudo",
    category: "Limpeza",
    subCategory: "Produtos de Limpeza",
    unit: "unit",
    quantity: new Prisma.Decimal("3"),
    unitCost: new Prisma.Decimal("9.00"), // Different price to test CMP
    notes: "Teste CMP - produto de limpeza com novo preço unitário.",
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
  cmpStatus: string;
}

async function processEnhancedStockIn(): Promise<void> {
  logger.info("Starting CMP test stock-in processing", {
    referenceId: REFERENCE_ID,
    transactionDate: TRANSACTION_DATE.toISOString(),
    totalLines: STOCK_IN_LINES.length,
  });

  const supplier = await prisma.supplier.upsert({
    where: { code: SUPPLIER_CODE },
    update: { status: "ACTIVE" },
    create: {
      code: SUPPLIER_CODE,
      name: "CMP Test Supplier",
      status: "ACTIVE",
      createdBy: CREATED_BY,
    },
  });

  // Revert existing transactions if any
  const existingTransactions = await prisma.inventoryTransaction.findMany({
    where: {
      referenceId: REFERENCE_ID,
      referenceType: REFERENCE_TYPE,
    },
    include: { item: true },
  });

  if (existingTransactions.length > 0) {
    logger.info("Reverting existing transactions", { count: existingTransactions.length });

    for (const tx of existingTransactions) {
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
  }

  const results: StockInResult[] = [];

  for (const line of STOCK_IN_LINES) {
    logger.info("Processing CMP test line", { sku: line.sku });

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
        minimumStock: new Prisma.Decimal("1"),
        reorderPoint: new Prisma.Decimal("1"),
        averageCost: new Prisma.Decimal("0"),
        lastPurchaseCost: new Prisma.Decimal("0"),
        stockValue: new Prisma.Decimal("0"),
        status: "ACTIVE",
        createdBy: CREATED_BY,
        updatedBy: CREATED_BY,
      },
    });

    const previousStock = item.currentStock;
    const previousAverageCost = item.averageCost;
    const previousStockValue = item.stockValue;
    
    logger.info("CMP calculation - before", {
      sku: line.sku,
      previousStock: previousStock.toString(),
      previousAverageCost: previousAverageCost.toString(),
      previousStockValue: previousStockValue.toString(),
      incomingQuantity: line.quantity.toString(),
      incomingUnitCost: line.unitCost.toString(),
    });

    const cmpInput: CMPCalculationInput = {
      currentStock: previousStock,
      currentAverageCost: previousAverageCost,
      incomingQuantity: line.quantity,
      incomingUnitCost: line.unitCost,
    };

    validateCMPInputs(cmpInput);
    const cmpResult = calculateCMPForStockEntry(cmpInput);
    
    logger.info("CMP calculation - after", {
      sku: line.sku,
      newTotalQuantity: cmpResult.newTotalQuantity.toString(),
      newAverageCost: cmpResult.newAverageCost.toString(),
      newStockValue: cmpResult.newStockValue.toString(),
      entryValue: cmpResult.entryValue.toString(),
    });

    const cmpUpdateData = generateCMPUpdateData(
      cmpResult,
      line.unitCost,
      TRANSACTION_DATE
    );

    const finalUpdateData = {
      ...cmpUpdateData,
      costPrice: line.unitCost,
      updatedBy: CREATED_BY,
    };

    const totalCost = cmpResult.entryValue;
    const lineNotes = [
      `Teste CMP - Entrada: ${formatDecimal(line.quantity)} ${line.unit} a ${formatCurrency(line.unitCost)}/${line.unit}.`,
      `CMP: ${formatCurrency(previousAverageCost)} → ${formatCurrency(cmpResult.newAverageCost)}.`,
      `Stock: ${formatDecimal(previousStock)} → ${formatDecimal(cmpResult.newTotalQuantity)}.`,
      `Valor: ${formatCurrency(previousStockValue)} → ${formatCurrency(cmpResult.newStockValue)}.`,
      line.notes ?? "",
    ]
      .filter(Boolean)
      .join(" ");

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
          reason: "Teste do sistema CMP - entrada com cálculo automático de custo médio ponderado.",
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
      cmpStatus: "CMP_CALCULATED",
    });
  }

  const totalEntryValue = results.reduce((sum, row) => sum.add(row.entryValue), new Prisma.Decimal("0"));
  const totalNewStockValue = results.reduce((sum, row) => sum.add(row.newStockValue), new Prisma.Decimal("0"));

  logger.info("CMP test stock-in completed", {
    referenceId: REFERENCE_ID,
    linesProcessed: results.length,
    totalEntryValue: totalEntryValue.toString(),
    totalNewStockValue: totalNewStockValue.toString(),
    results: results.map((row) => ({
      sku: row.sku,
      name: row.name,
      stockChange: `${row.previousStock.toString()} → ${row.finalStock.toString()}`,
      cmpChange: `${formatCurrency(row.previousAverageCost)} → ${formatCurrency(row.newAverageCost)}`,
      entryValue: formatCurrency(row.entryValue),
      newStockValue: formatCurrency(row.newStockValue),
    })),
  });
}

async function main(): Promise<void> {
  await processEnhancedStockIn();
}

main()
  .catch((error: unknown) => {
    logger.error("Failed to process CMP test stock-in", { error, referenceId: REFERENCE_ID });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });