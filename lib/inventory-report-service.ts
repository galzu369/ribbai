import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export type InventoryUpdateReportData = {
  transactions: any[];
  changedItems: any[];
  configOnlyItems: any[];
};

export async function getInventoryUpdateReportData(date: string, referenceId?: string, includeSkus: string[] = []): Promise<InventoryUpdateReportData> {
  const { start, end } = getDayPeriod(date);

  const where: any = {
    transactionDate: {
      gte: start,
      lte: end,
    },
  };

  if (referenceId) {
    where.referenceId = referenceId;
  }

  const transactions = await prisma.inventoryTransaction.findMany({
    where,
    include: {
      item: true,
    },
    orderBy: [{ transactionDate: "asc" }, { createdAt: "asc" }],
  });

  if (transactions.length === 0) {
    throw new Error(`No inventory transactions found for ${date}.`);
  }

  const transactionItemIds = [...new Set(transactions.map((transaction) => transaction.itemId))];
  const updatedItems = await prisma.inventoryItem.findMany({
    where: {
      OR: [
        {
          updatedAt: {
            gte: start,
            lte: end,
          },
        },
        {
          sku: {
            in: includeSkus,
          },
        },
      ],
    },
  });

  const configOnlyItems = updatedItems.filter((item) => !transactionItemIds.includes(item.id));
  const changedItemIds = [...new Set([...transactionItemIds, ...configOnlyItems.map((item) => item.id)])];
  const changedItems = await prisma.inventoryItem.findMany({
    where: {
      id: {
        in: changedItemIds,
      },
    },
  });

  return {
    transactions,
    changedItems,
    configOnlyItems,
  };
}

function getDayPeriod(date: string) {
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(`${date}T23:59:59.999Z`);

  return { start, end };
}

