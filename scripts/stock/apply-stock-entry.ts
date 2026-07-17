import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logging";
import {
  calculateCMPForStockEntry,
  generateCMPUpdateData,
  validateCMPInputs,
} from "@/lib/inventory-cmp";

import { parseCliArgs, loadJsonFile } from "./lib/cli";
import { stockEntryInputSchema } from "./lib/schemas";
import { revertReferenceIfNeeded } from "./lib/revert";
import { assertPostWriteCoherence } from "./lib/coherence-guard";
import { writeOperationDocs, type MovementRow } from "./lib/docs";
import { findItemsWithSameName } from "./lib/duplicate-check";
import { runUpdateMonthlyPreviewFor } from "../update-monthly-preview-for-date";

const REFERENCE_TYPE = "SUPPLIER_DELIVERY";

function resolveDate(rawDate: string): Date {
  const value = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? `${rawDate}T10:00:00.000Z` : rawDate;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Data invalida no ficheiro de entrada: ${rawDate}`);
  }
  return date;
}

function getStatus(currentStock: Prisma.Decimal, reorderPoint: Prisma.Decimal): "Saudavel" | "Critico" {
  return currentStock.eq(0) || currentStock.lte(reorderPoint) ? "Critico" : "Saudavel";
}

async function main(): Promise<void> {
  const { file, force, forceNewSku } = parseCliArgs();
  if (!file) {
    throw new Error(
      "Uso: npx tsx scripts/stock/apply-stock-entry.ts --file=<caminho.json> [--force] [--force-new-sku]",
    );
  }

  const raw = await loadJsonFile(file);
  const input = stockEntryInputSchema.parse(raw);
  const transactionDate = resolveDate(input.date);

  logger.info("Starting canonical stock entry", {
    referenceId: input.referenceId,
    lines: input.lines.length,
  });

  await revertReferenceIfNeeded(prisma, input.referenceId, REFERENCE_TYPE, force);

  const rows: MovementRow[] = [];

  await prisma.$transaction(async (tx) => {
    const supplier = await tx.supplier.upsert({
      where: { code: input.supplierCode },
      update: {},
      create: {
        code: input.supplierCode,
        name: input.supplierName,
        createdBy: input.createdBy,
      },
    });

    for (const line of input.lines) {
      const quantity = new Prisma.Decimal(line.quantity);
      const unitCost = new Prisma.Decimal(line.unitCost);

      const existingBySku = await tx.inventoryItem.findUnique({
        where: { sku: line.sku },
        select: { sku: true },
      });

      if (!existingBySku && !forceNewSku) {
        const similar = await findItemsWithSameName(tx, line.name, line.sku);
        if (similar.length > 0) {
          throw new Error(
            `SKU ${line.sku} nao existe, mas ja existe(m) artigo(s) com o mesmo nome "${line.name}": ${similar
              .map((s) => `${s.sku} (status=${s.status}, stock=${s.currentStock})`)
              .join(", ")}. Usa um desses SKUs, ou corre novamente com --force-new-sku se este for mesmo um artigo diferente.`,
          );
        }
      }

      const item = await tx.inventoryItem.upsert({
        where: { sku: line.sku },
        update: {
          name: line.name,
          category: line.category,
          subCategory: line.subCategory,
          supplierId: supplier.id,
          unit: line.unit,
          // Receber stock implica que o artigo voltou a estar em uso -
          // reativa-o se tinha sido soft-deleted/marcado inativo (ex.: SKU
          // que ja existia mas nunca tinha sido usado, ou foi retirado por
          // engano).
          status: "ACTIVE",
          updatedBy: input.createdBy,
        },
        create: {
          sku: line.sku,
          name: line.name,
          category: line.category,
          subCategory: line.subCategory,
          supplierId: supplier.id,
          unit: line.unit,
          costPrice: unitCost,
          currentStock: new Prisma.Decimal(0),
          minimumStock: line.minimumStock ? new Prisma.Decimal(line.minimumStock) : new Prisma.Decimal(1),
          reorderPoint: line.reorderPoint ? new Prisma.Decimal(line.reorderPoint) : new Prisma.Decimal(1),
          averageCost: new Prisma.Decimal(0),
          lastPurchaseCost: new Prisma.Decimal(0),
          stockValue: new Prisma.Decimal(0),
          createdBy: input.createdBy,
          updatedBy: input.createdBy,
        },
      });

      const cmpInput = {
        currentStock: item.currentStock,
        currentAverageCost: item.averageCost,
        incomingQuantity: quantity,
        incomingUnitCost: unitCost,
      };
      validateCMPInputs(cmpInput);
      const cmpResult = calculateCMPForStockEntry(cmpInput);
      const cmpUpdateData = generateCMPUpdateData(cmpResult, unitCost, transactionDate);

      const additionalUpdateData: Record<string, unknown> = {
        costPrice: unitCost,
        updatedBy: input.createdBy,
      };
      if (line.minimumStock) additionalUpdateData.minimumStock = new Prisma.Decimal(line.minimumStock);
      if (line.reorderPoint) additionalUpdateData.reorderPoint = new Prisma.Decimal(line.reorderPoint);

      await tx.inventoryItem.update({
        where: { id: item.id },
        data: { ...cmpUpdateData, ...additionalUpdateData },
      });

      await tx.inventoryTransaction.create({
        data: {
          itemId: item.id,
          type: "IN",
          quantity,
          unit: line.unit,
          unitCost,
          totalCost: cmpResult.entryValue,
          referenceType: REFERENCE_TYPE,
          referenceId: input.referenceId,
          supplierId: supplier.id,
          balanceAfter: cmpResult.newTotalQuantity,
          reason: `Entrada de stock - ${input.referenceId}.`,
          notes: line.notes ?? "",
          createdBy: input.createdBy,
          transactionDate,
        },
      });

      const reorderPoint = (line.reorderPoint ? new Prisma.Decimal(line.reorderPoint) : item.reorderPoint);
      rows.push({
        sku: line.sku,
        name: line.name,
        unit: line.unit,
        previousStock: item.currentStock.toString(),
        delta: `+${quantity.toString()}`,
        finalStock: cmpResult.newTotalQuantity.toString(),
        unitCost: `${unitCost.toFixed(2)} €`,
        totalCost: `${cmpResult.entryValue.toFixed(2)} €`,
        status: getStatus(cmpResult.newTotalQuantity, reorderPoint),
        notes: line.notes,
      });
    }
  });

  await assertPostWriteCoherence(prisma, input.referenceId, REFERENCE_TYPE);

  const totalEntryValue = rows.reduce((sum, row) => sum + Number.parseFloat(row.totalCost ?? "0"), 0);

  const docs = await writeOperationDocs(
    {
      kind: "entry",
      referenceId: input.referenceId,
      referenceType: REFERENCE_TYPE,
      date: transactionDate,
      createdBy: input.createdBy,
      title: "Inventory Entry Record",
      extraSummary: {
        Fornecedor: input.supplierName,
        "Valor total da entrada": `${totalEntryValue.toFixed(2)} €`,
      },
    },
    rows,
  );

  logger.info("Stock entry applied and documented", {
    referenceId: input.referenceId,
    recordPath: docs.recordPath,
  });

  await runUpdateMonthlyPreviewFor(transactionDate);
}

main()
  .catch((error: unknown) => {
    logger.error("Failed to apply stock entry", { error });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
