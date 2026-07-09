import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DATE_STR = "2026-07-03";
const REFERENCE_ID = "STOCK-IN-2026-07-03-CONSUMABLES-DELIVERY";
const CREATED_BY = "OPS-STOCK-ENTRY-BACKFILL-2026-07-03";

// Entradas documentadas em 2026-07-03-inventory-entry-record.md
// Quantidades e precos unitarios (quando conhecidos)
const ENTRIES = [
  {
    sku: "CONS-OPS-KITCHEN-ROLLS",
    quantity: 10,
    unitCost: 10.5,
    description: "Rolo de Cozinha",
  },
  {
    sku: "CONS-SERVICE-NAPKINS-LARGE",
    quantity: 2,
    unitCost: 48.69,
    description: "Guardanapos (grandes)",
  },
  {
    sku: "CLEAN-DISH-LEMON",
    quantity: 8,
    unitCost: 5.24,
    description: "Dish Lemon",
  },
  {
    sku: "CONS-SERVICE-NAPKINS-SMALL",
    quantity: 2,
    unitCost: 23.08,
    description: "Guardanapos Pequenos",
  },
  {
    sku: "CONS-OPS-LABEL-ROLLS",
    quantity: 2,
    unitCost: 10.5,
    description: "Rolos de Etiquetas",
  },
  {
    sku: "CLEAN-LAVA-TUDO",
    quantity: 4,
    unitCost: 2.55,
    description: "Lava-Tudo",
  },
  {
    sku: "CLEAN-DISH-UNIVERSAL",
    quantity: 1,
    unitCost: 36.61,
    description: "Lava-Louça Universal",
  },
  {
    sku: "CLEAN-SPLIT-LV-RINSE",
    quantity: 2,
    // Preco corrigido para 17,58 €/unid. (ajuste posterior)
    unitCost: 17.58,
    description: "Abrilhantador/Secante SPLIT LV",
  },
  {
    sku: "CLEAN-SPONGE-INOX",
    quantity: 2,
    unitCost: 8.47,
    description: "Esfregao INOX",
  },
  {
    sku: "CLEAN-SPONGE-REGULAR",
    quantity: 2,
    unitCost: 2.2,
    description: "Esfregao",
  },
  {
    sku: "CONS-TAKEAWAY-MEDIUM-COFFEE-CUPS",
    quantity: 20,
    unitCost: 1.85,
    description: "Copos Medios Cafe Take Away",
  },
  {
    sku: "CONS-TAKEAWAY-CUPS-MEDIUM",
    quantity: 20,
    unitCost: 5.7,
    description: "Copos Medios Take Away + Tampas",
  },
  {
    sku: "CLEAN-THOMIL",
    quantity: 4,
    unitCost: 6.31,
    description: "Thomil",
  },
  {
    sku: "CLEAN-D-50",
    quantity: 4,
    unitCost: 17.58,
    description: "D-50",
  },
  {
    sku: "CLEAN-ANTIBACTERIAL-FOAM",
    quantity: 12,
    unitCost: 6.51,
    description: "Espuma Antibacteriana",
  },
];

async function main() {
  const transactionDate = new Date(`${DATE_STR}T12:00:00.000Z`);
  const dayStart = new Date(`${DATE_STR}T00:00:00.000Z`);
  const dayEnd = new Date(`${DATE_STR}T23:59:59.999Z`);

  console.log("=== RIBBAI · Backfill de entradas IN de 03-07-2026 ===");
  console.log(`Referencia: ${REFERENCE_ID}`);
  console.log("");

  for (const entry of ENTRIES) {
    const item = await prisma.inventoryItem.findUnique({
      where: { sku: entry.sku },
    });

    if (!item) {
      console.warn(
        `⚠ SKU ${entry.sku} (${entry.description}) nao encontrado em inventory_items. A saltar.`
      );
      continue;
    }

    const existingCount = await prisma.inventoryTransaction.count({
      where: {
        itemId: item.id,
        type: "IN",
        referenceId: REFERENCE_ID,
        transactionDate: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
    });

    if (existingCount > 0) {
      console.log(
        `⏭  Entrada IN ja existente para ${entry.sku} em ${DATE_STR} (ref=${REFERENCE_ID}). Nao criar duplicado.`
      );
      continue;
    }

    const unitCost = entry.unitCost ?? null;
    const totalCost =
      unitCost != null ? Number(unitCost) * Number(entry.quantity) : null;

    await prisma.inventoryTransaction.create({
      data: {
        itemId: item.id,
        type: "IN",
        quantity: entry.quantity,
        unit: item.unit,
        unitCost,
        totalCost,
        referenceType: "SUPPLIER_DELIVERY",
        referenceId: REFERENCE_ID,
        balanceAfter: item.currentStock, // NAO alteramos o stock atual
        reason: `Backfill de entrada de stock de fornecedor (documento 2026-07-03) para ${entry.description}.`,
        createdBy: CREATED_BY,
        transactionDate,
      },
    });

    console.log(
      `✔ Criada transacao IN de backfill para ${entry.sku}: +${entry.quantity} ${item.unit} a ${unitCost ?? "N/D"} €/unid.`
    );
  }
}

main()
  .catch((error) => {
    console.error("❌ Erro no backfill de entradas de 03-07-2026:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

