import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logging";

const REFERENCE_ID = "STOCK-IN-2026-06-23-NEW-ITEMS";
const REFERENCE_TYPE = "SUPPLIER_DELIVERY";
const TRANSACTION_DATE = new Date("2026-06-23T12:00:00.000Z");
const CREATED_BY = "Filipe Catalao";
const SUPPLIER_CODE = "CONSUMABLES-PENDING";

type StockInLine = {
  sku: string;
  name: string;
  category: string;
  subCategory: string;
  unit: string;
  quantity: Prisma.Decimal;
  unitCost: Prisma.Decimal;
  minimumStock: Prisma.Decimal;
  reorderPoint: Prisma.Decimal;
  notes?: string;
};

const STOCK_IN_LINES: StockInLine[] = [
  // Produtos de Limpeza
  {
    sku: "CLEAN-D-50",
    name: "D-50",
    category: "Produtos de Limpeza",
    subCategory: "Produtos de Limpeza",
    unit: "unidade",
    quantity: new Prisma.Decimal("3"),
    unitCost: new Prisma.Decimal("0"),
    minimumStock: new Prisma.Decimal("1"),
    reorderPoint: new Prisma.Decimal("1"),
    notes: "Entrada inicial de novo artigo (D-50).",
  },
  {
    sku: "CLEAN-SPLIT-LV-RINSE",
    name: "Abrilhantador/Secante SPLIT LV",
    category: "Produtos de Limpeza",
    subCategory: "Produtos de Limpeza",
    unit: "unidade",
    quantity: new Prisma.Decimal("3"),
    unitCost: new Prisma.Decimal("0"),
    minimumStock: new Prisma.Decimal("1"),
    reorderPoint: new Prisma.Decimal("1"),
    notes: "Entrada inicial de novo artigo (Abrilhantador/Secante SPLIT LV).",
  },
  {
    sku: "CLEAN-LAVA-LOUCAS",
    name: "Lava-Louças",
    category: "Produtos de Limpeza",
    subCategory: "Produtos de Limpeza",
    unit: "unidade",
    quantity: new Prisma.Decimal("3"),
    unitCost: new Prisma.Decimal("0"),
    minimumStock: new Prisma.Decimal("2"),
    reorderPoint: new Prisma.Decimal("2"),
    notes: "Entrada inicial de novo artigo (Lava-Louças).",
  },
  {
    sku: "CLEAN-LIXIVIA-FORTE",
    name: "Lixivia forte",
    category: "Produtos de Limpeza",
    subCategory: "Produtos de Limpeza",
    unit: "unidade",
    quantity: new Prisma.Decimal("1"),
    unitCost: new Prisma.Decimal("0"),
    minimumStock: new Prisma.Decimal("1"),
    reorderPoint: new Prisma.Decimal("1"),
    notes: "Entrada inicial de novo artigo (Lixivia forte).",
  },
  {
    sku: "CLEAN-GLOVES-S",
    name: "Luvas S",
    category: "Produtos de Limpeza",
    subCategory: "Produtos de Limpeza",
    unit: "caixa",
    quantity: new Prisma.Decimal("1"),
    unitCost: new Prisma.Decimal("0"),
    minimumStock: new Prisma.Decimal("0.5"),
    reorderPoint: new Prisma.Decimal("0.5"),
    notes: "Entrada inicial de novo artigo (Luvas S).",
  },
  {
    sku: "CLEAN-GLOVES-M",
    name: "Luvas M",
    category: "Produtos de Limpeza",
    subCategory: "Produtos de Limpeza",
    unit: "caixa",
    quantity: new Prisma.Decimal("2"),
    unitCost: new Prisma.Decimal("0"),
    minimumStock: new Prisma.Decimal("0.5"),
    reorderPoint: new Prisma.Decimal("0.5"),
    notes: "Entrada inicial de novo artigo (Luvas M).",
  },
  {
    sku: "CLEAN-GLOVES-L",
    name: "Luvas L",
    category: "Produtos de Limpeza",
    subCategory: "Produtos de Limpeza",
    unit: "caixa",
    quantity: new Prisma.Decimal("1"),
    unitCost: new Prisma.Decimal("0"),
    minimumStock: new Prisma.Decimal("0.5"),
    reorderPoint: new Prisma.Decimal("0.5"),
    notes: "Entrada inicial de novo artigo (Luvas L).",
  },
  {
    sku: "CLEAN-MASKS",
    name: "Mascaras",
    category: "Produtos de Limpeza",
    subCategory: "Produtos de Limpeza",
    unit: "caixa",
    quantity: new Prisma.Decimal("1"),
    unitCost: new Prisma.Decimal("0"),
    minimumStock: new Prisma.Decimal("1"),
    reorderPoint: new Prisma.Decimal("1"),
    notes: "Entrada inicial de novo artigo (Mascaras).",
  },
  {
    sku: "CLEAN-HAIRNETS",
    name: "Tocas",
    category: "Produtos de Limpeza",
    subCategory: "Produtos de Limpeza",
    unit: "saco",
    quantity: new Prisma.Decimal("1"),
    unitCost: new Prisma.Decimal("0"),
    minimumStock: new Prisma.Decimal("1"),
    reorderPoint: new Prisma.Decimal("1"),
    notes: "Entrada inicial de novo artigo (Tocas).",
  },

  // Consumiveis Operacionais
  {
    sku: "CONS-OPS-TNT-ROLLS",
    name: "Rolos TNT",
    category: "Consumiveis",
    subCategory: "Consumiveis Operacionais",
    unit: "pack",
    quantity: new Prisma.Decimal("1"),
    unitCost: new Prisma.Decimal("0"),
    minimumStock: new Prisma.Decimal("1"),
    reorderPoint: new Prisma.Decimal("1"),
    notes: "Entrada inicial de novo artigo (Rolos TNT).",
  },
  {
    sku: "CONS-OPS-BLUE-ROLL",
    name: "Rolo Azul",
    category: "Consumiveis",
    subCategory: "Consumiveis Operacionais",
    unit: "unidade",
    quantity: new Prisma.Decimal("2"),
    unitCost: new Prisma.Decimal("0"),
    minimumStock: new Prisma.Decimal("1"),
    reorderPoint: new Prisma.Decimal("1"),
    notes: "Entrada inicial de novo artigo (Rolo Azul).",
  },
];

function formatDecimal(value: Prisma.Decimal) {
  return Number(value).toLocaleString("pt-PT", { maximumFractionDigits: 3 });
}

function formatCurrency(value: Prisma.Decimal) {
  return Number(value).toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
}

async function ensureSupplier() {
  return prisma.supplier.upsert({
    where: { code: SUPPLIER_CODE },
    update: {
      name: "Fornecedor de Consumiveis a Definir",
      status: "ACTIVE",
    },
    create: {
      code: SUPPLIER_CODE,
      name: "Fornecedor de Consumiveis a Definir",
      status: "ACTIVE",
    },
  });
}

async function main() {
  const force = process.argv.includes("--force");
  const supplier = await ensureSupplier();
  const results: Array<{
    sku: string;
    name: string;
    previousStock: Prisma.Decimal;
    quantity: Prisma.Decimal;
    finalStock: Prisma.Decimal;
    totalCost: Prisma.Decimal;
  }> = [];

  if (force) {
    const existingTransactions = await prisma.inventoryTransaction.findMany({
      where: {
        referenceType: REFERENCE_TYPE,
        referenceId: REFERENCE_ID,
        type: "IN",
      },
      select: {
        id: true,
        itemId: true,
        quantity: true,
      },
    });

    for (const tx of existingTransactions) {
      await prisma.$transaction([
        prisma.inventoryItem.update({
          where: { id: tx.itemId },
          data: {
            currentStock: {
              decrement: tx.quantity,
            },
            updatedBy: CREATED_BY,
          },
        }),
        prisma.inventoryTransaction.delete({
          where: { id: tx.id },
        }),
      ]);
    }

    logger.info("Existing stock-in transactions reverted for force reapply.", {
      referenceId: REFERENCE_ID,
      revertedTransactions: existingTransactions.length,
    });
  }

  for (const line of STOCK_IN_LINES) {
    const item = await prisma.inventoryItem.upsert({
      where: { sku: line.sku },
      update: {
        name: line.name,
        category: line.category,
        subCategory: line.subCategory,
        supplierId: supplier.id,
        unit: line.unit,
        status: "ACTIVE",
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
        minimumStock: line.minimumStock,
        reorderPoint: line.reorderPoint,
        status: "ACTIVE",
        createdBy: CREATED_BY,
        updatedBy: CREATED_BY,
      },
    });

    const existing = await prisma.inventoryTransaction.findFirst({
      where: {
        itemId: item.id,
        type: "IN",
        referenceType: REFERENCE_TYPE,
        referenceId: REFERENCE_ID,
      },
      select: { id: true },
    });

    if (existing) {
      logger.warn("Stock-in already recorded; skipping line.", {
        referenceId: REFERENCE_ID,
        sku: line.sku,
        transactionId: existing.id,
      });
      continue;
    }

    const previousStock = new Prisma.Decimal(item.currentStock);
    const finalStock = previousStock.add(line.quantity);
    const totalCost = line.unitCost.mul(line.quantity);
    const lineNotes = [
      `Entrada em ${REFERENCE_ID}: ${formatDecimal(line.quantity)} ${line.unit} a ${formatCurrency(
        line.unitCost
      )}/${line.unit}.`,
      line.notes ?? "",
    ]
      .filter(Boolean)
      .join(" ");

    await prisma.$transaction([
      prisma.inventoryItem.update({
        where: { id: item.id },
        data: {
          currentStock: finalStock,
          unit: line.unit,
          costPrice: line.unitCost,
          updatedBy: CREATED_BY,
        },
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
          balanceAfter: finalStock,
          reason: "Entrada de stock de novos artigos (limpeza e consumiveis operacionais).",
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
      quantity: line.quantity,
      finalStock,
      totalCost,
    });
  }

  const totalCost = results.reduce((sum, row) => sum.add(row.totalCost), new Prisma.Decimal("0"));

  logger.info("Stock-in processed.", {
    referenceId: REFERENCE_ID,
    transactionDate: TRANSACTION_DATE.toISOString(),
    linesApplied: results.length,
    totalCost: totalCost.toString(),
    results: results.map((row) => ({
      sku: row.sku,
      name: row.name,
      previousStock: row.previousStock.toString(),
      quantity: row.quantity.toString(),
      finalStock: row.finalStock.toString(),
      totalCost: row.totalCost.toString(),
    })),
  });
}

main()
  .catch((error: unknown) => {
    logger.error("Failed to record stock-in entry", { error, referenceId: REFERENCE_ID });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

