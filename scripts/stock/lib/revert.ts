import { Prisma, type PrismaClient } from "@prisma/client";

/**
 * If a previous run already recorded transactions under this referenceId,
 * reject the run unless --force was passed. When forced, deletes the old
 * transactions and resets each affected item's currentStock to whatever its
 * *next most recent* transaction says (never a naive subtraction) so the
 * item is left in a ledger-consistent state before the operation reapplies.
 */
export async function revertReferenceIfNeeded(
  prisma: PrismaClient,
  referenceId: string,
  referenceType: string,
  force: boolean,
): Promise<void> {
  const existing = await prisma.inventoryTransaction.findMany({
    where: { referenceId, referenceType },
    select: { itemId: true },
  });

  if (existing.length === 0) {
    return;
  }

  if (!force) {
    throw new Error(
      `Referencia ${referenceId} ja foi processada anteriormente. Corre novamente com --force para reprocessar (isto reverte e recalcula os artigos afetados a partir do ledger de transacoes).`,
    );
  }

  const itemIds = [...new Set(existing.map((row) => row.itemId))];

  await prisma.$transaction(async (tx) => {
    await tx.inventoryTransaction.deleteMany({ where: { referenceId, referenceType } });

    for (const itemId of itemIds) {
      const lastRemaining = await tx.inventoryTransaction.findFirst({
        where: { itemId },
        orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
        select: { balanceAfter: true },
      });

      const item = await tx.inventoryItem.findUniqueOrThrow({
        where: { id: itemId },
        select: { averageCost: true },
      });

      const balance = lastRemaining?.balanceAfter ?? new Prisma.Decimal(0);

      await tx.inventoryItem.update({
        where: { id: itemId },
        data: {
          currentStock: balance,
          stockValue: balance.mul(item.averageCost),
        },
      });
    }
  });
}
