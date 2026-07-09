import { Prisma, PrismaClient } from "@prisma/client";

import { BaseService, type ServiceContext } from "../base";
import {
  calculateCMPForStockEntry,
  calculateConsumptionValue,
  generateCMPUpdateData,
  generateStockExitUpdateData,
  validateCMPInputs,
  validateStockExitInputs,
} from "@/lib/inventory-cmp";

type TransactionClient = PrismaClient | Prisma.TransactionClient;

export type StockInInput = {
  sku: string;
  name: string;
  category: string;
  subCategory?: string;
  unit: string;
  quantity: Prisma.Decimal;
  unitCost: Prisma.Decimal;
  supplierId?: string;
  referenceType?: string;
  referenceId?: string;
  costMetadata?: {
    lastPurchaseDate?: Date;
  };
  audit: {
    createdBy: string;
    transactionDate: Date;
  };
};

export type StockOutInput = {
  sku: string;
  quantity: Prisma.Decimal;
  unit: string;
  referenceType: string;
  referenceId: string;
  reason: string;
  notes?: string;
  audit: {
    createdBy: string;
    transactionDate: Date;
  };
};

export type WeeklyCountLine = {
  sku: string;
  actualQuantity: Prisma.Decimal;
  notes?: string | null;
};

export type ApplyWeeklyCountInput = {
  weekNumber: number;
  year: number;
  countedAt: Date;
  referenceId: string;
  referenceType: string;
  countedBy: string;
  createdBy: string;
  notes?: string;
  lines: WeeklyCountLine[];
  supplierId?: string;
};

export class InventoryService extends BaseService {
  private readonly prisma: PrismaClient;

  constructor(prismaClient: PrismaClient, context: ServiceContext = {}) {
    super(context);
    this.prisma = prismaClient;
  }

  async recordStockIn(input: StockInInput): Promise<void> {
    const { sku, name, category, subCategory, unit, quantity, unitCost, supplierId, referenceId, referenceType, costMetadata, audit } =
      input;

    const tx = this.prisma.$transaction.bind(this.prisma) as TransactionClient["$transaction"];

    await tx(async (client) => {
      const existingItem = await client.inventoryItem.findUnique({ where: { sku } });

      if (!existingItem) {
        const created = await client.inventoryItem.create({
          data: {
            sku,
            name,
            category,
            subCategory,
            unit,
            supplierId,
            costPrice: unitCost,
            currency: "EUR",
            currentStock: quantity,
            minimumStock: new Prisma.Decimal("0"),
            reorderPoint: new Prisma.Decimal("0"),
            status: "ACTIVE",
            createdBy: audit.createdBy,
            updatedBy: audit.createdBy,
          },
        });

        await client.inventoryTransaction.create({
          data: {
            itemId: created.id,
            type: "IN",
            quantity,
            unit,
            unitCost,
            totalCost: unitCost.mul(quantity),
            referenceType,
            referenceId,
            supplierId,
            balanceAfter: quantity,
            reason: "Initial stock entry",
            createdBy: audit.createdBy,
            transactionDate: audit.transactionDate,
          },
        });

        return;
      }

      const currentStock = existingItem.currentStock;
      const currentAverageCost = existingItem.averageCost;

      const cmpInput = {
        currentStock,
        currentAverageCost,
        incomingQuantity: quantity,
        incomingUnitCost: unitCost,
      };

      validateCMPInputs(cmpInput);

      const cmpResult = calculateCMPForStockEntry(cmpInput);
      const cmpUpdateData = generateCMPUpdateData(
        cmpResult,
        unitCost,
        costMetadata?.lastPurchaseDate ?? audit.transactionDate,
      );

      await client.inventoryItem.update({
        where: { id: existingItem.id },
        data: {
          name,
          category,
          subCategory,
          unit,
          supplierId,
          costPrice: unitCost,
          ...cmpUpdateData,
          updatedBy: audit.createdBy,
        },
      });

      await client.inventoryTransaction.create({
        data: {
          itemId: existingItem.id,
          type: "IN",
          quantity,
          unit,
          unitCost,
          totalCost: cmpResult.entryValue,
          referenceType,
          referenceId,
          supplierId,
          balanceAfter: cmpResult.newTotalQuantity,
          reason: "Stock entry with CMP",
          createdBy: audit.createdBy,
          transactionDate: audit.transactionDate,
        },
      });
    });
  }

  async recordStockOut(input: StockOutInput): Promise<void> {
    const { sku, quantity, unit, referenceId, referenceType, reason, notes, audit } = input;

    const tx = this.prisma.$transaction.bind(this.prisma) as TransactionClient["$transaction"];

    await tx(async (client) => {
      const item = await client.inventoryItem.findUnique({ where: { sku } });
      if (!item) {
        throw new Error(`Inventory item not found: ${sku}`);
      }

      const exitInput = {
        currentStock: item.currentStock,
        currentAverageCost: item.averageCost,
        exitQuantity: quantity,
      };

      validateStockExitInputs(exitInput);

      const exitResult = calculateConsumptionValue(exitInput);
      const updateData = generateStockExitUpdateData(exitResult);

      await client.inventoryItem.update({
        where: { id: item.id },
        data: {
          ...updateData,
          updatedBy: audit.createdBy,
        },
      });

      await client.inventoryTransaction.create({
        data: {
          itemId: item.id,
          type: referenceType === "CONSUMPTION" ? "OUT" : (referenceType as any),
          quantity,
          unit,
          unitCost: item.averageCost,
          totalCost: exitResult.consumptionValue,
          referenceType,
          referenceId,
          balanceAfter: exitResult.newTotalQuantity,
          reason,
          notes,
          createdBy: audit.createdBy,
          transactionDate: audit.transactionDate,
        },
      });
    });
  }
}

