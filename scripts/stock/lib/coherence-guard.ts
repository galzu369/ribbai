import type { Prisma, PrismaClient } from "@prisma/client";

/**
 * Post-write invariant check (Master Prompt task 3).
 *
 * After every canonical stock operation commits, re-reads each touched item
 * and confirms currentStock matches the balanceAfter of the transaction that
 * operation just created. This should never fail if the write path is
 * correct — it exists purely as a safety net against concurrency bugs or
 * future regressions that reintroduce the currentStock/ledger desync fixed
 * by scripts/database/reconcile-current-stock.ts.
 */
export async function assertPostWriteCoherence(
  prisma: PrismaClient,
  referenceId: string,
  referenceType: string,
): Promise<void> {
  const transactions = await prisma.inventoryTransaction.findMany({
    where: { referenceId, referenceType },
    select: {
      itemId: true,
      balanceAfter: true,
      item: { select: { sku: true, currentStock: true } },
    },
  });

  const mismatches: string[] = [];

  for (const tx of transactions) {
    const diff = tx.item.currentStock.sub(tx.balanceAfter as Prisma.Decimal).abs();
    if (diff.gt("0.001")) {
      mismatches.push(
        `${tx.item.sku}: currentStock=${tx.item.currentStock.toString()} != balanceAfter=${tx.balanceAfter.toString()}`,
      );
    }
  }

  if (mismatches.length > 0) {
    throw new Error(
      `Guarda de coerencia falhou para referenceId=${referenceId}. Artigos divergentes:\n${mismatches.join("\n")}`,
    );
  }
}
