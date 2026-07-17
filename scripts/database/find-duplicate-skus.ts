import { prisma } from "@/lib/db";
import { logger } from "@/lib/logging";
import { normalizeItemName } from "../stock/lib/duplicate-check";

/**
 * Periodic health check: scans every InventoryItem (any status) for names
 * that collide once normalized, regardless of SKU. Every duplicate-SKU bug
 * found in the 2026-07 audit (Guardanapos, Guardanapos Pequenos, D-50,
 * Lava-Louça Universal) had this exact shape - a new SKU created for a
 * product that already existed under a different one, silently splitting
 * its stock/history/report visibility across two records.
 *
 * apply-stock-entry.ts blocks this at creation time now, but this script
 * exists to catch anything created before that guard existed, or created
 * outside the canonical workflow. Always exits 0 - this is a report, not a
 * gate, since a name collision needs a human to confirm before merging.
 *
 * Usage: npx tsx scripts/database/find-duplicate-skus.ts
 */

async function main(): Promise<void> {
  const items = await prisma.inventoryItem.findMany({
    select: { sku: true, name: true, status: true, currentStock: true, unit: true, deletedAt: true },
    orderBy: { name: "asc" },
  });

  const byName = new Map<string, typeof items>();
  for (const item of items) {
    const key = normalizeItemName(item.name);
    const group = byName.get(key) ?? [];
    group.push(item);
    byName.set(key, group);
  }

  // So interessa reportar duplicados ainda por resolver: grupos com mais do
  // que um artigo ACTIVE. Duplicados ja consolidados (um sobrevivente ACTIVE,
  // os restantes INACTIVE/soft-deleted via merge-duplicate-sku.ts) ficam de
  // fora - sao historico, nao um problema a corrigir.
  const duplicates = [...byName.entries()].filter(
    ([, group]) => group.filter((item) => item.status === "ACTIVE" && !item.deletedAt).length > 1,
  );

  if (duplicates.length === 0) {
    console.warn("Nenhum nome de artigo com mais do que um SKU ativo encontrado.");
    return;
  }

  console.warn(`Encontrados ${duplicates.length} nome(s) de artigo com mais do que um SKU:\n`);
  for (const [name, group] of duplicates) {
    console.warn(`"${name}":`);
    for (const item of group) {
      console.warn(
        `  ${item.sku} | status=${item.status} | currentStock=${item.currentStock.toString()} ${item.unit} | deletedAt=${item.deletedAt ? item.deletedAt.toISOString() : "-"}`,
      );
    }
    console.warn("");
  }
  console.warn(
    "Se forem o mesmo artigo, consolida com: npx tsx scripts/database/merge-duplicate-sku.ts --from=<SKU_A_RETIRAR> --into=<SKU_CANONICO>",
  );
}

main()
  .catch((error: unknown) => {
    logger.error("Failed to scan for duplicate SKUs", { error });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
