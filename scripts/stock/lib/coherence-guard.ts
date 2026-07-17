import type { PrismaClient } from "@prisma/client";

/**
 * Post-write invariant check (Master Prompt task 3).
 *
 * After every canonical stock operation commits, re-reads each touched item
 * and confirms currentStock matches the balanceAfter of that item's own
 * *most recent* transaction (by transactionDate) - not necessarily the one
 * this operation just created. A backdated entry (see lib/backdating.ts)
 * deliberately does not update currentStock when a later transaction
 * already exists for the item, so comparing against "the transaction just
 * written" would falsely fail in that case; comparing against the item's
 * true latest transaction is the correct, general invariant (same one
 * scripts/database/reconcile-current-stock.ts checks).
 *
 * This should never fail if the write path is correct - it exists purely
 * as a safety net against concurrency bugs or future regressions that
 * reintroduce the currentStock/ledger desync fixed by reconcile-current-stock.ts.
 */
export async function assertPostWriteCoherence(
  prisma: PrismaClient,
  referenceId: string,
  referenceType: string,
): Promise<void> {
  const transactions = await prisma.inventoryTransaction.findMany({
    where: { referenceId, referenceType },
    select: { itemId: true },
  });

  const itemIds = [...new Set(transactions.map((tx) => tx.itemId))];
  const mismatches: string[] = [];

  for (const itemId of itemIds) {
    const item = await prisma.inventoryItem.findUniqueOrThrow({
      where: { id: itemId },
      select: { sku: true, currentStock: true },
    });

    const latestTransaction = await prisma.inventoryTransaction.findFirst({
      where: { itemId },
      orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
      select: { balanceAfter: true },
    });

    if (!latestTransaction) {
      continue;
    }

    const diff = item.currentStock.sub(latestTransaction.balanceAfter).abs();
    if (diff.gt("0.001")) {
      mismatches.push(
        `${item.sku}: currentStock=${item.currentStock.toString()} != ultima transacao balanceAfter=${latestTransaction.balanceAfter.toString()}`,
      );
    }
  }

  if (mismatches.length > 0) {
    throw new Error(
      `Guarda de coerencia falhou para referenceId=${referenceId}. Artigos divergentes:\n${mismatches.join("\n")}`,
    );
  }
}
