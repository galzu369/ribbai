import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logging";
import { normalizeInventoryUnit } from "@/lib/inventory-units";

const COUNTED_AT = new Date("2026-06-16T12:00:00.000Z");
const COUNTED_BY = "Filipe Catalao";
const CREATED_BY = "OPS-AUTOMATION";

const WEEK_NUMBER = 25;
const YEAR = 2026;
const WEEK_START_DATE = new Date("2026-06-15T00:00:00.000Z");
const WEEK_END_DATE = new Date("2026-06-21T00:00:00.000Z");

const REFERENCE_TYPE = "WEEKLY_COUNT";
const REFERENCE_ID = "WEEKLY-COUNT-2026-06-16";

const SUPPLIER_CODE = "CONSUMABLES-PENDING";

type CountLine = {
  sku: string;
  name: string;
  category: string;
  subCategory: string;
  unit: string;
  actualQuantity: Prisma.Decimal;
  notes?: string;
  minimumStock?: Prisma.Decimal;
  reorderPoint?: Prisma.Decimal;
  costPrice?: Prisma.Decimal;
};

const COUNT_LINES: CountLine[] = [
  // CONSUMIVEIS (Consumiveis de Servico)
  {
    sku: "CONS-SERVICE-NAPKINS",
    name: "Guardanapos",
    category: "Consumiveis",
    subCategory: "Consumiveis de Servico",
    unit: "caixa",
    actualQuantity: new Prisma.Decimal("1"),
  },
  {
    sku: "CONS-SERVICE-SMALL-NAPKINS",
    name: "Guardanapos Pequenos",
    category: "Consumiveis",
    subCategory: "Consumiveis de Servico",
    unit: "caixa",
    actualQuantity: new Prisma.Decimal("1"),
  },
  {
    sku: "CONS-SERVICE-STRAWS",
    name: "Palhinhas",
    category: "Consumiveis",
    subCategory: "Consumiveis de Servico",
    unit: "caixa",
    actualQuantity: new Prisma.Decimal("0.5"),
  },
  {
    sku: "CONS-SERVICE-TOOTHPICKS",
    name: "Palitos",
    category: "Consumiveis",
    subCategory: "Consumiveis de Servico",
    unit: "caixa",
    actualQuantity: new Prisma.Decimal("1"),
  },

  // CONSUMIVEIS (Consumiveis Operacionais)
  {
    sku: "CONS-OPS-TPA-ROLLS",
    name: "Rolos TPA",
    category: "Consumiveis",
    subCategory: "Consumiveis Operacionais",
    unit: "caixa",
    actualQuantity: new Prisma.Decimal("1.5"),
  },
  {
    sku: "CONS-OPS-PRINTER-ROLLS",
    name: "Rolos Impressora",
    category: "Consumiveis",
    subCategory: "Consumiveis Operacionais",
    unit: "caixa",
    actualQuantity: new Prisma.Decimal("2"),
  },
  {
    sku: "CONS-OPS-KITCHEN-ROLLS",
    name: "Rolos de Cozinha",
    category: "Consumiveis",
    subCategory: "Consumiveis Operacionais",
    unit: "pack",
    actualQuantity: new Prisma.Decimal("0"),
    notes:
      "Rutura total em contagem de 16-06-2026. Consumo muito elevado identificado nas ultimas semanas; chefia de sala implementara medidas de reducao e monitorizacao semanal.",
  },
  {
    sku: "CONS-OPS-TRASH-BAGS-120L",
    name: "Sacos do Lixo 120L",
    category: "Consumiveis",
    subCategory: "Consumiveis Operacionais",
    unit: "caixa",
    actualQuantity: new Prisma.Decimal("2"),
  },
  {
    sku: "CONS-OPS-GLASS-TRASH-BAGS",
    name: "Sacos do Lixo Vidro",
    category: "Consumiveis",
    subCategory: "Consumiveis Operacionais",
    unit: "pack",
    actualQuantity: new Prisma.Decimal("3"),
  },

  // CONSUMIVEIS (Consumiveis WC)
  {
    sku: "CONS-WC-TOILET-PAPER",
    name: "Papel Higienico",
    category: "Consumiveis",
    subCategory: "Consumiveis WC",
    unit: "pack",
    actualQuantity: new Prisma.Decimal("14"),
  },
  {
    sku: "CONS-WC-HAND-PAPER",
    name: "Papel de Maos WC",
    category: "Consumiveis",
    subCategory: "Consumiveis WC",
    unit: "caixa",
    actualQuantity: new Prisma.Decimal("1"),
  },

  // CONSUMIVEIS (Copos Take Away)
  {
    sku: "CONS-TAKEAWAY-SMALL-COFFEE-CUPS",
    name: "Copos Pequenos Cafe Take Away",
    category: "Consumiveis",
    subCategory: "Copos Take Away",
    unit: "caixa",
    actualQuantity: new Prisma.Decimal("1.5"),
  },
  {
    sku: "CONS-TAKEAWAY-MEDIUM-COFFEE-CUPS",
    name: "Copos Medios Cafe Take Away",
    category: "Consumiveis",
    subCategory: "Copos Take Away",
    unit: "saco",
    actualQuantity: new Prisma.Decimal("15"),
    notes: "Convertido de 0,75 caixas para 15 sacos (1 caixa = 20 sacos).",
  },
  {
    sku: "CONS-TAKEAWAY-MEDIUM-CUPS-LIDS",
    name: "Copos Medios Take Away + Tampas",
    category: "Consumiveis",
    subCategory: "Copos Take Away",
    unit: "caixa",
    actualQuantity: new Prisma.Decimal("0.8"),
  },
  {
    sku: "CONS-TAKEAWAY-SAUCE-CUPS",
    name: "Copos para Molhos Take Away",
    category: "Consumiveis",
    subCategory: "Copos Take Away",
    unit: "caixa",
    actualQuantity: new Prisma.Decimal("0.8"),
  },
  {
    sku: "CONS-DESSERT-MOUSSE-CUPS",
    name: "Copos para Mousse",
    category: "Consumiveis",
    subCategory: "Copos Take Away",
    unit: "unidade",
    actualQuantity: new Prisma.Decimal("100"),
    notes: "Convertido de 0,5 caixas para 100 unidades (1 caixa = 200 unidades).",
  },

  // CONSUMIVEIS (Embalagens Take Away)
  {
    sku: "CONS-TAKEAWAY-SOUP-BOX-LID",
    name: "Box de Sopas + Tampas",
    category: "Consumiveis",
    subCategory: "Embalagens Take Away",
    unit: "caixa",
    actualQuantity: new Prisma.Decimal("1.5"),
  },
  {
    sku: "CONS-TAKEAWAY-ROUND-BOX-LID",
    name: "Box POKE + tampas",
    category: "Consumiveis",
    subCategory: "Embalagens Take Away",
    unit: "caixa",
    actualQuantity: new Prisma.Decimal("3"),
  },
  {
    sku: "CONS-TAKEAWAY-BOX-750ML",
    name: "Box Pequena 750ml",
    category: "Consumiveis",
    subCategory: "Embalagens Take Away",
    unit: "caixa",
    actualQuantity: new Prisma.Decimal("1.5"),
    minimumStock: new Prisma.Decimal("1"),
    reorderPoint: new Prisma.Decimal("1"),
  },
  {
    sku: "CONS-TAKEAWAY-TOAST-BOX",
    name: "Box Media 1350",
    category: "Consumiveis",
    subCategory: "Embalagens Take Away",
    unit: "caixa",
    actualQuantity: new Prisma.Decimal("2"),
  },
  {
    sku: "CONS-TAKEAWAY-BURGER-BOX",
    name: "Box grande 1980ml",
    category: "Consumiveis",
    subCategory: "Embalagens Take Away",
    unit: "caixa",
    actualQuantity: new Prisma.Decimal("3"),
  },

  // CONSUMIVEIS (Molhos)
  {
    sku: "SAUCE-KETCHUP",
    name: "Ketchup",
    category: "Consumiveis",
    subCategory: "Molhos",
    unit: "caixa",
    actualQuantity: new Prisma.Decimal("3"),
  },
  {
    sku: "SAUCE-MAYONNAISE",
    name: "Maionese",
    category: "Consumiveis",
    subCategory: "Molhos",
    unit: "caixa",
    actualQuantity: new Prisma.Decimal("5"),
  },
  {
    sku: "SAUCE-MUSTARD",
    name: "Mostarda",
    category: "Consumiveis",
    subCategory: "Molhos",
    unit: "caixa",
    actualQuantity: new Prisma.Decimal("1"),
  },

  // PRODUTOS DE LIMPEZA
  {
    sku: "CLEAN-ANTIBACTERIAL-FOAM",
    name: "Espuma Antibacteriana",
    category: "Produtos de Limpeza",
    subCategory: "Produtos de Limpeza",
    unit: "unidade",
    actualQuantity: new Prisma.Decimal("3"),
  },
  {
    sku: "CLEAN-WC-ORANGE-SPRAY-IBT",
    name: "Spray Laranja WC IBT",
    category: "Produtos de Limpeza",
    subCategory: "Produtos de Limpeza",
    unit: "litro",
    actualQuantity: new Prisma.Decimal("2.5"),
  },
  {
    sku: "CLEAN-ALCOHOL",
    name: "Alcool",
    category: "Produtos de Limpeza",
    subCategory: "Produtos de Limpeza",
    unit: "unidade",
    actualQuantity: new Prisma.Decimal("0"),
  },
  {
    sku: "CLEAN-LAVA-TUDO",
    name: "Lava-Tudo",
    category: "Produtos de Limpeza",
    subCategory: "Produtos de Limpeza",
    unit: "unidade",
    actualQuantity: new Prisma.Decimal("6"),
  },
  {
    sku: "CLEAN-THOMIL",
    name: "Thomil",
    category: "Produtos de Limpeza",
    subCategory: "Produtos de Limpeza",
    unit: "unidade",
    actualQuantity: new Prisma.Decimal("2"),
  },
  {
    sku: "CLEAN-DISH-LEMON",
    name: "Dish Lemon",
    category: "Produtos de Limpeza",
    subCategory: "Produtos de Limpeza",
    unit: "unidade",
    actualQuantity: new Prisma.Decimal("4"),
    minimumStock: new Prisma.Decimal("1"),
    reorderPoint: new Prisma.Decimal("1"),
  },

  // TALHERES TAKE AWAY
  {
    sku: "CONS-TAKEAWAY-FORKS-KNIVES",
    name: "Garfos e Facas Take Away",
    category: "Consumiveis",
    subCategory: "Talheres Take Away",
    unit: "saco",
    actualQuantity: new Prisma.Decimal("6"),
  },
  {
    sku: "CONS-TAKEAWAY-SPOONS",
    name: "Colheres Take Away",
    category: "Consumiveis",
    subCategory: "Talheres Take Away",
    unit: "saco",
    actualQuantity: new Prisma.Decimal("2"),
  },
];

function decimal(value: Prisma.Decimal | string | number) {
  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(String(value));
}

function buildWeeklyNotes() {
  return [
    "Atualizacao de inventario semanal sem recalculo/estimativa: os valores registados representam contagem fisica oficial.",
    "Consumo muito elevado de Rolos de Cozinha identificado nas ultimas semanas; medidas: sensibilizacao da equipa, toalhas reutilizaveis, monitorizacao rigorosa semanal.",
  ].join(" ");
}

async function ensureSupplier() {
  return prisma.supplier.upsert({
    where: { code: SUPPLIER_CODE },
    update: { name: "Fornecedor de Consumiveis a Definir", status: "ACTIVE" },
    create: { code: SUPPLIER_CODE, name: "Fornecedor de Consumiveis a Definir", status: "ACTIVE" },
  });
}

function calculateVariancePercentage(systemQuantity: Prisma.Decimal, variance: Prisma.Decimal) {
  if (systemQuantity.isZero()) {
    return new Prisma.Decimal("0");
  }

  return variance.div(systemQuantity).mul(new Prisma.Decimal("100"));
}

function sanitizeReasonDelta(delta: Prisma.Decimal) {
  if (delta.isZero()) {
    return "Ajuste de inventario semanal (sem diferenca).";
  }

  return delta.greaterThan(0)
    ? "Ajuste de inventario semanal (entrada por contagem)."
    : "Ajuste de inventario semanal (saida por contagem).";
}

async function main() {
  const rawArgs = process.argv.slice(2);
  const force = rawArgs.includes("--force");

  const supplier = await ensureSupplier();

  const weeklyInventory = await prisma.weeklyInventory.upsert({
    where: {
      weekNumber_year: {
        weekNumber: WEEK_NUMBER,
        year: YEAR,
      },
    },
    update: {
      status: "SUBMITTED",
      totalItems: COUNT_LINES.length,
      submittedBy: COUNTED_BY,
      submittedAt: COUNTED_AT,
      updatedBy: CREATED_BY,
      notes: buildWeeklyNotes(),
    },
    create: {
      weekNumber: WEEK_NUMBER,
      year: YEAR,
      weekStartDate: WEEK_START_DATE,
      weekEndDate: WEEK_END_DATE,
      status: "SUBMITTED",
      totalItems: COUNT_LINES.length,
      totalValue: decimal("0"),
      variance: decimal("0"),
      submittedBy: COUNTED_BY,
      submittedAt: COUNTED_AT,
      createdBy: COUNTED_BY,
      notes: buildWeeklyNotes(),
    },
  });

  const existingTxCount = await prisma.inventoryTransaction.count({
    where: {
      referenceType: REFERENCE_TYPE,
      referenceId: REFERENCE_ID,
    },
  });

  if (existingTxCount > 0 && !force) {
    throw new Error(
      `Weekly inventory already recorded for ${REFERENCE_ID}. Re-run with --force to regenerate.`
    );
  }

  const baselineSystemQuantity = new Map<string, Prisma.Decimal>();
  if (existingTxCount > 0 && force) {
    const existingLines = await prisma.weeklyInventoryItem.findMany({
      where: {
        weeklyInventoryId: weeklyInventory.id,
      },
      select: {
        itemId: true,
        systemQuantity: true,
      },
    });

    for (const line of existingLines) {
      baselineSystemQuantity.set(line.itemId, decimal(line.systemQuantity));
    }
  }

  if (existingTxCount > 0 && force) {
    await prisma.inventoryTransaction.deleteMany({
      where: {
        referenceType: REFERENCE_TYPE,
        referenceId: REFERENCE_ID,
      },
    });

    await prisma.weeklyInventoryItem.deleteMany({
      where: {
        weeklyInventoryId: weeklyInventory.id,
      },
    });
  }

  const results: Array<{
    sku: string;
    name: string;
    unit: string;
    systemQuantity: Prisma.Decimal;
    actualQuantity: Prisma.Decimal;
    variance: Prisma.Decimal;
    isNewItem: boolean;
  }> = [];

  let totalValue = new Prisma.Decimal("0");
  let totalVarianceValue = new Prisma.Decimal("0");

  for (const line of COUNT_LINES) {
    const existingItem = await prisma.inventoryItem.findUnique({
      where: { sku: line.sku },
    });

    const item =
      existingItem ??
      (await prisma.inventoryItem.create({
        data: {
          sku: line.sku,
          name: line.name,
          category: line.category,
          subCategory: line.subCategory,
          supplierId: supplier.id,
          unit: line.unit,
          packageSize: null,
          costPrice: decimal(line.costPrice ?? "0"),
          currentStock: decimal("0"),
          minimumStock: decimal(line.minimumStock ?? "0"),
          reorderPoint: decimal(line.reorderPoint ?? "0"),
          status: "ACTIVE",
          createdBy: CREATED_BY,
          updatedBy: CREATED_BY,
        },
      }));

    if (existingItem && item.unit !== line.unit) {
      const normalizedExisting = normalizeInventoryUnit(item.unit);
      const normalizedLine = normalizeInventoryUnit(line.unit);
      if (normalizedExisting !== normalizedLine) {
        throw new Error(
          `Unit mismatch for SKU ${line.sku}. InventoryItem.unit=${item.unit} but count line unit=${line.unit}.`
        );
      }
    }

    const systemQuantity = baselineSystemQuantity.get(item.id) ?? decimal(item.currentStock);
    const actualQuantity = decimal(line.actualQuantity);
    const variance = actualQuantity.sub(systemQuantity);
    const varianceAbs = variance.abs();
    const unitCost = decimal(item.costPrice ?? "0");
    const lineTotalValue = unitCost.mul(actualQuantity);
    const lineVarianceValue = unitCost.mul(variance);

    totalValue = totalValue.add(lineTotalValue);
    totalVarianceValue = totalVarianceValue.add(lineVarianceValue);

    const operations: Prisma.PrismaPromise<unknown>[] = [
      prisma.inventoryItem.update({
        where: { id: item.id },
        data: {
          name: line.name,
          category: line.category,
          subCategory: line.subCategory,
          supplierId: supplier.id,
          currentStock: actualQuantity,
          status: "ACTIVE",
          updatedBy: CREATED_BY,
        },
      }),
      prisma.weeklyInventoryItem.upsert({
        where: {
          weeklyInventoryId_itemId: {
            weeklyInventoryId: weeklyInventory.id,
            itemId: item.id,
          },
        },
        update: {
          systemQuantity,
          actualQuantity,
          variance,
          variancePercentage: calculateVariancePercentage(systemQuantity, variance),
          unitCost,
          totalValue: lineTotalValue,
          varianceValue: lineVarianceValue,
          countedBy: COUNTED_BY,
          countedAt: COUNTED_AT,
          notes: line.notes ?? null,
        },
        create: {
          weeklyInventoryId: weeklyInventory.id,
          itemId: item.id,
          systemQuantity,
          actualQuantity,
          variance,
          variancePercentage: calculateVariancePercentage(systemQuantity, variance),
          unitCost,
          totalValue: lineTotalValue,
          varianceValue: lineVarianceValue,
          countedBy: COUNTED_BY,
          countedAt: COUNTED_AT,
          notes: line.notes ?? null,
        },
      }),
    ];

    if (!varianceAbs.isZero()) {
      operations.push(
        prisma.inventoryTransaction.create({
          data: {
            itemId: item.id,
            type: "ADJUSTMENT",
            quantity: varianceAbs,
            unit: item.unit,
            unitCost,
            totalCost: unitCost.mul(varianceAbs),
            referenceType: REFERENCE_TYPE,
            referenceId: REFERENCE_ID,
            supplierId: supplier.id,
            balanceAfter: actualQuantity,
            reason: sanitizeReasonDelta(variance),
            notes: `Contagem fisica oficial registada em 16-06-2026 por ${COUNTED_BY}.`,
            createdBy: CREATED_BY,
            transactionDate: COUNTED_AT,
          },
        })
      );
    }

    await prisma.$transaction(operations);

    results.push({
      sku: line.sku,
      name: line.name,
      unit: item.unit,
      systemQuantity,
      actualQuantity,
      variance,
      isNewItem: !existingItem,
    });
  }

  await prisma.weeklyInventory.update({
    where: { id: weeklyInventory.id },
    data: {
      totalValue,
      variance: totalVarianceValue,
      updatedBy: CREATED_BY,
    },
  });

  logger.info("Weekly inventory count recorded.", {
    referenceId: REFERENCE_ID,
    referenceType: REFERENCE_TYPE,
    countedAt: COUNTED_AT.toISOString(),
    weekNumber: WEEK_NUMBER,
    year: YEAR,
    items: results.length,
    newItems: results.filter((row) => row.isNewItem).length,
    itemsWithVariance: results.filter((row) => !row.variance.isZero()).length,
  });
}

main()
  .catch((error: unknown) => {
    logger.error("Failed to record weekly inventory count", { error, referenceId: REFERENCE_ID });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

