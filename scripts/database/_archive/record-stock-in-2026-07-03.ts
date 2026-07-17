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
 * Stock-In Script - 3 de Julho 2026
 * 
 * Entrada de stock completa com 15 produtos seguindo o workflow RIBBAI
 * de receção de mercadoria com cálculos CMP automáticos.
 */

// Configuration
const REFERENCE_ID = "STOCK-IN-2026-07-03-CONSUMABLES-DELIVERY";
const REFERENCE_TYPE = "SUPPLIER_DELIVERY";
const TRANSACTION_DATE = new Date("2026-07-03T10:00:00.000Z");
const CREATED_BY = "SYSTEM";
const SUPPLIER_CODE = "CONSUMABLES-PENDING";

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

// Stock-in data - Entrada de 3 de Julho 2026
const STOCK_IN_LINES: StockInLine[] = [
  {
    sku: "CONS-OPS-KITCHEN-ROLLS",
    name: "Rolo de Cozinha",
    category: "Consumiveis",
    subCategory: "Consumiveis Operacionais",
    unit: "pack",
    quantity: new Prisma.Decimal("10"),
    unitCost: new Prisma.Decimal("10.50"),
    minimumStock: new Prisma.Decimal("3"),
    reorderPoint: new Prisma.Decimal("3"),
    notes: "Reposição de stock - rolos de cozinha para operações diárias.",
  },
  {
    sku: "CONS-SERVICE-NAPKINS-LARGE",
    name: "Guardanapos",
    category: "Consumiveis",
    subCategory: "Consumiveis de Servico",
    unit: "caixa",
    quantity: new Prisma.Decimal("2"),
    unitCost: new Prisma.Decimal("48.69"),
    minimumStock: new Prisma.Decimal("1"),
    reorderPoint: new Prisma.Decimal("1"),
    notes: "Guardanapos grandes para serviço ao cliente.",
  },
  {
    sku: "CLEAN-DISH-LEMON",
    name: "Dish Lemon",
    category: "Produtos de Limpeza",
    subCategory: "Produtos de Limpeza",
    unit: "unidade",
    quantity: new Prisma.Decimal("8"),
    unitCost: new Prisma.Decimal("5.24"),
    minimumStock: new Prisma.Decimal("2"),
    reorderPoint: new Prisma.Decimal("2"),
    notes: "Detergente para louça com fragrância de limão.",
  },
  {
    sku: "CONS-SERVICE-NAPKINS-SMALL",
    name: "Guardanapos Pequenos",
    category: "Consumiveis",
    subCategory: "Consumiveis de Servico",
    unit: "caixa",
    quantity: new Prisma.Decimal("2"),
    unitCost: new Prisma.Decimal("23.08"),
    minimumStock: new Prisma.Decimal("1"),
    reorderPoint: new Prisma.Decimal("1"),
    notes: "Guardanapos pequenos para serviço ao cliente.",
  },
  {
    sku: "CONS-OPS-LABEL-ROLLS",
    name: "Rolos de Etiquetas",
    category: "Consumiveis",
    subCategory: "Consumiveis Operacionais",
    unit: "pack",
    quantity: new Prisma.Decimal("2"),
    unitCost: new Prisma.Decimal("10.50"),
    minimumStock: new Prisma.Decimal("1"),
    reorderPoint: new Prisma.Decimal("1"),
    notes: "Pack de etiquetas - cada pack contém 3 rolos (6 rolos total).",
  },
  {
    sku: "CLEAN-LAVA-TUDO",
    name: "Lava-Tudo",
    category: "Produtos de Limpeza",
    subCategory: "Produtos de Limpeza",
    unit: "unidade",
    quantity: new Prisma.Decimal("4"),
    unitCost: new Prisma.Decimal("2.55"),
    minimumStock: new Prisma.Decimal("1"),
    reorderPoint: new Prisma.Decimal("1"),
    notes: "Produto de limpeza multiuso.",
  },
  {
    sku: "CLEAN-DISH-UNIVERSAL",
    name: "Lava-Louça Universal",
    category: "Produtos de Limpeza",
    subCategory: "Produtos de Limpeza",
    unit: "unidade",
    quantity: new Prisma.Decimal("1"),
    unitCost: new Prisma.Decimal("36.61"),
    minimumStock: new Prisma.Decimal("1"),
    reorderPoint: new Prisma.Decimal("1"),
    notes: "Detergente universal para lava-louças.",
  },
  {
    sku: "CLEAN-SPLIT-LV-RINSE",
    name: "Abrilhantador/Secante SPLIT LV",
    category: "Produtos de Limpeza",
    subCategory: "Produtos de Limpeza",
    unit: "unidade",
    quantity: new Prisma.Decimal("2"),
    unitCost: new Prisma.Decimal("12.62"),
    minimumStock: new Prisma.Decimal("1"),
    reorderPoint: new Prisma.Decimal("1"),
    notes: "Produto de limpeza Split LV.",
  },
  {
    sku: "CLEAN-SPONGE-INOX",
    name: "Esfregão INOX",
    category: "Consumiveis",
    subCategory: "Consumiveis Operacionais",
    unit: "pack",
    quantity: new Prisma.Decimal("2"),
    unitCost: new Prisma.Decimal("8.47"),
    minimumStock: new Prisma.Decimal("1"),
    reorderPoint: new Prisma.Decimal("1"),
    notes: "Esfregões INOX - cada pack contém 10 unidades (20 total).",
  },
  {
    sku: "CLEAN-SPONGE-REGULAR",
    name: "Esfregão",
    category: "Consumiveis",
    subCategory: "Consumiveis Operacionais",
    unit: "pack",
    quantity: new Prisma.Decimal("2"),
    unitCost: new Prisma.Decimal("2.20"),
    minimumStock: new Prisma.Decimal("1"),
    reorderPoint: new Prisma.Decimal("1"),
    notes: "Esfregões regulares para limpeza geral.",
  },
  {
    sku: "CONS-TAKEAWAY-CUPS-SMALL",
    name: "Copos Pequenos Take Away + Tampas",
    category: "Consumiveis",
    subCategory: "Embalagens Take Away",
    unit: "saco",
    quantity: new Prisma.Decimal("20"),
    unitCost: new Prisma.Decimal("1.85"),
    minimumStock: new Prisma.Decimal("5"),
    reorderPoint: new Prisma.Decimal("5"),
    notes: "Copos pequenos take away com tampas incluídas.",
  },
  {
    sku: "CONS-TAKEAWAY-CUPS-MEDIUM",
    name: "Copos Médios Take Away + Tampas",
    category: "Consumiveis",
    subCategory: "Embalagens Take Away",
    unit: "saco",
    quantity: new Prisma.Decimal("20"),
    unitCost: new Prisma.Decimal("5.70"),
    minimumStock: new Prisma.Decimal("5"),
    reorderPoint: new Prisma.Decimal("5"),
    notes: "Copos médios take away com tampas incluídas.",
  },
  {
    sku: "CLEAN-THOMIL",
    name: "Thomil",
    category: "Produtos de Limpeza",
    subCategory: "Produtos de Limpeza",
    unit: "unidade",
    quantity: new Prisma.Decimal("4"),
    unitCost: new Prisma.Decimal("6.31"),
    minimumStock: new Prisma.Decimal("1"),
    reorderPoint: new Prisma.Decimal("1"),
    notes: "Produto de limpeza profissional Thomil.",
  },
  {
    sku: "CLEAN-D50",
    name: "D-50",
    category: "Produtos de Limpeza",
    subCategory: "Produtos de Limpeza",
    unit: "unidade",
    quantity: new Prisma.Decimal("4"),
    unitCost: new Prisma.Decimal("17.58"),
    minimumStock: new Prisma.Decimal("1"),
    reorderPoint: new Prisma.Decimal("1"),
    notes: "Produto de limpeza industrial D-50.",
  },
  {
    sku: "CLEAN-ANTIBACTERIAL-FOAM",
    name: "Espuma Antibacteriana",
    category: "Produtos de Limpeza",
    subCategory: "Produtos de Limpeza",
    unit: "unidade",
    quantity: new Prisma.Decimal("12"),
    unitCost: new Prisma.Decimal("6.51"),
    minimumStock: new Prisma.Decimal("3"),
    reorderPoint: new Prisma.Decimal("3"),
    notes: "Espuma antibacteriana para higienização.",
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
  logger.info("Starting enhanced stock-in processing - 3 de Julho 2026", {
    referenceId: REFERENCE_ID,
    transactionDate: TRANSACTION_DATE.toISOString(),
    totalLines: STOCK_IN_LINES.length,
  });

  // Get or create supplier
  const supplier = await prisma.supplier.upsert({
    where: { code: SUPPLIER_CODE },
    update: {},
    create: {
      code: SUPPLIER_CODE,
      name: "Fornecedor de Consumiveis a Definir",
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
    select: {
      id: true,
      quantity: true,
      item: true,
    },
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
          reason: "Entrada de stock completa - 3 de Julho 2026 com cálculo CMP automático.",
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

  logger.info("Enhanced stock-in processing completed - 3 de Julho 2026", {
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

// Execute stock-in entry
main()
  .catch((error: unknown) => {
    logger.error("Failed to process enhanced stock-in - 3 de Julho 2026", { error, referenceId: REFERENCE_ID });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });