import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { normalizeItemName, findItemsWithSameName } from "../../scripts/stock/lib/duplicate-check";

describe("normalizeItemName", () => {
  it("trims, lowercases, and collapses whitespace", () => {
    expect(normalizeItemName("  Guardanapos  ")).toBe("guardanapos");
    expect(normalizeItemName("Guardanapos   Pequenos")).toBe("guardanapos pequenos");
    expect(normalizeItemName("GUARDANAPOS")).toBe("guardanapos");
  });
});

describe("findItemsWithSameName (integration)", () => {
  const SKU_A = "TEST-VITEST-DUP-A";
  const SKU_B = "TEST-VITEST-DUP-B";
  const NAME = "Item Vitest Duplicado";

  beforeAll(async () => {
    await prisma.inventoryItem.createMany({
      data: [
        {
          sku: SKU_A,
          name: NAME,
          category: "Teste",
          subCategory: "Teste",
          unit: "unidade",
          costPrice: new Prisma.Decimal("1"),
          currentStock: new Prisma.Decimal("0"),
          minimumStock: new Prisma.Decimal("1"),
          reorderPoint: new Prisma.Decimal("1"),
          createdBy: "VITEST",
          updatedBy: "VITEST",
        },
        {
          sku: SKU_B,
          name: `  ${NAME.toUpperCase()}  `,
          category: "Teste",
          subCategory: "Teste",
          unit: "unidade",
          costPrice: new Prisma.Decimal("1"),
          currentStock: new Prisma.Decimal("0"),
          minimumStock: new Prisma.Decimal("1"),
          reorderPoint: new Prisma.Decimal("1"),
          status: "INACTIVE",
          createdBy: "VITEST",
          updatedBy: "VITEST",
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.inventoryItem.deleteMany({ where: { sku: { in: [SKU_A, SKU_B] } } });
    await prisma.$disconnect();
  });

  it("finds items whose name matches once normalized, regardless of case/whitespace/status", async () => {
    const matches = await findItemsWithSameName(prisma, NAME, SKU_A);
    expect(matches).toHaveLength(1);
    expect(matches[0].sku).toBe(SKU_B);
  });

  it("excludes the given SKU from its own results", async () => {
    const matches = await findItemsWithSameName(prisma, NAME);
    const skus = matches.map((m) => m.sku);
    expect(skus).toContain(SKU_A);
    expect(skus).toContain(SKU_B);
  });

  it("returns an empty list for a name with no collisions", async () => {
    const matches = await findItemsWithSameName(prisma, "Nome Que Nao Existe De Todo");
    expect(matches).toHaveLength(0);
  });
});
