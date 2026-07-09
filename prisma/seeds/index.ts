import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logging";

const CONSUMABLES_SUPPLIER_CODE = "CONSUMABLES-PENDING";

const INITIAL_CONSUMABLES_INVENTORY = {
  weekNumber: 23,
  year: 2026,
  weekStartDate: new Date("2026-06-01T00:00:00.000Z"),
  weekEndDate: new Date("2026-06-07T00:00:00.000Z"),
  countedAt: new Date("2026-06-03T12:00:00.000Z"),
  countedBy: "Filipe Catalao",
  sourceDocument:
    "docs/operational-records/2026/06-june/daily/2026-06-03-inventario-consumiveis.md",
  items: [
    {
      sku: "CONS-TAKEAWAY-SOUP-BOX-LID",
      name: "Box de Sopas + Tampas",
      category: "Consumiveis",
      subCategory: "Embalagens Take Away",
      unit: "caixa",
      actualQuantity: "1.5",
      minimumStock: "1",
      reorderPoint: "1",
    },
    {
      sku: "CONS-TAKEAWAY-ROUND-BOX-LID",
      name: "Box POKE + tampas",
      category: "Consumiveis",
      subCategory: "Embalagens Take Away",
      unit: "caixa",
      actualQuantity: "4",
      minimumStock: "1",
      reorderPoint: "1",
    },
    {
      sku: "CONS-TAKEAWAY-BURGER-BOX",
      name: "Box grande 1980ml",
      category: "Consumiveis",
      subCategory: "Embalagens Take Away",
      unit: "caixa",
      actualQuantity: "2",
      minimumStock: "1",
      reorderPoint: "1",
    },
    {
      sku: "CONS-TAKEAWAY-TOAST-BOX",
      name: "Box Média 1350",
      category: "Consumiveis",
      subCategory: "Embalagens Take Away",
      unit: "caixa",
      actualQuantity: "2",
      minimumStock: "1",
      reorderPoint: "1",
    },
    {
      sku: "CONS-SERVICE-NAPKINS",
      name: "Guardanapos",
      category: "Consumiveis",
      subCategory: "Consumiveis de Servico",
      unit: "caixa",
      actualQuantity: "4",
      minimumStock: "1",
      reorderPoint: "1",
    },
    {
      sku: "CONS-SERVICE-SMALL-NAPKINS",
      name: "Guardanapos Pequenos",
      category: "Consumiveis",
      subCategory: "Consumiveis de Servico",
      unit: "caixa",
      actualQuantity: "2",
      minimumStock: "1",
      reorderPoint: "1",
    },
    {
      sku: "CONS-SERVICE-STRAWS",
      name: "Palhinhas",
      category: "Consumiveis",
      subCategory: "Consumiveis de Servico",
      unit: "caixa",
      actualQuantity: "1",
      minimumStock: "0.2",
      reorderPoint: "0.2",
    },
    {
      sku: "CONS-TAKEAWAY-MEDIUM-CUPS-LIDS",
      name: "Copos Medios Take Away + Tampas",
      category: "Consumiveis",
      subCategory: "Copos Take Away",
      unit: "caixa",
      actualQuantity: "1",
      minimumStock: "0.2",
      reorderPoint: "0.2",
    },
    {
      sku: "CONS-TAKEAWAY-MEDIUM-COFFEE-CUPS",
      name: "Copos Medios Cafe Take Away",
      category: "Consumiveis",
      subCategory: "Copos Take Away",
      unit: "saco",
      actualQuantity: "20",
      minimumStock: "0.2",
      reorderPoint: "0.2",
      costPrice: "1.85",
    },
    {
      sku: "CONS-TAKEAWAY-SMALL-COFFEE-CUPS",
      name: "Copos Pequenos Cafe Take Away",
      category: "Consumiveis",
      subCategory: "Copos Take Away",
      unit: "caixa",
      actualQuantity: "1",
      minimumStock: "0.2",
      reorderPoint: "0.2",
    },
    {
      sku: "CONS-TAKEAWAY-SAUCE-CUPS",
      name: "Copos para Molhos Take Away",
      category: "Consumiveis",
      subCategory: "Copos Take Away",
      unit: "caixa",
      actualQuantity: "1",
      minimumStock: "0.2",
      reorderPoint: "0.2",
    },
    {
      sku: "CONS-DESSERT-MOUSSE-CUPS",
      name: "Copos para Mousse",
      category: "Consumiveis",
      subCategory: "Copos Take Away",
      unit: "unidade",
      actualQuantity: "200",
      minimumStock: "50",
      reorderPoint: "50",
    },
    {
      sku: "CONS-TAKEAWAY-FORKS-KNIVES",
      name: "Garfos e Facas Take Away",
      category: "Consumiveis",
      subCategory: "Talheres Take Away",
      unit: "saco",
      actualQuantity: "2",
      minimumStock: "1",
      reorderPoint: "1",
    },
    {
      sku: "CONS-TAKEAWAY-SPOONS",
      name: "Colheres Take Away",
      description: "4 sacos, aproximadamente 200 unidades.",
      category: "Consumiveis",
      subCategory: "Talheres Take Away",
      unit: "saco",
      packageSize: "50",
      actualQuantity: "4",
      minimumStock: "1",
      reorderPoint: "1",
    },
    {
      sku: "CONS-OPS-TPA-ROLLS",
      name: "Rolos TPA",
      category: "Consumiveis",
      subCategory: "Consumiveis Operacionais",
      unit: "caixa",
      actualQuantity: "2",
      minimumStock: "1",
      reorderPoint: "1",
    },
    {
      sku: "CONS-OPS-PRINTER-ROLLS",
      name: "Rolos Impressora",
      category: "Consumiveis",
      subCategory: "Consumiveis Operacionais",
      unit: "caixa",
      actualQuantity: "3",
      minimumStock: "2",
      reorderPoint: "2",
    },
    {
      sku: "CONS-OPS-KITCHEN-ROLLS",
      name: "Rolos de Cozinha",
      category: "Consumiveis",
      subCategory: "Consumiveis Operacionais",
      unit: "pack",
      actualQuantity: "8",
      minimumStock: "2",
      reorderPoint: "2",
    },
    {
      sku: "CONS-WC-HAND-PAPER",
      name: "Papel de Maos WC",
      category: "Consumiveis",
      subCategory: "Consumiveis WC",
      unit: "caixa",
      actualQuantity: "3.5",
      minimumStock: "1",
      reorderPoint: "1",
      costPrice: "14.00",
    },
    {
      sku: "CONS-WC-TOILET-PAPER",
      name: "Papel Higienico",
      category: "Consumiveis",
      subCategory: "Consumiveis WC",
      unit: "pack",
      actualQuantity: "16",
      minimumStock: "4",
      reorderPoint: "4",
      costPrice: "29.19",
    },
    {
      sku: "CLEAN-ANTIBACTERIAL-FOAM",
      name: "Espuma Antibacteriana",
      category: "Produtos de Limpeza",
      subCategory: "Produtos de Limpeza",
      unit: "unidade",
      actualQuantity: "6",
      minimumStock: "2",
      reorderPoint: "2",
      costPrice: "6.97",
    },
  ],
} as const;

function decimal(value: string) {
  return new Prisma.Decimal(value);
}

function getInitialCountNotes(itemName: string) {
  if (itemName === "Copos Medios Cafe Take Away") {
    return "Stock atualizado para sacos apos remessa inicial em caixa sair por defeito de fabrico.";
  }

  return "Contagem inicial de consumiveis.";
}

async function seedInitialConsumablesInventory() {
  const supplier = await prisma.supplier.upsert({
    where: { code: CONSUMABLES_SUPPLIER_CODE },
    update: {
      name: "Fornecedor de Consumiveis a Definir",
      status: "ACTIVE",
    },
    create: {
      code: CONSUMABLES_SUPPLIER_CODE,
      name: "Fornecedor de Consumiveis a Definir",
      status: "ACTIVE",
    },
  });

  const weeklyInventory = await prisma.weeklyInventory.upsert({
    where: {
      weekNumber_year: {
        weekNumber: INITIAL_CONSUMABLES_INVENTORY.weekNumber,
        year: INITIAL_CONSUMABLES_INVENTORY.year,
      },
    },
    update: {
      status: "SUBMITTED",
      totalItems: INITIAL_CONSUMABLES_INVENTORY.items.length,
      notes: `Contagem inicial de consumiveis importada de ${INITIAL_CONSUMABLES_INVENTORY.sourceDocument}. Estado geral bom; stock de Papel de Maos WC atualizado para 3,5 caixas; Copos Medios Cafe Take Away atualizados para 20 sacos apos substituicao da remessa inicial.`,
    },
    create: {
      weekNumber: INITIAL_CONSUMABLES_INVENTORY.weekNumber,
      year: INITIAL_CONSUMABLES_INVENTORY.year,
      weekStartDate: INITIAL_CONSUMABLES_INVENTORY.weekStartDate,
      weekEndDate: INITIAL_CONSUMABLES_INVENTORY.weekEndDate,
      status: "SUBMITTED",
      totalItems: INITIAL_CONSUMABLES_INVENTORY.items.length,
      totalValue: decimal("0"),
      variance: decimal("0"),
      submittedBy: INITIAL_CONSUMABLES_INVENTORY.countedBy,
      submittedAt: INITIAL_CONSUMABLES_INVENTORY.countedAt,
      createdBy: INITIAL_CONSUMABLES_INVENTORY.countedBy,
      notes: `Contagem inicial de consumiveis importada de ${INITIAL_CONSUMABLES_INVENTORY.sourceDocument}. Estado geral bom; stock de Papel de Maos WC atualizado para 3,5 caixas; Copos Medios Cafe Take Away atualizados para 20 sacos apos substituicao da remessa inicial.`,
    },
  });

  await prisma.inventoryTransaction.deleteMany({
    where: {
      referenceType: "INITIAL_CONSUMABLES_COUNT",
      referenceId: weeklyInventory.id,
    },
  });

  for (const inventoryItem of INITIAL_CONSUMABLES_INVENTORY.items) {
    const actualQuantity = decimal(inventoryItem.actualQuantity);
    const minimumStock = decimal(inventoryItem.minimumStock);
    const reorderPoint = decimal(inventoryItem.reorderPoint);
    const costPrice =
      "costPrice" in inventoryItem && inventoryItem.costPrice
        ? decimal(inventoryItem.costPrice)
        : decimal("0");
    const packageSize =
      "packageSize" in inventoryItem && inventoryItem.packageSize
        ? decimal(inventoryItem.packageSize)
        : null;

    const item = await prisma.inventoryItem.upsert({
      where: { sku: inventoryItem.sku },
      update: {
        name: inventoryItem.name,
        description: "description" in inventoryItem ? inventoryItem.description : null,
        category: inventoryItem.category,
        subCategory: inventoryItem.subCategory,
        supplierId: supplier.id,
        unit: inventoryItem.unit,
        packageSize,
        currentStock: actualQuantity,
        minimumStock,
        reorderPoint,
        costPrice,
        status: "ACTIVE",
      },
      create: {
        sku: inventoryItem.sku,
        name: inventoryItem.name,
        description: "description" in inventoryItem ? inventoryItem.description : null,
        category: inventoryItem.category,
        subCategory: inventoryItem.subCategory,
        supplierId: supplier.id,
        unit: inventoryItem.unit,
        packageSize,
        costPrice,
        currentStock: actualQuantity,
        minimumStock,
        reorderPoint,
        status: "ACTIVE",
      },
    });

    const unitCost = new Prisma.Decimal(item.costPrice);
    const totalValue = unitCost.mul(actualQuantity);

    await prisma.weeklyInventoryItem.upsert({
      where: {
        weeklyInventoryId_itemId: {
          weeklyInventoryId: weeklyInventory.id,
          itemId: item.id,
        },
      },
      update: {
        systemQuantity: actualQuantity,
        actualQuantity,
        variance: decimal("0"),
        variancePercentage: decimal("0"),
        unitCost,
        totalValue,
        varianceValue: decimal("0"),
        countedBy: INITIAL_CONSUMABLES_INVENTORY.countedBy,
        countedAt: INITIAL_CONSUMABLES_INVENTORY.countedAt,
        notes: getInitialCountNotes(inventoryItem.name),
      },
      create: {
        weeklyInventoryId: weeklyInventory.id,
        itemId: item.id,
        systemQuantity: actualQuantity,
        actualQuantity,
        variance: decimal("0"),
        variancePercentage: decimal("0"),
        unitCost,
        totalValue,
        varianceValue: decimal("0"),
        countedBy: INITIAL_CONSUMABLES_INVENTORY.countedBy,
        countedAt: INITIAL_CONSUMABLES_INVENTORY.countedAt,
        notes: getInitialCountNotes(inventoryItem.name),
      },
    });

    await prisma.inventoryTransaction.create({
      data: {
        itemId: item.id,
        type: "ADJUSTMENT",
        quantity: actualQuantity,
        unit: inventoryItem.unit,
        unitCost,
        totalCost: totalValue,
        referenceType: "INITIAL_CONSUMABLES_COUNT",
        referenceId: weeklyInventory.id,
        supplierId: supplier.id,
        balanceAfter: actualQuantity,
        reason: "Baseline inicial de inventario de consumiveis",
        notes: `Importado de ${INITIAL_CONSUMABLES_INVENTORY.sourceDocument}.`,
        createdBy: INITIAL_CONSUMABLES_INVENTORY.countedBy,
        transactionDate: INITIAL_CONSUMABLES_INVENTORY.countedAt,
      },
    });
  }
}

async function main() {
  await seedInitialConsumablesInventory();
  logger.info("Seed data completed.", {
    consumablesItems: INITIAL_CONSUMABLES_INVENTORY.items.length,
    inventoryDate: INITIAL_CONSUMABLES_INVENTORY.countedAt.toISOString(),
  });
}

main()
  .catch((error: unknown) => {
    logger.error("Database seed failed", { error });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
