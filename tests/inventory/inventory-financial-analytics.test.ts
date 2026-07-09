import { vi } from "vitest";

import {
  getInventoryFinancialSummary,
  getMonthlyFinancialTrends,
} from "@/lib/inventory-financial-analytics";

vi.mock("@/lib/db", () => {
  const aggregateMock = vi.fn().mockResolvedValue({ _sum: { stockValue: 0 }, _count: { id: 0 } });
  const countMock = vi.fn().mockResolvedValue(0);
  const findManyMock = vi.fn().mockResolvedValue([]);

  return {
    prisma: {
      inventoryItem: {
        aggregate: aggregateMock,
        count: countMock,
        findMany: findManyMock,
        fields: {
          reorderPoint: {} as any,
          minimumStock: {} as any,
        },
      },
      inventoryTransaction: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    },
  };
});

describe("inventory-financial-analytics", () => {
  it("returns a financial summary structure", async () => {
    const summary = await getInventoryFinancialSummary();

    expect(summary).toHaveProperty("totalInventoryValue");
    expect(summary).toHaveProperty("totalItems");
    expect(summary).toHaveProperty("totalCategories");
    expect(summary).toHaveProperty("lowStockItems");
    expect(summary).toHaveProperty("criticalStockItems");
    expect(summary).toHaveProperty("lastUpdated");
  });

  it("returns empty monthly trends when there are no transactions", async () => {
    const trends = await getMonthlyFinancialTrends(3);
    expect(trends).toEqual([]);
  });
});

