import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logging";
import {
  calculateConsumptionValue,
  generateStockExitUpdateData,
  validateStockExitInputs,
} from "@/lib/inventory-cmp";

import { parseCliArgs, loadJsonFile } from "./lib/cli";
import { stockExitInputSchema } from "./lib/schemas";
import { revertReferenceIfNeeded } from "./lib/revert";
import { assertPostWriteCoherence } from "./lib/coherence-guard";
import { writeOperationDocs, type MovementRow } from "./lib/docs";
import { resolveBaseline } from "./lib/backdating";
import { runUpdateMonthlyPreviewFor } from "../update-monthly-preview-for-date";

function resolveDate(rawDate: string): Date {
  const value = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? `${rawDate}T10:00:00.000Z` : rawDate;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Data invalida no ficheiro de saida: ${rawDate}`);
  }
  return date;
}

function getStatus(currentStock: Prisma.Decimal, reorderPoint: Prisma.Decimal): "Saudavel" | "Critico" {
  return currentStock.eq(0) || currentStock.lte(reorderPoint) ? "Critico" : "Saudavel";
}

async function main(): Promise<void> {
  const { file, force } = parseCliArgs();
  if (!file) {
    throw new Error("Uso: npx tsx scripts/stock/apply-stock-exit.ts --file=<caminho.json> [--force]");
  }

  const raw = await loadJsonFile(file);
  const input = stockExitInputSchema.parse(raw);
  const transactionDate = resolveDate(input.date);
  const referenceType = input.type === "WASTAGE" ? "WASTAGE" : "STOCK_EXIT";

  logger.info("Starting canonical stock exit", {
    referenceId: input.referenceId,
    type: input.type,
    lines: input.lines.length,
  });

  await revertReferenceIfNeeded(prisma, input.referenceId, referenceType, force);

  const rows: MovementRow[] = [];

  await prisma.$transaction(async (tx) => {
    for (const line of input.lines) {
      const exitQuantity = new Prisma.Decimal(line.quantity);

      const item = await tx.inventoryItem.findUniqueOrThrow({
        where: { sku: line.sku },
      });

      const baseline = await resolveBaseline(tx, item.id, transactionDate);

      let finalStock: Prisma.Decimal;
      let consumptionValue: Prisma.Decimal;

      if (baseline.isBackdated) {
        // Ver scripts/stock/lib/backdating.ts: uma transacao mais recente ja
        // existe para este artigo, por isso nao tocamos em currentStock -
        // so registamos esta saida com data retroativa para efeitos de
        // auditoria/relatorio.
        if (baseline.priorBalance.lt(exitQuantity)) {
          throw new Error(
            `Saida retroativa de ${exitQuantity.toString()} ${item.unit} para ${line.sku} excede o stock existente nessa data (${baseline.priorBalance.toString()}).`,
          );
        }
        finalStock = baseline.priorBalance.sub(exitQuantity);
        consumptionValue = exitQuantity.mul(item.averageCost);

        logger.warn("Saida com data anterior a uma transacao ja existente - stock atual do artigo nao foi alterado", {
          sku: line.sku,
          transactionDate: transactionDate.toISOString(),
          supersededByDate: baseline.supersededByDate?.toISOString(),
        });
      } else {
        const exitInput = {
          currentStock: item.currentStock,
          currentAverageCost: item.averageCost,
          exitQuantity,
        };
        validateStockExitInputs(exitInput);
        const exitResult = calculateConsumptionValue(exitInput);
        const updateData = generateStockExitUpdateData(exitResult);

        await tx.inventoryItem.update({
          where: { id: item.id },
          data: { ...updateData, updatedBy: input.createdBy },
        });

        finalStock = exitResult.newTotalQuantity;
        consumptionValue = exitResult.consumptionValue;
      }

      await tx.inventoryTransaction.create({
        data: {
          itemId: item.id,
          type: input.type,
          quantity: exitQuantity,
          unit: item.unit,
          unitCost: item.averageCost,
          totalCost: consumptionValue,
          referenceType,
          referenceId: input.referenceId,
          balanceAfter: finalStock,
          reason: input.reason,
          notes: line.notes ?? "",
          createdBy: input.createdBy,
          transactionDate,
        },
      });

      rows.push({
        sku: line.sku,
        name: item.name,
        unit: item.unit,
        previousStock: item.currentStock.toString(),
        delta: `-${exitQuantity.toString()}`,
        finalStock: finalStock.toString(),
        unitCost: `${item.averageCost.toFixed(2)} €`,
        totalCost: `${consumptionValue.toFixed(2)} €`,
        status: getStatus(finalStock, item.reorderPoint),
        notes: line.notes,
      });
    }
  });

  await assertPostWriteCoherence(prisma, input.referenceId, referenceType);

  const docs = await writeOperationDocs(
    {
      kind: "exit",
      referenceId: input.referenceId,
      referenceType,
      date: transactionDate,
      createdBy: input.createdBy,
      title: "Inventory Exit Record",
      extraSummary: { Motivo: input.reason },
    },
    rows,
  );

  logger.info("Stock exit applied and documented", {
    referenceId: input.referenceId,
    recordPath: docs.recordPath,
  });

  await runUpdateMonthlyPreviewFor(transactionDate);
}

main()
  .catch((error: unknown) => {
    logger.error("Failed to apply stock exit", { error });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
