import type { Prisma, PrismaClient } from "@prisma/client";

export interface SimilarItemMatch {
  sku: string;
  name: string;
  status: string;
  currentStock: string;
}

/**
 * Normalizes a product name for duplicate detection: trims, lowercases, and
 * collapses internal whitespace. Every duplicate-SKU case found in the
 * 2026-07 audit (Guardanapos, Guardanapos Pequenos, D-50, Lava-Louça
 * Universal) had an exact name match once normalized this way — no fuzzy
 * matching needed, and fuzzy matching would risk false positives.
 */
export function normalizeItemName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Finds any InventoryItem (regardless of status) whose name matches the
 * given name once normalized, excluding a specific SKU (e.g. the item being
 * looked up). Used to stop a new duplicate SKU from being created for a
 * product that already exists under a different SKU.
 */
export async function findItemsWithSameName(
  prisma: Pick<PrismaClient, "inventoryItem">,
  name: string,
  excludeSku?: string,
): Promise<SimilarItemMatch[]> {
  const target = normalizeItemName(name);

  const candidates = await prisma.inventoryItem.findMany({
    select: { sku: true, name: true, status: true, currentStock: true },
  });

  return candidates
    .filter(
      (item) => normalizeItemName(item.name) === target && item.sku !== excludeSku,
    )
    .map((item) => ({
      sku: item.sku,
      name: item.name,
      status: item.status,
      currentStock: (item.currentStock as Prisma.Decimal).toString(),
    }));
}
