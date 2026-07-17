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
  // Use raw SQL to avoid enum issues
  const existing = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM suppliers WHERE code = ${SUPPLIER_CODE}
  `;

  if (existing.length > 0) {
    await prisma.$executeRaw`
      UPDATE suppliers 
      SET name = ${`Fornecedor de Consumiveis a Definir`}, "updatedAt" = NOW()
      WHERE code = ${SUPPLIER_CODE}
    `;
    return { id: existing[0].id };
  } else {
    const result = await prisma.$queryRaw<Array<{ id: string }>>`
      INSERT INTO suppliers (id, code, name, "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), ${SUPPLIER_CODE}, ${'Fornecedor de Consumiveis a Definir'}, NOW(), NOW())
      RETURNING id
    `;
    return { id: result[0].id };
  }
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
    const existingTransactions = await prisma.$queryRaw<Array<{ id: string; itemId: string; quantity: string }>>`
      SELECT id, "itemId", quantity::text 
      FROM inventory_transactions 
      WHERE "referenceType" = ${REFERENCE_TYPE} 
        AND "referenceId" = ${REFERENCE_ID} 
        AND type = 'IN'
    `;

    for (const tx of existingTransactions) {
      await prisma.$executeRaw`
        UPDATE inventory_items 
        SET "currentStock" = "currentStock" - ${tx.quantity}::DECIMAL, 
            "updatedBy" = ${CREATED_BY}
        WHERE id = ${tx.itemId}
      `;

      await prisma.$executeRaw`
        DELETE FROM inventory_transactions WHERE id = ${tx.id}
      `;
    }

    logger.info("Existing stock-in transactions reverted for force reapply.", {
      referenceId: REFERENCE_ID,
      revertedTransactions: existingTransactions.length,
    });
  }

  for (const line of STOCK_IN_LINES) {
    // Check if item exists
    const existingItems = await prisma.$queryRaw<Array<{ 
      id: string; 
      currentStock: string; 
    }>>`
      SELECT id, "currentStock"::text FROM inventory_items WHERE sku = ${line.sku}
    `;

    let itemId: string;
    let previousStock: Prisma.Decimal;

    if (existingItems.length > 0) {
      // Update existing item
      itemId = existingItems[0].id;
      previousStock = new Prisma.Decimal(existingItems[0].currentStock);

      await prisma.$executeRaw`
        UPDATE inventory_items 
        SET name = ${line.name},
            category = ${line.category},
            "subCategory" = ${line.subCategory},
            "supplierId" = ${supplier.id},
            unit = ${line.unit},
            "updatedAt" = NOW()
        WHERE id = ${itemId}
      `;
    } else {
      // Create new item using raw SQL
      const newItems = await prisma.$queryRaw<Array<{ id: string }>>`
        INSERT INTO inventory_items (
          id, sku, name, category, "subCategory", "supplierId", unit, 
          "costPrice", "currentStock", "minimumStock", "reorderPoint",
          "createdBy", "updatedBy", "createdAt", "updatedAt",
          "averageCost", "lastPurchaseCost", "stockValue"
        ) VALUES (
          gen_random_uuid(), ${line.sku}, ${line.name}, ${line.category}, 
          ${line.subCategory}, ${supplier.id}, ${line.unit},
          ${line.unitCost.toString()}::NUMERIC, 0, ${line.minimumStock.toString()}::NUMERIC, 
          ${line.reorderPoint.toString()}::NUMERIC, ${CREATED_BY}, ${CREATED_BY}, 
          NOW(), NOW(), 0, 0, 0
        ) RETURNING id
      `;
      itemId = newItems[0].id;
      previousStock = new Prisma.Decimal("0");
    }

    // Check for existing transaction
    const existingTransactions = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM inventory_transactions 
      WHERE "itemId" = ${itemId} 
        AND type = 'IN' 
        AND "referenceType" = ${REFERENCE_TYPE} 
        AND "referenceId" = ${REFERENCE_ID}
    `;

    if (existingTransactions.length > 0) {
      logger.warn("Stock-in already recorded; skipping line.", {
        referenceId: REFERENCE_ID,
        sku: line.sku,
        transactionId: existingTransactions[0].id,
      });
      continue;
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

    // Update stock and create transaction using raw SQL
    await prisma.$executeRaw`
      UPDATE inventory_items 
      SET "currentStock" = ${finalStock.toString()}::DECIMAL,
          unit = ${line.unit},
          "costPrice" = ${line.unitCost.toString()}::DECIMAL,
          "updatedBy" = ${CREATED_BY}
      WHERE id = ${itemId}
    `;

    await prisma.$executeRaw`
      INSERT INTO inventory_transactions (
        id, "itemId", type, quantity, unit, "unitCost", "totalCost",
        "referenceType", "referenceId", "supplierId", "balanceAfter",
        reason, notes, "createdBy", "transactionDate", "createdAt"
      ) VALUES (
        gen_random_uuid(), ${itemId}, 'IN', ${line.quantity.toString()}::DECIMAL, 
        ${line.unit}, ${line.unitCost.toString()}::DECIMAL, ${totalCost.toString()}::DECIMAL,
        ${REFERENCE_TYPE}, ${REFERENCE_ID}, ${supplier.id}, ${finalStock.toString()}::DECIMAL,
        ${'Entrada de stock completa - 3 de Julho 2026.'}, ${lineNotes}, 
        ${CREATED_BY}, ${TRANSACTION_DATE.toISOString()}::TIMESTAMP, NOW()
      )
    `;

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