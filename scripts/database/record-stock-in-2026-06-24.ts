import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logging";

const REFERENCE_ID = "STOCK-IN-2026-06-24-CONSUMABLES-DELIVERY";
const REFERENCE_TYPE = "SUPPLIER_DELIVERY";
const TRANSACTION_DATE = new Date("2026-06-24T12:00:00.000Z");
const CREATED_BY = "Bruno";
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
    sku: "CONS-WC-TOILET-PAPER",
    name: "Papel Higienico",
    category: "Consumiveis",
    subCategory: "Consumiveis WC",
    unit: "pack",
    quantity: new Prisma.Decimal("10"),
    unitCost: new Prisma.Decimal("14.60"),
    minimumStock: new Prisma.Decimal("4"),
    reorderPoint: new Prisma.Decimal("4"),
    notes: "Reposicao de stock de papel higienico para garantir cobertura operacional.",
  },
  {
    sku: "CONS-OPS-GLASS-TRASH-BAGS",
    name: "Sacos do Lixo Vidro",
    category: "Consumiveis",
    subCategory: "Consumiveis Operacionais",
    unit: "pack",
    quantity: new Prisma.Decimal("2"),
    unitCost: new Prisma.Decimal("14.10"),
    minimumStock: new Prisma.Decimal("1"),
    reorderPoint: new Prisma.Decimal("1"),
    notes: "Reposicao de stock de sacos de vidro (2 packs). Preco unitario considerado por pack.",
  },
  {
    sku: "CLEAN-GLASS-GLOW",
    name: "Glow Limpa Vidros",
    category: "Produtos de Limpeza",
    subCategory: "Produtos de Limpeza",
    unit: "unidade",
    quantity: new Prisma.Decimal("2"),
    unitCost: new Prisma.Decimal("3.99"),
    minimumStock: new Prisma.Decimal("1"),
    reorderPoint: new Prisma.Decimal("1"),
    notes: "Novo artigo de limpeza de vidros.",
  },
  {
    sku: "CLEAN-HYGIENIZER-FAST",
    name: "Higienizante Acao Rapida",
    category: "Produtos de Limpeza",
    subCategory: "Produtos de Limpeza",
    unit: "unidade",
    quantity: new Prisma.Decimal("2"),
    unitCost: new Prisma.Decimal("15.00"),
    minimumStock: new Prisma.Decimal("1"),
    reorderPoint: new Prisma.Decimal("1"),
    notes: "Novo higienizante de acao rapida.",
  },
  {
    sku: "CONS-OPS-FOOD-FILM",
    name: "Pelicula Alimentar",
    category: "Consumiveis",
    subCategory: "Consumiveis Operacionais",
    unit: "caixa",
    quantity: new Prisma.Decimal("4"),
    unitCost: new Prisma.Decimal("10.40"),
    minimumStock: new Prisma.Decimal("1"),
    reorderPoint: new Prisma.Decimal("1"),
    notes: "Cada caixa contem 3 rolos.",
  },
  {
    sku: "CLEAN-LAVA-TUDO",
    name: "Lava-Tudo",
    category: "Produtos de Limpeza",
    subCategory: "Produtos de Limpeza",
    unit: "unidade",
    quantity: new Prisma.Decimal("2"),
    unitCost: new Prisma.Decimal("8.14"),
    minimumStock: new Prisma.Decimal("1"),
    reorderPoint: new Prisma.Decimal("1"),
    notes: "Reposicao de stock de Lava-Tudo.",
  },
  {
    sku: "CONS-SERVICE-STRAWS",
    name: "Palhinhas",
    category: "Consumiveis",
    subCategory: "Consumiveis de Servico",
    unit: "saco",
    quantity: new Prisma.Decimal("35"),
    unitCost: new Prisma.Decimal("1.75"),
    minimumStock: new Prisma.Decimal("7"),
    reorderPoint: new Prisma.Decimal("7"),
    notes:
      "Conversao de unidade para sacos (1 caixa = 35 sacos). Stock anterior convertido internamente e entrada registada como 35 sacos.",
  },
  {
    sku: "CONS-TAKEAWAY-SPOONS",
    name: "Colheres Take Away",
    category: "Consumiveis",
    subCategory: "Talheres Take Away",
    unit: "saco",
    quantity: new Prisma.Decimal("3"),
    unitCost: new Prisma.Decimal("6.75"),
    minimumStock: new Prisma.Decimal("1"),
    reorderPoint: new Prisma.Decimal("1"),
  },
  {
    sku: "CONS-TAKEAWAY-FORKS-KNIVES",
    name: "Garfos e Facas Take Away",
    category: "Consumiveis",
    subCategory: "Talheres Take Away",
    unit: "saco",
    quantity: new Prisma.Decimal("3"),
    unitCost: new Prisma.Decimal("7.70"),
    minimumStock: new Prisma.Decimal("3"),
    reorderPoint: new Prisma.Decimal("3"),
  },
  {
    sku: "CONS-OPS-PRINTER-ROLLS",
    name: "Rolos Impressora",
    category: "Consumiveis",
    subCategory: "Consumiveis Operacionais",
    unit: "saco",
    quantity: new Prisma.Decimal("20"),
    unitCost: new Prisma.Decimal("7.93"),
    minimumStock: new Prisma.Decimal("10"),
    reorderPoint: new Prisma.Decimal("10"),
    notes:
      "Conversao de unidade para sacos (1 caixa = 5 sacos). Stock anterior convertido internamente e entrada registada como 20 sacos.",
  },
  {
    sku: "CONS-OPS-TNT-ROLLS",
    name: "Rolos TNT",
    category: "Consumiveis",
    subCategory: "Consumiveis Operacionais",
    unit: "pack",
    quantity: new Prisma.Decimal("1"),
    unitCost: new Prisma.Decimal("27.42"),
    minimumStock: new Prisma.Decimal("1"),
    reorderPoint: new Prisma.Decimal("1"),
    notes: "Cada pack contem 2 rolos (13,71 €/rolo; 27,42 €/pack).",
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
  },
  {
    sku: "CLEAN-MICROFIBER-YELLOW",
    name: "Panos Microfibra Amarelos",
    category: "Consumiveis",
    subCategory: "Consumiveis Operacionais",
    unit: "saco",
    quantity: new Prisma.Decimal("3"),
    unitCost: new Prisma.Decimal("3.70"),
    minimumStock: new Prisma.Decimal("1"),
    reorderPoint: new Prisma.Decimal("1"),
    notes: "Cada saco contem 6 panos.",
  },
  {
    sku: "CLEAN-MICROFIBER-GREY",
    name: "Panos Microfibra Cinzentos",
    category: "Consumiveis",
    subCategory: "Consumiveis Operacionais",
    unit: "saco",
    quantity: new Prisma.Decimal("3"),
    unitCost: new Prisma.Decimal("3.70"),
    minimumStock: new Prisma.Decimal("1"),
    reorderPoint: new Prisma.Decimal("1"),
    notes: "Cada saco contem 6 panos.",
  },
  {
    sku: "CLEAN-MICROFIBER-BLUE",
    name: "Panos Microfibra Azuis",
    category: "Consumiveis",
    subCategory: "Consumiveis Operacionais",
    unit: "saco",
    quantity: new Prisma.Decimal("3"),
    unitCost: new Prisma.Decimal("3.70"),
    minimumStock: new Prisma.Decimal("1"),
    reorderPoint: new Prisma.Decimal("1"),
    notes: "Cada saco contem 6 panos.",
  },
  {
    sku: "CLEAN-HAIRNETS",
    name: "Tocas",
    category: "Produtos de Limpeza",
    subCategory: "Produtos de Limpeza",
    unit: "saco",
    quantity: new Prisma.Decimal("3"),
    unitCost: new Prisma.Decimal("4.80"),
    minimumStock: new Prisma.Decimal("1"),
    reorderPoint: new Prisma.Decimal("1"),
  },
  {
    sku: "CLEAN-MASKS",
    name: "Mascaras",
    category: "Produtos de Limpeza",
    subCategory: "Produtos de Limpeza",
    unit: "caixa",
    quantity: new Prisma.Decimal("2"),
    unitCost: new Prisma.Decimal("2.50"),
    minimumStock: new Prisma.Decimal("1"),
    reorderPoint: new Prisma.Decimal("1"),
  },
  {
    sku: "CONS-WC-HAND-PAPER",
    name: "Papel de Maos WC",
    category: "Consumiveis",
    subCategory: "Consumiveis WC",
    unit: "caixa",
    quantity: new Prisma.Decimal("3"),
    unitCost: new Prisma.Decimal("14.00"),
    minimumStock: new Prisma.Decimal("1"),
    reorderPoint: new Prisma.Decimal("1"),
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

    let previousStock = new Prisma.Decimal(item.currentStock);

    if (line.sku === "CONS-SERVICE-STRAWS") {
      const conversionFactor = new Prisma.Decimal("35");
      previousStock = previousStock.mul(conversionFactor);
    }

    if (line.sku === "CONS-OPS-PRINTER-ROLLS") {
      const conversionFactor = new Prisma.Decimal("5");
      previousStock = previousStock.mul(conversionFactor);
    }

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

    const updateData: Record<string, unknown> = {
      currentStock: finalStock,
      unit: line.unit,
      costPrice: line.unitCost,
      updatedBy: CREATED_BY,
    };

    if (line.sku === "CONS-SERVICE-STRAWS") {
      updateData.minimumStock = new Prisma.Decimal("7");
      updateData.reorderPoint = new Prisma.Decimal("7");
    }

    if (line.sku === "CONS-OPS-PRINTER-ROLLS") {
      updateData.minimumStock = new Prisma.Decimal("10");
      updateData.reorderPoint = new Prisma.Decimal("10");
    }

    await prisma.$transaction([
      prisma.inventoryItem.update({
        where: { id: item.id },
        data: updateData,
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
          reason: "Entrada de stock de consumiveis (encomenda de 24-06-2026).",
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

