import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const SKU = "CONS-TAKEAWAY-MEDIUM-COFFEE-CUPS";
const FACTOR = new Prisma.Decimal(20); // 1 caixa = 20 sacos
const NEW_UNIT = "caixa";
const TARGET_STOCK = new Prisma.Decimal("0.2");
const NEW_UNIT_COST = new Prisma.Decimal("37"); // 1.85 × 20
const NEW_MIN_STOCK = new Prisma.Decimal("0.2");
const NEW_REORDER = new Prisma.Decimal("0.2");
const UPDATED_BY = "OPS-CONVERT-MEDIUM-COFFEE-CUPS-SACOS-TO-CAIXAS";

const dryRun = process.argv.includes("--dry-run");

function toCaixas(value) {
  return new Prisma.Decimal(value).div(FACTOR);
}

function mulFactor(value) {
  return new Prisma.Decimal(value).mul(FACTOR);
}

async function main() {
  console.log("=== RIBBAI - Copos Medios Cafe Take Away (sacos → caixas) ===");
  console.log(`Modo: ${dryRun ? "DRY-RUN" : "APLICAR"}`);
  console.log(`Stock final alvo: ${TARGET_STOCK} caixas`);
  console.log("");

  const item = await prisma.inventoryItem.findUnique({ where: { sku: SKU } });
  if (!item) throw new Error(`Artigo não encontrado: ${SKU}`);

  const transactions = await prisma.inventoryTransaction.findMany({
    where: { itemId: item.id },
    orderBy: [{ transactionDate: "asc" }, { createdAt: "asc" }],
  });

  const weeklyItems = await prisma.weeklyInventoryItem.findMany({
    where: { itemId: item.id },
    include: { weeklyInventory: true },
    orderBy: { countedAt: "asc" },
  });

  const txUpdates = transactions.map((tx) => {
    const isJune30 = tx.referenceId === "WEEKLY-COUNT-2026-06-30";
    const newQty = isJune30
      ? new Prisma.Decimal("0.2") // ajuste de 0.4 → 0.2 caixas
      : toCaixas(tx.quantity);
    const newBalance = isJune30 ? TARGET_STOCK : toCaixas(tx.balanceAfter);
    const newUnitCost = Number(tx.unitCost) > 0 ? mulFactor(tx.unitCost) : tx.unitCost;

    return {
      id: tx.id,
      referenceId: tx.referenceId,
      before: {
        quantity: tx.quantity.toString(),
        balanceAfter: tx.balanceAfter.toString(),
        unit: tx.unit,
      },
      after: {
        quantity: newQty.toString(),
        balanceAfter: newBalance.toString(),
        unit: NEW_UNIT,
        unitCost: newUnitCost.toString(),
        totalCost: tx.totalCost.toString(),
      },
    };
  });

  const weeklyUpdates = weeklyItems.map((wi) => {
    const isJune30 = wi.weeklyInventory.weekNumber === 26 && wi.weeklyInventory.year === 2026;
    const newSystem = toCaixas(wi.systemQuantity);
    const newActual = isJune30 ? TARGET_STOCK : toCaixas(wi.actualQuantity);
    const newVariance = new Prisma.Decimal(newSystem).sub(newActual);
    const newUnitCost = Number(wi.unitCost) > 0 ? NEW_UNIT_COST : wi.unitCost;
    const newTotalValue = newActual.mul(newUnitCost);
    const newVarianceValue = newVariance.mul(newUnitCost);

    return {
      id: wi.id,
      week: `${wi.weeklyInventory.weekNumber}/${wi.weeklyInventory.year}`,
      before: {
        system: wi.systemQuantity.toString(),
        actual: wi.actualQuantity.toString(),
      },
      after: {
        systemQuantity: newSystem.toString(),
        actualQuantity: newActual.toString(),
        variance: newVariance.toString(),
        unitCost: newUnitCost.toString(),
        totalValue: newTotalValue.toString(),
        varianceValue: newVarianceValue.toString(),
      },
    };
  });

  const newStockValue = TARGET_STOCK.mul(NEW_UNIT_COST);

  console.log("📦 Artigo:");
  console.log(`   Stock: ${item.currentStock} ${item.unit} → ${TARGET_STOCK} ${NEW_UNIT}`);
  console.log(`   Custo: ${item.costPrice} → ${NEW_UNIT_COST} €/caixa`);
  console.log(`   Reorder: ${item.reorderPoint} (mantido em caixas)`);
  console.log("");

  console.log(`📝 Transações: ${txUpdates.length}`);
  for (const u of txUpdates) {
    console.log(
      `   • ${u.referenceId}: qty ${u.before.quantity} → ${u.after.quantity}, balance ${u.before.balanceAfter} → ${u.after.balanceAfter}`
    );
  }
  console.log("");

  console.log(`📋 Contagens semanais: ${weeklyUpdates.length}`);
  for (const u of weeklyUpdates) {
    console.log(
      `   • Semana ${u.week}: actual ${u.before.actual} → ${u.after.actualQuantity} caixa`
    );
  }
  console.log("");

  if (dryRun) {
    console.log("✅ DRY-RUN concluído.");
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const update of txUpdates) {
      await tx.inventoryTransaction.update({
        where: { id: update.id },
        data: update.after,
      });
    }

    for (const update of weeklyUpdates) {
      await tx.weeklyInventoryItem.update({
        where: { id: update.id },
        data: {
          systemQuantity: update.after.systemQuantity,
          actualQuantity: update.after.actualQuantity,
          variance: update.after.variance,
          unitCost: update.after.unitCost,
          totalValue: update.after.totalValue,
          varianceValue: update.after.varianceValue,
        },
      });
    }

    await tx.inventoryItem.update({
      where: { id: item.id },
      data: {
        unit: NEW_UNIT,
        currentStock: TARGET_STOCK,
        costPrice: NEW_UNIT_COST,
        averageCost: NEW_UNIT_COST,
        lastPurchaseCost: NEW_UNIT_COST,
        stockValue: newStockValue,
        minimumStock: NEW_MIN_STOCK,
        reorderPoint: NEW_REORDER,
        description: "4 sacos de 50 unidades, equivalentes a 0,2 caixas.",
        updatedBy: UPDATED_BY,
      },
    });
  });

  console.log("✅ Conversão e stock final aplicados!");
  console.log(`   Stock final: ${TARGET_STOCK} caixas (estado crítico esperado)`);
}

main()
  .catch((e) => {
    console.error("❌", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
