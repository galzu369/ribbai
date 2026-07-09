import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logging";

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
  minimumStock: Prisma.Decimal;
  reorderPoint: Prisma.Decimal;
  notes?: string;
};

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
    },
    create: {
      code: SUPPLIER_CODE,
      name: "Fornecedor de Consumiveis a Definir",
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
          reason: "Entrada de stock completa - 3 de Julho 2026.",
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

  logger.info("Stock-in processed - 3 de Julho 2026.", {
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
    logger.error("Failed to record stock-in entry - 3 de Julho 2026", { error, referenceId: REFERENCE_ID });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });