import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logging";

import { parseCliArgs, loadJsonFile } from "./lib/cli";
import { weeklyCountInputSchema } from "./lib/schemas";
import { revertReferenceIfNeeded } from "./lib/revert";
import { assertPostWriteCoherence } from "./lib/coherence-guard";
import { writeOperationDocs, type MovementRow } from "./lib/docs";
import { resolveBaseline } from "./lib/backdating";
import { runUpdateMonthlyPreviewFor } from "../update-monthly-preview-for-date";

const REFERENCE_TYPE = "WEEKLY_COUNT";

function resolveDate(rawDate: string): Date {
  const value = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? `${rawDate}T12:00:00.000Z` : rawDate;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Data invalida no ficheiro de contagem: ${rawDate}`);
  }
  return date;
}

function getStatus(currentStock: Prisma.Decimal, reorderPoint: Prisma.Decimal): "Saudavel" | "Critico" {
  return currentStock.eq(0) || currentStock.lte(reorderPoint) ? "Critico" : "Saudavel";
}

async function main(): Promise<void> {
  const { file, force } = parseCliArgs();
  if (!file) {
    throw new Error("Uso: npx tsx scripts/stock/apply-weekly-count.ts --file=<caminho.json> [--force]");
  }

  const raw = await loadJsonFile(file);
  const input = weeklyCountInputSchema.parse(raw);
  const transactionDate = resolveDate(input.date);
  const referenceId = `WEEKLY-COUNT-${input.date}`;

  logger.info("Starting canonical weekly count", { referenceId, lines: input.lines.length });

  await revertReferenceIfNeeded(prisma, referenceId, REFERENCE_TYPE, force);

  const rows: MovementRow[] = [];
  const touchedItemIds: string[] = [];

  await prisma.$transaction(async (tx) => {
    for (const line of input.lines) {
      const actualQuantity = new Prisma.Decimal(line.quantity);

      const item = await tx.inventoryItem.findUniqueOrThrow({
        where: { sku: line.sku },
      });

      const baseline = await resolveBaseline(tx, item.id, transactionDate);
      const systemQuantityAtDate = baseline.isBackdated ? baseline.priorBalance : item.currentStock;
      const variance = actualQuantity.sub(systemQuantityAtDate);
      const varianceAbs = variance.abs();

      if (baseline.isBackdated) {
        // Ver scripts/stock/lib/backdating.ts: uma transacao mais recente ja
        // existe para este artigo - nao tocamos em currentStock, so
        // registamos esta contagem retroativa para efeitos de auditoria.
        logger.warn("Contagem com data anterior a uma transacao ja existente - stock atual do artigo nao foi alterado", {
          sku: line.sku,
          transactionDate: transactionDate.toISOString(),
          supersededByDate: baseline.supersededByDate?.toISOString(),
        });
      } else {
        await tx.inventoryItem.update({
          where: { id: item.id },
          data: {
            currentStock: actualQuantity,
            stockValue: actualQuantity.mul(item.averageCost),
            status: "ACTIVE",
            updatedBy: input.createdBy,
            lastInventoryDate: transactionDate,
          },
        });
      }

      if (varianceAbs.gt(0)) {
        await tx.inventoryTransaction.create({
          data: {
            itemId: item.id,
            type: "ADJUSTMENT",
            quantity: varianceAbs,
            unit: item.unit,
            unitCost: item.costPrice,
            totalCost: item.costPrice.mul(varianceAbs),
            referenceType: REFERENCE_TYPE,
            referenceId,
            balanceAfter: actualQuantity,
            reason: `Ajuste de inventario semanal (${variance.gte(0) ? "entrada" : "saida"} por contagem).`,
            notes: `Contagem fisica oficial registada em ${input.date}.`,
            createdBy: input.createdBy,
            transactionDate,
          },
        });
        touchedItemIds.push(item.id);
      }

      rows.push({
        sku: line.sku,
        name: line.name,
        unit: line.unit,
        previousStock: systemQuantityAtDate.toString(),
        delta: `${variance.gte(0) ? "+" : ""}${variance.toString()}`,
        finalStock: actualQuantity.toString(),
        status: getStatus(actualQuantity, item.reorderPoint),
      });
    }
  });

  if (touchedItemIds.length > 0) {
    await assertPostWriteCoherence(prisma, referenceId, REFERENCE_TYPE);
  }

  const docs = await writeOperationDocs(
    {
      kind: "count",
      referenceId,
      referenceType: REFERENCE_TYPE,
      date: transactionDate,
      createdBy: input.createdBy,
      title: "Weekly Inventory Count Record",
      extraSummary: { "Artigos com variancia": String(touchedItemIds.length) },
    },
    rows,
  );

  logger.info("Weekly count applied and documented", { referenceId, recordPath: docs.recordPath });

  await runUpdateMonthlyPreviewFor(transactionDate);
}

main()
  .catch((error: unknown) => {
    logger.error("Failed to apply weekly count", { error });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
