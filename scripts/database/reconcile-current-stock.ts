import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logging";

/**
 * Reconciliation script — corrects InventoryItem.currentStock whenever it has
 * drifted from the balanceAfter of the item's own most recent InventoryTransaction.
 *
 * This can happen when a script updates currentStock without inserting a
 * paired transaction (or deletes/reverts a transaction without restoring the
 * item). Every correction this script makes is itself recorded as an
 * auditable ADJUSTMENT transaction — currentStock must never be corrected
 * silently.
 *
 * Usage:
 *   npx tsx scripts/database/reconcile-current-stock.ts            # dry-run (report only)
 *   npx tsx scripts/database/reconcile-current-stock.ts --apply    # apply corrections
 */

const TOLERANCE = new Prisma.Decimal("0.001");
const CREATED_BY = "SYSTEM_RECONCILIATION";
const REFERENCE_TYPE = "SYSTEM_RECONCILIATION";

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    apply: args.includes("--apply"),
  };
}

interface Divergence {
  itemId: string;
  sku: string;
  name: string;
  unit: string;
  currentStock: Prisma.Decimal;
  averageCost: Prisma.Decimal;
  expectedBalance: Prisma.Decimal;
  lastTransactionDate: Date;
  lastReferenceId: string | null;
}

async function findDivergences(): Promise<Divergence[]> {
  const items = await prisma.inventoryItem.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      sku: true,
      name: true,
      unit: true,
      currentStock: true,
      averageCost: true,
    },
  });

  const divergences: Divergence[] = [];

  for (const item of items) {
    const lastTransaction = await prisma.inventoryTransaction.findFirst({
      where: { itemId: item.id },
      orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
      select: { balanceAfter: true, transactionDate: true, referenceId: true },
    });

    if (!lastTransaction) {
      continue;
    }

    const diff = item.currentStock.sub(lastTransaction.balanceAfter).abs();

    if (diff.gt(TOLERANCE)) {
      divergences.push({
        itemId: item.id,
        sku: item.sku,
        name: item.name,
        unit: item.unit,
        currentStock: item.currentStock,
        averageCost: item.averageCost,
        expectedBalance: lastTransaction.balanceAfter,
        lastTransactionDate: lastTransaction.transactionDate,
        lastReferenceId: lastTransaction.referenceId,
      });
    }
  }

  return divergences;
}

async function applyCorrection(divergence: Divergence, runId: string): Promise<void> {
  const correctedStockValue = divergence.expectedBalance.mul(divergence.averageCost);
  const delta = divergence.expectedBalance.sub(divergence.currentStock);

  await prisma.$transaction([
    prisma.inventoryItem.update({
      where: { id: divergence.itemId },
      data: {
        currentStock: divergence.expectedBalance,
        stockValue: correctedStockValue,
        updatedBy: CREATED_BY,
      },
    }),
    prisma.inventoryTransaction.create({
      data: {
        itemId: divergence.itemId,
        type: "ADJUSTMENT",
        quantity: delta.abs(),
        unit: divergence.unit,
        referenceType: REFERENCE_TYPE,
        referenceId: `${runId}-${divergence.sku}`,
        balanceAfter: divergence.expectedBalance,
        reason: "Reconciliacao de coerencia currentStock vs ledger de transacoes.",
        notes: `currentStock estava em ${divergence.currentStock.toString()} ${divergence.unit}, corrigido para ${divergence.expectedBalance.toString()} ${divergence.unit} (valor da ultima transacao registada, ref ${divergence.lastReferenceId ?? "desconhecida"} de ${divergence.lastTransactionDate.toISOString()}).`,
        createdBy: CREATED_BY,
        transactionDate: new Date(),
      },
    }),
  ]);
}

async function main(): Promise<void> {
  const { apply } = parseArgs();
  const runId = `RECONCILE-${new Date().toISOString().replace(/[:.]/g, "-")}`;

  logger.info("Starting currentStock reconciliation", { mode: apply ? "apply" : "dry-run" });

  const divergences = await findDivergences();

  if (divergences.length === 0) {
    console.warn("Nenhuma divergencia encontrada entre currentStock e o ledger de transacoes.");
    return;
  }

  console.warn(`Encontradas ${divergences.length} divergencia(s):\n`);
  for (const divergence of divergences) {
    console.warn(
      `${divergence.sku} (${divergence.name}): currentStock=${divergence.currentStock.toString()} ${divergence.unit} | esperado (ultima transacao)=${divergence.expectedBalance.toString()} ${divergence.unit} | ultima ref=${divergence.lastReferenceId ?? "-"} (${divergence.lastTransactionDate.toISOString()})`,
    );
  }

  if (!apply) {
    console.warn(
      "\nModo dry-run. Nenhuma alteracao foi feita. Corre novamente com --apply para corrigir e registar a transacao de ajuste.",
    );
    return;
  }

  console.warn(`\nA aplicar correcoes (referencia de execucao: ${runId})...`);
  for (const divergence of divergences) {
    await applyCorrection(divergence, runId);
    logger.info("Reconciled item", {
      sku: divergence.sku,
      from: divergence.currentStock.toString(),
      to: divergence.expectedBalance.toString(),
    });
  }

  console.warn(`\n${divergences.length} artigo(s) corrigido(s). Cada correcao ficou registada como transacao ADJUSTMENT (referenceType=${REFERENCE_TYPE}).`);
}

main()
  .catch((error: unknown) => {
    logger.error("Reconciliation failed", { error });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
