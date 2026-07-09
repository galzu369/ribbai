import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logging";
import { 
  calculateConsumptionValue, 
  generateStockExitUpdateData,
  validateStockExitInputs,
  type StockExitCalculationInput 
} from "@/lib/inventory-cmp";

const REFERENCE_ID = "STOCK-OUT-2026-06-26-CMP-TEST";
const REFERENCE_TYPE = "CONSUMPTION";
const TRANSACTION_DATE = new Date("2026-06-26T17:00:00.000Z");
const CREATED_BY = "CMP-EXIT-TEST";
const REASON = "Teste do sistema CMP para saídas de stock";

type StockExitLine = {
  sku: string;
  quantity: Prisma.Decimal;
  unit: string;
  reason?: string;
  notes?: string;
};

// Test with items that have CMP values from our previous test
const STOCK_EXIT_LINES: StockExitLine[] = [
  {
    sku: "CONS-WC-TOILET-PAPER",
    quantity: new Prisma.Decimal("3"),
    unit: "pack",
    reason: "Consumo normal - teste CMP",
    notes: "Saída de 3 packs para testar cálculo de valor de consumo usando CMP.",
  },
  {
    sku: "CLEAN-LAVA-TUDO",
    quantity: new Prisma.Decimal("2"),
    unit: "unit",
    reason: "Utilização na limpeza - teste CMP",
    notes: "Consumo de produtos de limpeza com valorização CMP.",
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

async function processStockExitTest(): Promise<void> {
  logger.info("Starting stock-exit CMP test", {
    referenceId: REFERENCE_ID,
    transactionDate: TRANSACTION_DATE.toISOString(),
    totalLines: STOCK_EXIT_LINES.length,
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
      const revertedStock = item.currentStock.add(tx.quantity);
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

  const results: StockExitResult[] = [];

  for (const line of STOCK_EXIT_LINES) {
    logger.info("Processing stock-exit test line", { sku: line.sku });

    const item = await prisma.inventoryItem.findUnique({
      where: { sku: line.sku },
    });

    if (!item) {
      logger.error("Item not found", { sku: line.sku });
      throw new Error(`Item not found: ${line.sku}`);
    }

    if (item.currentStock.lt(line.quantity)) {
      logger.error("Insufficient stock", {
        sku: line.sku,
        available: item.currentStock.toString(),
        requested: line.quantity.toString(),
      });
      throw new Error(`Insufficient stock for ${line.sku}`);
    }

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

    validateStockExitInputs(exitInput);
    const exitResult = calculateConsumptionValue(exitInput);
    
    logger.info("Stock exit calculation - after", {
      sku: line.sku,
      newTotalQuantity: exitResult.newTotalQuantity.toString(),
      averageCost: exitResult.averageCost.toString(), // Should be unchanged
      consumptionValue: exitResult.consumptionValue.toString(),
      newStockValue: exitResult.newStockValue.toString(),
    });

    const exitUpdateData = generateStockExitUpdateData(exitResult);
    const finalUpdateData = {
      ...exitUpdateData,
      updatedBy: CREATED_BY,
    };

    const lineNotes = [
      `Teste CMP Exit - Consumo: ${formatDecimal(line.quantity)} ${line.unit}.`,
      `CMP: ${formatCurrency(currentAverageCost)} (mantido).`,
      `Stock: ${formatDecimal(previousStock)} → ${formatDecimal(exitResult.newTotalQuantity)}.`,
      `Valor consumido: ${formatCurrency(exitResult.consumptionValue)}.`,
      `Novo valor stock: ${formatCurrency(exitResult.newStockValue)}.`,
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
          type: "OUT",
          quantity: line.quantity,
          unit: line.unit,
          unitCost: currentAverageCost,
          totalCost: exitResult.consumptionValue,
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
      averageCost: exitResult.averageCost,
      consumptionValue: exitResult.consumptionValue,
      newStockValue: exitResult.newStockValue,
      cmpStatus: "CMP_CONSUMPTION_CALCULATED",
    });
  }

  const totalConsumptionValue = results.reduce((sum, row) => sum.add(row.consumptionValue), new Prisma.Decimal("0"));
  const totalNewStockValue = results.reduce((sum, row) => sum.add(row.newStockValue), new Prisma.Decimal("0"));

  logger.info("Stock-exit CMP test completed", {
    referenceId: REFERENCE_ID,
    linesProcessed: results.length,
    totalConsumptionValue: totalConsumptionValue.toString(),
    totalNewStockValue: totalNewStockValue.toString(),
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
  await processStockExitTest();
}

main()
  .catch((error: unknown) => {
    logger.error("Failed to process stock-exit CMP test", { error, referenceId: REFERENCE_ID });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });