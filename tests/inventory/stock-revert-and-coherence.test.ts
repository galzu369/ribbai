import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { revertReferenceIfNeeded } from "../../scripts/stock/lib/revert";
import { assertPostWriteCoherence } from "../../scripts/stock/lib/coherence-guard";

/**
 * Integration tests against the real local database for the two pieces of
 * logic that caused the original currentStock/ledger desync bug (see
 * docs/workflows/CURSOR-MASTER-PROMPT-stock-workflow.md, seccao 2): the
 * revert-on-rerun path and the post-write coherence guard.
 */

const TEST_SKU = "TEST-VITEST-REVERT-ITEM";
const TEST_SUPPLIER_CODE = "TEST-VITEST-SUPPLIER";
const TEST_REFERENCE_TYPE = "TEST_REFERENCE_TYPE";

async function resetTestItem() {
  await prisma.inventoryTransaction.deleteMany({ where: { item: { sku: TEST_SKU } } });
  await prisma.inventoryItem.update({
    where: { sku: TEST_SKU },
    data: { currentStock: new Prisma.Decimal(0), stockValue: new Prisma.Decimal(0) },
  });
}

describe("stock-revert-and-coherence (integration)", () => {
  beforeAll(async () => {
    const supplier = await prisma.supplier.upsert({
      where: { code: TEST_SUPPLIER_CODE },
      update: {},
      create: { code: TEST_SUPPLIER_CODE, name: "Fornecedor Vitest", createdBy: "VITEST" },
    });

    await prisma.inventoryItem.upsert({
      where: { sku: TEST_SKU },
      update: {},
      create: {
        sku: TEST_SKU,
        name: "Item Vitest Revert",
        category: "Teste",
        subCategory: "Teste",
        supplierId: supplier.id,
        unit: "unidade",
        costPrice: new Prisma.Decimal("1"),
        currentStock: new Prisma.Decimal(0),
        minimumStock: new Prisma.Decimal(1),
        reorderPoint: new Prisma.Decimal(1),
        averageCost: new Prisma.Decimal(0),
        lastPurchaseCost: new Prisma.Decimal(0),
        stockValue: new Prisma.Decimal(0),
        createdBy: "VITEST",
        updatedBy: "VITEST",
      },
    });
  });

  afterEach(async () => {
    await resetTestItem();
  });

  afterAll(async () => {
    await prisma.inventoryTransaction.deleteMany({ where: { item: { sku: TEST_SKU } } });
    await prisma.inventoryItem.deleteMany({ where: { sku: TEST_SKU } });
    await prisma.supplier.deleteMany({ where: { code: TEST_SUPPLIER_CODE } });
    await prisma.$disconnect();
  });

  it("resolves without changes when no transactions exist for the referenceId", async () => {
    await expect(
      revertReferenceIfNeeded(prisma, "REF-NONE-VITEST", TEST_REFERENCE_TYPE, false),
    ).resolves.toBeUndefined();
  });

  it("rejects reprocessing when transactions already exist and force is not set", async () => {
    const item = await prisma.inventoryItem.findUniqueOrThrow({ where: { sku: TEST_SKU } });
    await prisma.inventoryTransaction.create({
      data: {
        itemId: item.id,
        type: "IN",
        quantity: new Prisma.Decimal("5"),
        unit: "unidade",
        referenceType: TEST_REFERENCE_TYPE,
        referenceId: "REF-EXISTS-VITEST",
        balanceAfter: new Prisma.Decimal("5"),
        reason: "Vitest setup",
        createdBy: "VITEST",
        transactionDate: new Date(),
      },
    });
    await prisma.inventoryItem.update({
      where: { id: item.id },
      data: { currentStock: new Prisma.Decimal("5") },
    });

    await expect(
      revertReferenceIfNeeded(prisma, "REF-EXISTS-VITEST", TEST_REFERENCE_TYPE, false),
    ).rejects.toThrow(/ja foi processada/);
  });

  it("with force=true, deletes the transaction and resets currentStock to the remaining ledger state", async () => {
    const item = await prisma.inventoryItem.findUniqueOrThrow({ where: { sku: TEST_SKU } });
    await prisma.inventoryTransaction.create({
      data: {
        itemId: item.id,
        type: "IN",
        quantity: new Prisma.Decimal("5"),
        unit: "unidade",
        referenceType: TEST_REFERENCE_TYPE,
        referenceId: "REF-FORCE-VITEST",
        balanceAfter: new Prisma.Decimal("5"),
        reason: "Vitest setup",
        createdBy: "VITEST",
        transactionDate: new Date(),
      },
    });
    await prisma.inventoryItem.update({
      where: { id: item.id },
      data: { currentStock: new Prisma.Decimal("5") },
    });

    await revertReferenceIfNeeded(prisma, "REF-FORCE-VITEST", TEST_REFERENCE_TYPE, true);

    const remainingTx = await prisma.inventoryTransaction.findMany({
      where: { referenceId: "REF-FORCE-VITEST" },
    });
    expect(remainingTx).toHaveLength(0);

    const refreshedItem = await prisma.inventoryItem.findUniqueOrThrow({ where: { sku: TEST_SKU } });
    expect(refreshedItem.currentStock.toString()).toBe("0");
  });

  it("assertPostWriteCoherence resolves when currentStock matches the transaction's balanceAfter", async () => {
    const item = await prisma.inventoryItem.findUniqueOrThrow({ where: { sku: TEST_SKU } });
    await prisma.inventoryTransaction.create({
      data: {
        itemId: item.id,
        type: "IN",
        quantity: new Prisma.Decimal("10"),
        unit: "unidade",
        referenceType: TEST_REFERENCE_TYPE,
        referenceId: "REF-COHERENT-VITEST",
        balanceAfter: new Prisma.Decimal("10"),
        reason: "Vitest setup",
        createdBy: "VITEST",
        transactionDate: new Date(),
      },
    });
    await prisma.inventoryItem.update({
      where: { id: item.id },
      data: { currentStock: new Prisma.Decimal("10") },
    });

    await expect(
      assertPostWriteCoherence(prisma, "REF-COHERENT-VITEST", TEST_REFERENCE_TYPE),
    ).resolves.toBeUndefined();
  });

  it("assertPostWriteCoherence throws when currentStock diverges from the transaction's balanceAfter", async () => {
    const item = await prisma.inventoryItem.findUniqueOrThrow({ where: { sku: TEST_SKU } });
    await prisma.inventoryTransaction.create({
      data: {
        itemId: item.id,
        type: "IN",
        quantity: new Prisma.Decimal("20"),
        unit: "unidade",
        referenceType: TEST_REFERENCE_TYPE,
        referenceId: "REF-INCOHERENT-VITEST",
        balanceAfter: new Prisma.Decimal("20"),
        reason: "Vitest setup",
        createdBy: "VITEST",
        transactionDate: new Date(),
      },
    });
    // Deliberately desync currentStock from the transaction ledger, reproducing the original bug.
    await prisma.inventoryItem.update({
      where: { id: item.id },
      data: { currentStock: new Prisma.Decimal("999") },
    });

    await expect(
      assertPostWriteCoherence(prisma, "REF-INCOHERENT-VITEST", TEST_REFERENCE_TYPE),
    ).rejects.toThrow(/Guarda de coerencia falhou/);
  });
});
