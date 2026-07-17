import { Prisma } from "@prisma/client";

type TxClient = Prisma.TransactionClient;

export interface BaselineResolution {
  /** True when a transaction dated after this entry already exists for the item. */
  isBackdated: boolean;
  /** Stock balance immediately before this entry's date (0 if no prior transaction). */
  priorBalance: Prisma.Decimal;
  /** Date of the earliest transaction that comes after this entry, if backdated. */
  supersededByDate?: Date;
}

/**
 * Determines whether a transaction being recorded "now" for a given date is
 * actually backdated relative to the item's own history (i.e. a later
 * transaction - typically a physical count - already exists for this item).
 *
 * This matters because every canonical script computes its update from the
 * item's *current* currentStock/averageCost. That is correct when the new
 * transaction is the most recent event, but wrong when it's backdated: a
 * later count already established the true current stock, and layering the
 * backdated entry on top of *current* stock double-counts it (this exact
 * bug inflated 12 items when the 2026-07-03 delivery was registered two
 * weeks late - see docs/workflows/CURSOR-MASTER-PROMPT-stock-workflow.md).
 *
 * When backdated, callers should still record the transaction (for
 * historical accuracy and this month's "Entradas"/"Saidas" reporting), but
 * must NOT update the item's live currentStock/averageCost/stockValue -
 * those stay governed by whatever the later transaction already set.
 */
export async function resolveBaseline(
  tx: TxClient,
  itemId: string,
  transactionDate: Date,
): Promise<BaselineResolution> {
  const laterTransaction = await tx.inventoryTransaction.findFirst({
    where: { itemId, transactionDate: { gt: transactionDate } },
    orderBy: [{ transactionDate: "asc" }, { createdAt: "asc" }],
    select: { transactionDate: true },
  });

  if (!laterTransaction) {
    return { isBackdated: false, priorBalance: new Prisma.Decimal(0) };
  }

  const priorTransaction = await tx.inventoryTransaction.findFirst({
    where: { itemId, transactionDate: { lte: transactionDate } },
    orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
    select: { balanceAfter: true },
  });

  return {
    isBackdated: true,
    priorBalance: priorTransaction?.balanceAfter ?? new Prisma.Decimal(0),
    supersededByDate: laterTransaction.transactionDate,
  };
}
