import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const SKU = "CONS-OPS-PRINTER-ROLLS";
const FACTOR = new Prisma.Decimal(5); // 1 caixa = 5 sacos
const NEW_UNIT = "caixa";
const NEW_UNIT_COST = new Prisma.Decimal("39.65"); // 7.93 × 5
const NEW_MIN_STOCK = new Prisma.Decimal(2);
const NEW_REORDER = new Prisma.Decimal(2);
const UPDATED_BY = "OPS-CONVERT-PRINTER-ROLLS-SACOS-TO-CAIXAS";

const dryRun = process.argv.includes("--dry-run");
const force = process.argv.includes("--force");

function isSacoScaleQuantity(value) {
  const n = Number(value);
  // Valores claramente em sacos após uniformização incorreta de labels
  return n >= 15;
}

function divByFactor(value) {
  return new Prisma.Decimal(value).div(FACTOR);
}

function mulByFactor(value) {
  return new Prisma.Decimal(value).mul(FACTOR);
}

async function main() {
  console.log("=== RIBBAI - Conversão completa Rolos Impressora (sacos → caixas) ===");
  console.log(`Modo: ${dryRun ? "DRY-RUN" : "APLICAR"}`);
  console.log("");

  const item = await prisma.inventoryItem.findUnique({ where: { sku: SKU } });
  if (!item) {
    throw new Error(`Artigo não encontrado: ${SKU}`);
  }

  const transactions = await prisma.inventoryTransaction.findMany({
    where: { itemId: item.id },
    orderBy: [{ transactionDate: "asc" }, { createdAt: "asc" }],
  });

  const weeklyItems = await prisma.weeklyInventoryItem.findMany({
    where: { itemId: item.id },
    include: { weeklyInventory: true },
    orderBy: { countedAt: "asc" },
  });

  const stockValueBefore = item.stockValue;
  const plannedTxUpdates = [];
  const plannedWeeklyUpdates = [];

  for (const tx of transactions) {
    const qty = Number(tx.quantity);
    const balance = Number(tx.balanceAfter);
    const needsQtyConversion = isSacoScaleQuantity(tx.quantity) || isSacoScaleQuantity(tx.balanceAfter);

    if (!needsQtyConversion && tx.unit === NEW_UNIT && Number(tx.unitCost) <= 10) {
      // Transações já em caixas com custo por saco — apenas atualizar custo se > 0
      if (Number(tx.unitCost) > 0 && Number(tx.unitCost) < 20) {
        plannedTxUpdates.push({
          id: tx.id,
          referenceId: tx.referenceId,
          before: { quantity: tx.quantity.toString(), unitCost: tx.unitCost.toString(), balanceAfter: tx.balanceAfter.toString() },
          after: {
            quantity: tx.quantity.toString(),
            unit: NEW_UNIT,
            unitCost: NEW_UNIT_COST.toString(),
            totalCost: tx.totalCost.toString(),
            balanceAfter: tx.balanceAfter.toString(),
          },
          note: "Atualizar apenas unitCost para caixa",
        });
      }
      continue;
    }

    if (needsQtyConversion) {
      let newQty = divByFactor(tx.quantity);
      let newBalance = divByFactor(tx.balanceAfter);

      // Ajuste semanal 30/06: variância era -21 sacos = -1 caixa (5 → 4)
      if (tx.referenceId === "WEEKLY-COUNT-2026-06-30") {
        newQty = new Prisma.Decimal(1);
        newBalance = new Prisma.Decimal(4);
      }

      const newUnitCost = Number(tx.unitCost) > 0 ? mulByFactor(tx.unitCost) : tx.unitCost;
      const newTotalCost = tx.totalCost;

      plannedTxUpdates.push({
        id: tx.id,
        referenceId: tx.referenceId,
        before: {
          quantity: tx.quantity.toString(),
          unit: tx.unit,
          unitCost: tx.unitCost.toString(),
          balanceAfter: tx.balanceAfter.toString(),
        },
        after: {
          quantity: newQty.toString(),
          unit: NEW_UNIT,
          unitCost: newUnitCost.toString(),
          totalCost: newTotalCost.toString(),
          balanceAfter: newBalance.toString(),
        },
        note: "Converter quantidades de sacos para caixas (÷5)",
      });
    }
  }

  for (const wi of weeklyItems) {
    const needsConversion = isSacoScaleQuantity(wi.systemQuantity) || isSacoScaleQuantity(wi.actualQuantity);

    if (needsConversion) {
      const newSystem = divByFactor(wi.systemQuantity);
      const newActual = Number(wi.actualQuantity) <= 10 ? wi.actualQuantity : divByFactor(wi.actualQuantity);
      const newVariance = new Prisma.Decimal(newSystem).sub(newActual);
      const newUnitCost = Number(wi.unitCost) > 0 && Number(wi.unitCost) < 20 ? NEW_UNIT_COST : wi.unitCost;
      const newTotalValue = new Prisma.Decimal(newActual).mul(newUnitCost);
      const newVarianceValue = newVariance.mul(newUnitCost);

      plannedWeeklyUpdates.push({
        id: wi.id,
        week: `${wi.weeklyInventory.weekNumber}/${wi.weeklyInventory.year}`,
        before: {
          systemQuantity: wi.systemQuantity.toString(),
          actualQuantity: wi.actualQuantity.toString(),
          variance: wi.variance.toString(),
        },
        after: {
          systemQuantity: newSystem.toString(),
          actualQuantity: newActual.toString(),
          variance: newVariance.toString(),
          unitCost: newUnitCost.toString(),
          totalValue: newTotalValue.toString(),
          varianceValue: newVarianceValue.toString(),
        },
      });
    } else if (Number(wi.unitCost) > 0 && Number(wi.unitCost) < 20) {
      plannedWeeklyUpdates.push({
        id: wi.id,
        week: `${wi.weeklyInventory.weekNumber}/${wi.weeklyInventory.year}`,
        before: { unitCost: wi.unitCost.toString() },
        after: { unitCost: NEW_UNIT_COST.toString() },
        note: "Atualizar unitCost apenas",
      });
    }
  }

  const newStockValue = new Prisma.Decimal(item.currentStock).mul(NEW_UNIT_COST);

  console.log("📦 Artigo:");
  console.log(`   Stock atual: ${item.currentStock} (mantido)`);
  console.log(`   Unidade: ${item.unit} → ${NEW_UNIT}`);
  console.log(`   Custo: ${item.costPrice} → ${NEW_UNIT_COST} €/caixa`);
  console.log(`   Stock value: ${item.stockValue} → ${newStockValue}`);
  console.log(`   Reorder: ${item.reorderPoint} → ${NEW_REORDER} caixas`);
  console.log("");

  console.log(`📝 Transações a atualizar: ${plannedTxUpdates.length}`);
  for (const u of plannedTxUpdates) {
    console.log(`   • ${u.referenceId}: qty ${u.before.quantity} → ${u.after.quantity}, balance ${u.before.balanceAfter} → ${u.after.balanceAfter}`);
  }
  console.log("");

  console.log(`📋 Contagens semanais a atualizar: ${plannedWeeklyUpdates.length}`);
  for (const u of plannedWeeklyUpdates) {
    if (u.after.systemQuantity) {
      console.log(`   • Semana ${u.week}: system ${u.before.systemQuantity} → ${u.after.systemQuantity}, actual ${u.before.actualQuantity} → ${u.after.actualQuantity}`);
    } else {
      console.log(`   • Semana ${u.week}: unitCost atualizado`);
    }
  }
  console.log("");

  if (dryRun) {
    console.log("✅ DRY-RUN concluído. Execute sem --dry-run para aplicar.");
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const update of plannedTxUpdates) {
      await tx.inventoryTransaction.update({
        where: { id: update.id },
        data: {
          quantity: update.after.quantity,
          unit: update.after.unit,
          unitCost: update.after.unitCost,
          totalCost: update.after.totalCost,
          balanceAfter: update.after.balanceAfter,
        },
      });
    }

    for (const update of plannedWeeklyUpdates) {
      await tx.weeklyInventoryItem.update({
        where: { id: update.id },
        data: {
          ...(update.after.systemQuantity && {
            systemQuantity: update.after.systemQuantity,
            actualQuantity: update.after.actualQuantity,
            variance: update.after.variance,
            totalValue: update.after.totalValue,
            varianceValue: update.after.varianceValue,
          }),
          ...(update.after.unitCost && { unitCost: update.after.unitCost }),
        },
      });
    }

    await tx.inventoryItem.update({
      where: { id: item.id },
      data: {
        unit: NEW_UNIT,
        costPrice: NEW_UNIT_COST,
        averageCost: NEW_UNIT_COST,
        lastPurchaseCost: NEW_UNIT_COST,
        stockValue: newStockValue,
        minimumStock: NEW_MIN_STOCK,
        reorderPoint: NEW_REORDER,
        updatedBy: UPDATED_BY,
      },
    });
  });

  const valueDiff = newStockValue.sub(stockValueBefore).abs();
  console.log("✅ Conversão aplicada com sucesso!");
  console.log(`   Valor stock anterior: ${stockValueBefore} €`);
  console.log(`   Valor stock novo: ${newStockValue} €`);
  if (valueDiff.gt(new Prisma.Decimal("0.01")) && !force) {
    console.log(`   ⚠️  Diferença de valor: ${valueDiff} € (esperado após correção de escala)`);
  }
}

main()
  .catch((error) => {
    console.error("❌ Erro:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
