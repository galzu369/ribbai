import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { resolveBaseline } from "../../scripts/stock/lib/backdating";

const SKU = "TEST-VITEST-BACKDATING-ITEM";
const SUPPLIER_CODE = "TEST-VITEST-BACKDATING-SUPPLIER";

describe("resolveBaseline (integration)", () => {
  let itemId: string;

  beforeAll(async () => {
    const supplier = await prisma.supplier.upsert({
      where: { code: SUPPLIER_CODE },
      update: {},
      create: { code: SUPPLIER_CODE, name: "Fornecedor Vitest Backdating", createdBy: "VITEST" },
    });

    const item = await prisma.inventoryItem.create({
      data: {
        sku: SKU,
        name: "Item Vitest Backdating",
        category: "Teste",
        subCategory: "Teste",
        supplierId: supplier.id,
        unit: "unidade",
        costPrice: new Prisma.Decimal("1"),
        currentStock: new Prisma.Decimal("0"),
        minimumStock: new Prisma.Decimal("1"),
        reorderPoint: new Prisma.Decimal("1"),
        averageCost: new Prisma.Decimal("0"),
        stockValue: new Prisma.Decimal("0"),
        createdBy: "VITEST",
        updatedBy: "VITEST",
      },
    });
    itemId = item.id;
  });

  afterAll(async () => {
    await prisma.inventoryTransaction.deleteMany({ where: { itemId } });
    await prisma.inventoryItem.deleteMany({ where: { sku: SKU } });
    await prisma.supplier.deleteMany({ where: { code: SUPPLIER_CODE } });
    await prisma.$disconnect();
  });

  it("reports not backdated when no later transaction exists", async () => {
    const result = await resolveBaseline(prisma, itemId, new Date("2026-07-10T00:00:00.000Z"));
    expect(result.isBackdated).toBe(false);
  });

  it("reports backdated with priorBalance=0 when a later transaction exists but none before the date", async () => {
    await prisma.inventoryTransaction.create({
      data: {
        itemId,
        type: "ADJUSTMENT",
        quantity: new Prisma.Decimal("10"),
        unit: "unidade",
        referenceType: "WEEKLY_COUNT",
        referenceId: "REF-LATER-VITEST",
        balanceAfter: new Prisma.Decimal("10"),
        reason: "Vitest setup",
        createdBy: "VITEST",
        transactionDate: new Date("2026-07-20T00:00:00.000Z"),
      },
    });

    const result = await resolveBaseline(prisma, itemId, new Date("2026-07-10T00:00:00.000Z"));
    expect(result.isBackdated).toBe(true);
    expect(result.priorBalance.toString()).toBe("0");
    expect(result.supersededByDate?.toISOString()).toBe(new Date("2026-07-20T00:00:00.000Z").toISOString());
  });

  it("reports backdated with priorBalance from the transaction immediately before the date", async () => {
    await prisma.inventoryTransaction.create({
      data: {
        itemId,
        type: "IN",
        quantity: new Prisma.Decimal("5"),
        unit: "unidade",
        referenceType: "SUPPLIER_DELIVERY",
        referenceId: "REF-EARLIER-VITEST",
        balanceAfter: new Prisma.Decimal("5"),
        reason: "Vitest setup",
        createdBy: "VITEST",
        transactionDate: new Date("2026-07-05T00:00:00.000Z"),
      },
    });

    const result = await resolveBaseline(prisma, itemId, new Date("2026-07-10T00:00:00.000Z"));
    expect(result.isBackdated).toBe(true);
    expect(result.priorBalance.toString()).toBe("5");
  });
});
