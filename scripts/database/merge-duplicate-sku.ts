import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logging";
import { calculateCMPForStockEntry, validateCMPInputs } from "@/lib/inventory-cmp";

/**
 * Merges a duplicate InventoryItem SKU into its canonical counterpart.
 *
 * Use this when the same physical product ended up with two SKUs (e.g. one
 * created INACTIVE and forgotten, holding real stock/transactions the
 * reports never see because they only query status="ACTIVE").
 *
 * All InventoryTransaction rows from `--from` are re-pointed to `--into`
 * (full history preserved, nothing deleted), the canonical item absorbs the
 * stock (weighted-average cost, same formula used for supplier entries), a
 * single auditable ADJUSTMENT transaction documents the consolidation, and
 * the duplicate is soft-deleted (stock zeroed, deletedAt set) so it can
 * never again be double-counted.
 *
 * WARNING: this always ADDS the two items' stock together (weighted-average
 * cost). That is correct when `--from` held genuinely separate stock that
 * was never transferred. It is WRONG if `--into` simply replaced `--from`
 * mid-month for tracking the same physical item — in that case the newer
 * SKU's own latest count already reflects the true, complete stock, and
 * summing double-counts it. Confirm with whoever does the physical counts
 * before relying on the sum (this exact mistake happened with "Lava-Louça
 * Universal" on 2026-07-17 and had to be corrected afterwards).
 *
 * Usage:
 *   npx tsx scripts/database/merge-duplicate-sku.ts --from=<SKU> --into=<SKU> [--reason="..."]
 */

function parseArgs() {
  const args = Object.fromEntries(
    process.argv
      .slice(2)
      .filter((arg) => arg.startsWith("--") && arg.includes("="))
      .map((arg) => {
        const [key, ...rest] = arg.slice(2).split("=");
        return [key, rest.join("=")];
      }),
  );

  if (!args.from || !args.into) {
    throw new Error(
      "Uso: npx tsx scripts/database/merge-duplicate-sku.ts --from=<SKU> --into=<SKU> [--reason=\"...\"]",
    );
  }

  return {
    fromSku: args.from,
    intoSku: args.into,
    reason: args.reason ?? "Consolidacao de SKU duplicado.",
  };
}

async function main(): Promise<void> {
  const { fromSku, intoSku, reason } = parseArgs();

  if (fromSku === intoSku) {
    throw new Error("--from e --into nao podem ser o mesmo SKU.");
  }

  const fromItem = await prisma.inventoryItem.findUnique({ where: { sku: fromSku } });
  if (!fromItem) throw new Error(`SKU nao encontrado: ${fromSku}`);
  if (fromItem.deletedAt) throw new Error(`SKU ${fromSku} ja foi consolidado anteriormente (deletedAt definido).`);

  const intoItem = await prisma.inventoryItem.findUnique({ where: { sku: intoSku } });
  if (!intoItem) throw new Error(`SKU nao encontrado: ${intoSku}`);

  logger.info("Merging duplicate SKU", {
    fromSku,
    fromStock: fromItem.currentStock.toString(),
    intoSku,
    intoStock: intoItem.currentStock.toString(),
  });

  const mergeInput = {
    currentStock: intoItem.currentStock,
    currentAverageCost: intoItem.averageCost,
    incomingQuantity: fromItem.currentStock,
    incomingUnitCost: fromItem.averageCost,
  };

  let mergedStock = intoItem.currentStock;
  let mergedAverageCost = intoItem.averageCost;
  let mergedStockValue = intoItem.stockValue;
  let entryValue = new Prisma.Decimal(0);

  if (fromItem.currentStock.gt(0)) {
    validateCMPInputs(mergeInput);
    const result = calculateCMPForStockEntry(mergeInput);
    mergedStock = result.newTotalQuantity;
    mergedAverageCost = result.newAverageCost;
    mergedStockValue = result.newStockValue;
    entryValue = result.entryValue;
  }

  const referenceId = `MERGE-${fromSku}-INTO-${intoSku}-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const now = new Date();

  const movedCount = await prisma.$transaction(async (tx) => {
    const moved = await tx.inventoryTransaction.updateMany({
      where: { itemId: fromItem.id },
      data: { itemId: intoItem.id },
    });

    await tx.inventoryItem.update({
      where: { id: intoItem.id },
      data: {
        currentStock: mergedStock,
        averageCost: mergedAverageCost,
        stockValue: mergedStockValue,
        updatedBy: "SKU_CONSOLIDATION",
      },
    });

    if (fromItem.currentStock.gt(0)) {
      await tx.inventoryTransaction.create({
        data: {
          itemId: intoItem.id,
          type: "ADJUSTMENT",
          quantity: fromItem.currentStock,
          unit: intoItem.unit,
          unitCost: fromItem.averageCost,
          totalCost: entryValue,
          referenceType: "SKU_CONSOLIDATION",
          referenceId,
          balanceAfter: mergedStock,
          reason,
          notes: `Consolidacao do SKU duplicado ${fromSku} (${fromItem.name}) no SKU canonico ${intoSku}. Stock absorvido: ${fromItem.currentStock.toString()} ${fromItem.unit}. Todas as transacoes historicas de ${fromSku} foram re-atribuidas a este artigo (ver referenceId=${referenceId}).`,
          createdBy: "SKU_CONSOLIDATION",
          transactionDate: now,
        },
      });
    }

    await tx.inventoryItem.update({
      where: { id: fromItem.id },
      data: {
        currentStock: new Prisma.Decimal(0),
        stockValue: new Prisma.Decimal(0),
        status: "INACTIVE",
        deletedAt: now,
        updatedBy: "SKU_CONSOLIDATION",
        description: `SKU duplicado, consolidado em ${intoSku} em ${now.toISOString().slice(0, 10)}. Nao usar para novas operacoes.`,
      },
    });

    return moved.count;
  });

  logger.info("Merge completed", {
    fromSku,
    intoSku,
    transactionsMoved: movedCount,
    newStock: mergedStock.toString(),
    referenceId,
  });

  console.warn(
    `\n${fromSku} consolidado em ${intoSku}: ${movedCount} transacao(oes) re-atribuida(s), stock final = ${mergedStock.toString()} ${intoItem.unit}.`,
  );
}

main()
  .catch((error: unknown) => {
    logger.error("Failed to merge duplicate SKU", { error });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
