import { prisma } from "@/lib/db";
import { logger } from "@/lib/logging";

/**
 * RIBBAI Inventory Financial Analytics Engine
 * 
 * This module provides financial analytics and KPIs for inventory management
 * using the CMP (Weighted-Average Cost) system.
 */

export interface InventoryFinancialSummary {
  totalInventoryValue: number;
  totalItems: number;
  totalCategories: number;
  lowStockItems: number;
  criticalStockItems: number;
  lastUpdated: Date;
}

export interface MonthlyFinancialSummary {
  month: string;
  year: number;
  totalEntriesValue: number;
  totalConsumptionValue: number;
  netStockChange: number;
  transactionCount: {
    entries: number;
    exits: number;
  };
}

export interface CategoryFinancialAnalysis {
  category: string;
  itemCount: number;
  totalQuantity: number;
  totalValue: number;
  averageCostPerItem: number;
  percentageOfTotalValue: number;
}

export interface TopConsumptionItem {
  sku: string;
  name: string;
  category: string;
  consumptionQuantity: number;
  consumptionValue: number;
  currentStock: number;
  averageCost: number;
}

export interface TopValueItem {
  sku: string;
  name: string;
  category: string;
  currentStock: number;
  averageCost: number;
  stockValue: number;
  percentageOfTotal: number;
}

export interface PriceTrendAlert {
  sku: string;
  name: string;
  category: string;
  currentAverageCost: number;
  lastPurchaseCost: number;
  priceDifferencePercentage: number;
  alertType: "PRICE_INCREASE" | "PRICE_DECREASE" | "SIGNIFICANT_CHANGE";
  lastPurchaseDate?: Date;
}

export interface InventoryFinancialDashboard {
  summary: InventoryFinancialSummary;
  monthlyTrends: MonthlyFinancialSummary[];
  categoryAnalysis: CategoryFinancialAnalysis[];
  topConsumptionItems: TopConsumptionItem[];
  topValueItems: TopValueItem[];
  priceAlerts: PriceTrendAlert[];
  generatedAt: Date;
}

/**
 * Get overall inventory financial summary
 */
export async function getInventoryFinancialSummary(): Promise<InventoryFinancialSummary> {
  const [totalValue, itemStats, lowStock, criticalStock] = await Promise.all([
    // Total inventory value
    prisma.inventoryItem.aggregate({
      _sum: { stockValue: true },
      where: { status: "ACTIVE" },
    }),

    // Item and category counts
    prisma.inventoryItem.aggregate({
      _count: { id: true },
      where: { status: "ACTIVE" },
    }),

    // Low stock items (below reorder point but above minimum)
    prisma.inventoryItem.count({
      where: {
        status: "ACTIVE",
        currentStock: {
          lte: prisma.inventoryItem.fields.reorderPoint,
          gt: prisma.inventoryItem.fields.minimumStock,
        },
      },
    }),

    // Critical stock items (at or below minimum stock)
    prisma.inventoryItem.count({
      where: {
        status: "ACTIVE",
        currentStock: { lte: prisma.inventoryItem.fields.minimumStock },
      },
    }),
  ]);

  // Count distinct categories
  const categories = await prisma.inventoryItem.findMany({
    where: { status: "ACTIVE" },
    select: { category: true },
    distinct: ["category"],
  });

  return {
    totalInventoryValue: Number(totalValue._sum.stockValue ?? 0),
    totalItems: itemStats._count.id,
    totalCategories: categories.length,
    lowStockItems: lowStock,
    criticalStockItems: criticalStock,
    lastUpdated: new Date(),
  };
}

/**
 * Get monthly financial trends
 */
export async function getMonthlyFinancialTrends(months: number = 6): Promise<MonthlyFinancialSummary[]> {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  startDate.setDate(1);
  startDate.setHours(0, 0, 0, 0);

  // Get monthly transaction summaries
  const transactions = await prisma.inventoryTransaction.findMany({
    where: {
      transactionDate: { gte: startDate },
    },
    select: {
      type: true,
      totalCost: true,
      transactionDate: true,
    },
  });

  // Group by month
  const monthlyData = new Map<string, MonthlyFinancialSummary>();

  for (const tx of transactions) {
    const date = new Date(tx.transactionDate);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    
    if (!monthlyData.has(monthKey)) {
      monthlyData.set(monthKey, {
        month: date.toLocaleString("pt-PT", { month: "long" }),
        year: date.getFullYear(),
        totalEntriesValue: 0,
        totalConsumptionValue: 0,
        netStockChange: 0,
        transactionCount: { entries: 0, exits: 0 },
      });
    }

    const data = monthlyData.get(monthKey)!;
    const cost = Number(tx.totalCost ?? 0);

    if (tx.type === "IN") {
      data.totalEntriesValue += cost;
      data.transactionCount.entries++;
      data.netStockChange += cost;
    } else if (tx.type === "OUT" || tx.type === "WASTAGE") {
      data.totalConsumptionValue += cost;
      data.transactionCount.exits++;
      data.netStockChange -= cost;
    }
  }

  return Array.from(monthlyData.values()).sort((a, b) => b.year - a.year || b.month.localeCompare(a.month));
}

/**
 * Get category financial analysis
 */
export async function getCategoryFinancialAnalysis(): Promise<CategoryFinancialAnalysis[]> {
  const categories = await prisma.inventoryItem.groupBy({
    by: ["category"],
    where: { status: "ACTIVE" },
    _count: { id: true },
    _sum: { 
      currentStock: true,
      stockValue: true,
    },
    _avg: { averageCost: true },
  });

  const totalValue = categories.reduce((sum, cat) => sum + Number(cat._sum.stockValue ?? 0), 0);

  return categories.map(cat => ({
    category: cat.category,
    itemCount: cat._count.id,
    totalQuantity: Number(cat._sum.currentStock ?? 0),
    totalValue: Number(cat._sum.stockValue ?? 0),
    averageCostPerItem: Number(cat._avg.averageCost ?? 0),
    percentageOfTotalValue: totalValue > 0 ? (Number(cat._sum.stockValue ?? 0) / totalValue) * 100 : 0,
  })).sort((a, b) => b.totalValue - a.totalValue);
}

/**
 * Get top consumption items (last 30 days)
 */
export async function getTopConsumptionItems(limit: number = 10): Promise<TopConsumptionItem[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const consumptionData = await prisma.inventoryTransaction.groupBy({
    by: ["itemId"],
    where: {
      type: { in: ["OUT", "WASTAGE"] },
      transactionDate: { gte: startDate },
    },
    _sum: {
      quantity: true,
      totalCost: true,
    },
    orderBy: {
      _sum: { totalCost: "desc" },
    },
    take: limit,
  });

  const itemIds = consumptionData.map(item => item.itemId);
  const items = await prisma.inventoryItem.findMany({
    where: { id: { in: itemIds } },
    select: {
      id: true,
      sku: true,
      name: true,
      category: true,
      currentStock: true,
      averageCost: true,
    },
  });

  const itemsMap = new Map(items.map(item => [item.id, item]));

  return consumptionData
    .map(data => {
      const item = itemsMap.get(data.itemId);
      if (!item) return null;

      return {
        sku: item.sku,
        name: item.name,
        category: item.category,
        consumptionQuantity: Number(data._sum.quantity ?? 0),
        consumptionValue: Number(data._sum.totalCost ?? 0),
        currentStock: Number(item.currentStock),
        averageCost: Number(item.averageCost),
      };
    })
    .filter((item): item is TopConsumptionItem => item !== null);
}

/**
 * Get top value items (by stock value)
 */
export async function getTopValueItems(limit: number = 10): Promise<TopValueItem[]> {
  const items = await prisma.inventoryItem.findMany({
    where: { 
      status: "ACTIVE",
      stockValue: { gt: 0 },
    },
    select: {
      sku: true,
      name: true,
      category: true,
      currentStock: true,
      averageCost: true,
      stockValue: true,
    },
    orderBy: { stockValue: "desc" },
    take: limit,
  });

  const totalValue = await prisma.inventoryItem.aggregate({
    _sum: { stockValue: true },
    where: { status: "ACTIVE" },
  });

  const total = Number(totalValue._sum.stockValue ?? 0);

  return items.map(item => ({
    sku: item.sku,
    name: item.name,
    category: item.category,
    currentStock: Number(item.currentStock),
    averageCost: Number(item.averageCost),
    stockValue: Number(item.stockValue),
    percentageOfTotal: total > 0 ? (Number(item.stockValue) / total) * 100 : 0,
  }));
}

/**
 * Get price trend alerts
 */
export async function getPriceTrendAlerts(thresholdPercentage: number = 15): Promise<PriceTrendAlert[]> {
  const items = await prisma.inventoryItem.findMany({
    where: {
      status: "ACTIVE",
      averageCost: { gt: 0 },
      lastPurchaseCost: { gt: 0 },
    },
    select: {
      sku: true,
      name: true,
      category: true,
      averageCost: true,
      lastPurchaseCost: true,
      lastPurchaseDate: true,
    },
  });

  return items
    .map(item => {
      const currentCost = Number(item.averageCost);
      const lastCost = Number(item.lastPurchaseCost);
      const priceDiff = ((lastCost - currentCost) / currentCost) * 100;
      
      if (Math.abs(priceDiff) < thresholdPercentage) return null;

      return {
        sku: item.sku,
        name: item.name,
        category: item.category,
        currentAverageCost: currentCost,
        lastPurchaseCost: lastCost,
        priceDifferencePercentage: priceDiff,
        alertType: priceDiff > 0 
          ? (priceDiff > 25 ? "SIGNIFICANT_CHANGE" : "PRICE_INCREASE")
          : (priceDiff < -25 ? "SIGNIFICANT_CHANGE" : "PRICE_DECREASE") as const,
        lastPurchaseDate: item.lastPurchaseDate,
      };
    })
    .filter((alert): alert is PriceTrendAlert => alert !== null)
    .sort((a, b) => Math.abs(b.priceDifferencePercentage) - Math.abs(a.priceDifferencePercentage));
}

/**
 * Get complete inventory financial dashboard
 */
export async function getInventoryFinancialDashboard(): Promise<InventoryFinancialDashboard> {
  logger.info("Generating inventory financial dashboard");

  const [
    summary,
    monthlyTrends,
    categoryAnalysis,
    topConsumptionItems,
    topValueItems,
    priceAlerts,
  ] = await Promise.all([
    getInventoryFinancialSummary(),
    getMonthlyFinancialTrends(6),
    getCategoryFinancialAnalysis(),
    getTopConsumptionItems(10),
    getTopValueItems(10),
    getPriceTrendAlerts(15),
  ]);

  logger.info("Inventory financial dashboard generated successfully", {
    totalValue: summary.totalInventoryValue,
    totalItems: summary.totalItems,
    categoriesCount: categoryAnalysis.length,
    alertsCount: priceAlerts.length,
  });

  return {
    summary,
    monthlyTrends,
    categoryAnalysis,
    topConsumptionItems,
    topValueItems,
    priceAlerts,
    generatedAt: new Date(),
  };
}