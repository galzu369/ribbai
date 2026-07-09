/**
 * RIBBAI Business Intelligence - Financial KPIs Service
 * 
 * Extends the existing CMP financial system with additional business intelligence
 * including waste tracking, incident impact, and operational cost analysis.
 */

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logging";
import { FinancialMetrics, KPIValue } from "../types";
import { getInventoryFinancialDashboard } from "@/lib/inventory-financial-analytics";
import { normalizeKPIValue } from "../utils/data-transforms";

export class FinancialKPIService {
  /**
   * Calculate comprehensive financial metrics extending existing CMP system
   */
  static async calculateFinancialMetrics(
    startDate: Date,
    endDate: Date
  ): Promise<FinancialMetrics> {
    logger.info("Calculating comprehensive financial metrics", { 
      startDate: startDate.toISOString(), 
      endDate: endDate.toISOString() 
    });

    try {
      // Get current inventory value from existing CMP system
      const currentInventoryValue = await this.getCurrentInventoryValue();

      // Calculate parallel metrics for better performance
      const [
        entryValue,
        consumptionMetrics,
        wasteMetrics,
        incidentImpact,
        operationalCosts,
        consumptionAnalysis
      ] = await Promise.all([
        this.getInventoryEntryValue(startDate, endDate),
        this.getConsumptionMetrics(startDate, endDate),
        this.getWasteMetrics(startDate, endDate),
        this.getIncidentFinancialImpact(startDate, endDate),
        this.getOperationalCosts(startDate, endDate),
        this.getConsumptionAnalysis(startDate, endDate)
      ]);

      const metrics: FinancialMetrics = {
        currentInventoryValue,
        entryValue,
        consumptionValue: consumptionMetrics.totalConsumption,
        averageCMP: await this.getAverageCMP(),
        consumptionByCategory: consumptionAnalysis.consumptionByCategory,
        weeklyConsumption: consumptionMetrics.weeklyConsumption,
        monthlyConsumption: consumptionMetrics.monthlyConsumption,
        dailyAverageCost: operationalCosts.dailyAverageCost,
        wasteValue: wasteMetrics.wasteValue,
        operationalErrorValue: wasteMetrics.operationalErrors,
        returnedProductsValue: wasteMetrics.returnedProducts,
        offersValue: await this.getOffersValue(startDate, endDate),
        cashDiscrepancies: await this.getCashDiscrepancies(startDate, endDate),
        incidentFinancialImpact: incidentImpact.totalImpact,
      };

      logger.info("Financial metrics calculated successfully", {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        inventoryValue: metrics.currentInventoryValue.value,
        totalWaste: metrics.wasteValue.value,
      });

      return metrics;
    } catch (error) {
      logger.error("Failed to calculate financial metrics", { error, startDate, endDate });
      throw error;
    }
  }

  /**
   * Get current inventory value (leverages existing CMP system)
   */
  static async getCurrentInventoryValue(): Promise<KPIValue> {
    try {
      const dashboard = await getInventoryFinancialDashboard();
      
      // Get historical data for trend calculation
      const previousValue = await this.getHistoricalInventoryValue();
      
      const trend = previousValue 
        ? dashboard.summary.totalInventoryValue > previousValue ? "increasing"
        : dashboard.summary.totalInventoryValue < previousValue ? "decreasing"
        : "stable"
        : "stable";

      return {
        value: dashboard.summary.totalInventoryValue,
        previousValue,
        trend,
        status: dashboard.summary.totalInventoryValue > 1000 ? "good" 
               : dashboard.summary.totalInventoryValue > 500 ? "warning" 
               : "critical",
        unit: "EUR",
      };
    } catch (error) {
      logger.error("Failed to get inventory value", { error });
      throw new Error(`Failed to get inventory value: ${error}`);
    }
  }

  /**
   * Get historical inventory value for trend analysis
   */
  private static async getHistoricalInventoryValue(): Promise<number | undefined> {
    try {
      // Get the latest KPI snapshot for inventory value
      const snapshot = await prisma.kPISnapshot.findFirst({
        where: {
          kpiName: 'Total Inventory Value',
          kpiCategory: 'FINANCIAL',
        },
        orderBy: {
          date: 'desc',
        },
      });

      return snapshot ? Number(snapshot.value) : undefined;
    } catch (error) {
      logger.warn("Failed to get historical inventory value", { error });
      return undefined;
    }
  }

  /**
   * Calculate inventory entry value for the period
   */
  private static async getInventoryEntryValue(startDate: Date, endDate: Date): Promise<KPIValue> {
    try {
      // Sum all inventory transactions that are stock entries
      const entryTransactions = await prisma.inventoryTransaction.aggregate({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          type: 'STOCK_IN',
        },
        _sum: {
          totalCost: true,
        },
      });

      const entryValue = Number(entryTransactions._sum.totalCost) || 0;
      
      return normalizeKPIValue(entryValue, undefined, undefined);
    } catch (error) {
      logger.error("Failed to calculate inventory entry value", { error });
      return normalizeKPIValue(0);
    }
  }

  /**
   * Calculate consumption metrics
   */
  private static async getConsumptionMetrics(startDate: Date, endDate: Date): Promise<{
    totalConsumption: KPIValue;
    weeklyConsumption: KPIValue;
    monthlyConsumption: KPIValue;
  }> {
    try {
      // Calculate consumption from inventory transactions
      const consumptionTransactions = await prisma.inventoryTransaction.aggregate({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          type: {
            in: ['STOCK_OUT', 'CONSUMPTION', 'WASTE'],
          },
        },
        _sum: {
          totalCost: true,
        },
      });

      const totalConsumption = Number(consumptionTransactions._sum.totalCost) || 0;

      // Calculate weekly average
      const daysDifference = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const weeklyAverage = (totalConsumption / daysDifference) * 7;

      // Calculate monthly projection
      const monthlyProjection = (totalConsumption / daysDifference) * 30;

      return {
        totalConsumption: normalizeKPIValue(totalConsumption),
        weeklyConsumption: normalizeKPIValue(weeklyAverage),
        monthlyConsumption: normalizeKPIValue(monthlyProjection),
      };
    } catch (error) {
      logger.error("Failed to calculate consumption metrics", { error });
      return {
        totalConsumption: normalizeKPIValue(0),
        weeklyConsumption: normalizeKPIValue(0),
        monthlyConsumption: normalizeKPIValue(0),
      };
    }
  }

  /**
   * Calculate waste and loss metrics
   */
  static async getWasteMetrics(startDate: Date, endDate: Date): Promise<{
    wasteValue: KPIValue;
    operationalErrors: KPIValue;
    returnedProducts: KPIValue;
    spoilage: KPIValue;
  }> {
    try {
      // Get waste-related inventory transactions
      const wasteTransactions = await prisma.inventoryTransaction.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          OR: [
            { type: 'WASTE' },
            { notes: { contains: 'waste', mode: 'insensitive' } },
            { notes: { contains: 'desperdício', mode: 'insensitive' } },
            { notes: { contains: 'spoiled', mode: 'insensitive' } },
            { notes: { contains: 'expired', mode: 'insensitive' } },
          ],
        },
      });

      // Categorize waste transactions
      let wasteValue = 0;
      let operationalErrors = 0;
      let returnedProducts = 0;
      let spoilage = 0;

      wasteTransactions.forEach(transaction => {
        const cost = Number(transaction.totalCost);
        const notes = transaction.notes?.toLowerCase() || '';

        wasteValue += cost;

        if (notes.includes('error') || notes.includes('erro') || notes.includes('mistake')) {
          operationalErrors += cost;
        } else if (notes.includes('return') || notes.includes('devolvido') || notes.includes('returned')) {
          returnedProducts += cost;
        } else if (notes.includes('spoil') || notes.includes('expired') || notes.includes('expirado')) {
          spoilage += cost;
        }
      });

      // Also check operational notes for waste-related incidents
      const wasteIncidents = await prisma.operationalNote.findMany({
        where: {
          reportDate: {
            gte: startDate,
            lte: endDate,
          },
          OR: [
            { content: { contains: 'waste', mode: 'insensitive' } },
            { content: { contains: 'desperdício', mode: 'insensitive' } },
            { content: { contains: 'erro operacional', mode: 'insensitive' } },
            { content: { contains: 'produto devolvido', mode: 'insensitive' } },
          ],
        },
      });

      // Parse financial impact from operational notes if available
      let additionalWasteValue = 0;
      wasteIncidents.forEach(note => {
        const matches = note.content.match(/€(\d+(?:[.,]\d+)?)/g);
        if (matches) {
          matches.forEach(match => {
            const value = parseFloat(match.replace('€', '').replace(',', '.'));
            if (!isNaN(value)) {
              additionalWasteValue += value;
            }
          });
        }
      });

      return {
        wasteValue: normalizeKPIValue(wasteValue + additionalWasteValue, 0, undefined),
        operationalErrors: normalizeKPIValue(operationalErrors, 0, undefined),
        returnedProducts: normalizeKPIValue(returnedProducts, 0, undefined),
        spoilage: normalizeKPIValue(spoilage, 0, undefined),
      };
    } catch (error) {
      logger.error("Failed to calculate waste metrics", { error });
      return {
        wasteValue: normalizeKPIValue(0),
        operationalErrors: normalizeKPIValue(0),
        returnedProducts: normalizeKPIValue(0),
        spoilage: normalizeKPIValue(0),
      };
    }
  }

  /**
   * Calculate incident financial impact
   */
  static async getIncidentFinancialImpact(startDate: Date, endDate: Date): Promise<{
    totalImpact: KPIValue;
    impactByCategory: Record<string, KPIValue>;
    preventableImpact: KPIValue;
  }> {
    try {
      // Get incident-related operational notes with financial impact
      const incidentNotes = await prisma.operationalNote.findMany({
        where: {
          reportDate: {
            gte: startDate,
            lte: endDate,
          },
          OR: [
            { tags: { has: 'incident' } },
            { content: { contains: 'INCIDENT', mode: 'insensitive' } },
            { content: { contains: 'impacto financeiro', mode: 'insensitive' } },
          ],
        },
      });

      let totalImpact = 0;
      const impactByCategory: Record<string, number> = {};
      let preventableImpact = 0;

      // Parse financial impact from notes
      incidentNotes.forEach(note => {
        // Extract financial values from content
        const financialMatches = note.content.match(/€(\d+(?:[.,]\d+)?)/g);
        if (financialMatches) {
          financialMatches.forEach(match => {
            const value = parseFloat(match.replace('€', '').replace(',', '.'));
            if (!isNaN(value)) {
              totalImpact += value;

              // Categorize by metadata or content analysis
              const metadata = note.metadata as any;
              let category = metadata?.incidentCategory || 'OTHER';
              
              if (!impactByCategory[category]) {
                impactByCategory[category] = 0;
              }
              impactByCategory[category] += value;

              // Determine if preventable
              const content = note.content.toLowerCase();
              if (content.includes('preventable') || content.includes('evitável') || 
                  content.includes('human error') || content.includes('erro humano')) {
                preventableImpact += value;
              }
            }
          });
        }
      });

      // Convert to KPI values
      const impactByCategoryKPIs: Record<string, KPIValue> = {};
      Object.entries(impactByCategory).forEach(([category, value]) => {
        impactByCategoryKPIs[category] = normalizeKPIValue(value, 0, undefined);
      });

      return {
        totalImpact: normalizeKPIValue(totalImpact, 0, undefined),
        impactByCategory: impactByCategoryKPIs,
        preventableImpact: normalizeKPIValue(preventableImpact, 0, undefined),
      };
    } catch (error) {
      logger.error("Failed to calculate incident financial impact", { error });
      return {
        totalImpact: normalizeKPIValue(0),
        impactByCategory: {},
        preventableImpact: normalizeKPIValue(0),
      };
    }
  }

  /**
   * Calculate operational cost metrics
   */
  static async getOperationalCosts(startDate: Date, endDate: Date): Promise<{
    dailyAverageCost: KPIValue;
    costPerCustomer: KPIValue;
    overtimeCosts: KPIValue;
    maintenanceCosts: KPIValue;
  }> {
    try {
      // Calculate total consumption for the period
      const consumptionMetrics = await this.getConsumptionMetrics(startDate, endDate);
      const totalConsumption = consumptionMetrics.totalConsumption.value;

      // Calculate operational days
      const operationalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const dailyAverageCost = operationalDays > 0 ? totalConsumption / operationalDays : 0;

      // Estimate cost per customer (would need customer count from operational data)
      const customerCount = await this.estimateCustomerCount(startDate, endDate);
      const costPerCustomer = customerCount > 0 ? totalConsumption / customerCount : 0;

      // Calculate overtime costs
      const overtimeCosts = await this.calculateOvertimeCosts(startDate, endDate);

      // Calculate maintenance costs
      const maintenanceCosts = await this.calculateMaintenanceCosts(startDate, endDate);

      return {
        dailyAverageCost: normalizeKPIValue(dailyAverageCost),
        costPerCustomer: normalizeKPIValue(costPerCustomer),
        overtimeCosts: normalizeKPIValue(overtimeCosts, 0, undefined),
        maintenanceCosts: normalizeKPIValue(maintenanceCosts),
      };
    } catch (error) {
      logger.error("Failed to calculate operational costs", { error });
      return {
        dailyAverageCost: normalizeKPIValue(0),
        costPerCustomer: normalizeKPIValue(0),
        overtimeCosts: normalizeKPIValue(0),
        maintenanceCosts: normalizeKPIValue(0),
      };
    }
  }

  /**
   * Analyze consumption patterns and costs
   */
  static async getConsumptionAnalysis(startDate: Date, endDate: Date): Promise<{
    consumptionByCategory: Record<string, KPIValue>;
    consumptionTrends: Record<string, KPIValue>;
    costVariances: Record<string, KPIValue>;
  }> {
    try {
      // Get consumption by category from inventory transactions
      const categoryConsumption = await prisma.inventoryTransaction.groupBy({
        by: ['itemId'],
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          type: {
            in: ['STOCK_OUT', 'CONSUMPTION'],
          },
        },
        _sum: {
          totalCost: true,
        },
      });

      // Map to categories
      const consumptionByCategory: Record<string, number> = {};
      
      for (const item of categoryConsumption) {
        const inventoryItem = await prisma.inventoryItem.findUnique({
          where: { id: item.itemId },
          select: { category: true },
        });

        if (inventoryItem) {
          const category = inventoryItem.category;
          if (!consumptionByCategory[category]) {
            consumptionByCategory[category] = 0;
          }
          consumptionByCategory[category] += Number(item._sum.totalCost) || 0;
        }
      }

      // Convert to KPI values
      const consumptionByKPI: Record<string, KPIValue> = {};
      Object.entries(consumptionByCategory).forEach(([category, value]) => {
        consumptionByKPI[category] = normalizeKPIValue(value);
      });

      // TODO: Implement trend analysis and cost variance calculation
      // For now, return empty objects as placeholders
      const consumptionTrends: Record<string, KPIValue> = {};
      const costVariances: Record<string, KPIValue> = {};

      return {
        consumptionByCategory: consumptionByKPI,
        consumptionTrends,
        costVariances,
      };
    } catch (error) {
      logger.error("Failed to analyze consumption patterns", { error });
      return {
        consumptionByCategory: {},
        consumptionTrends: {},
        costVariances: {},
      };
    }
  }

  /**
   * Get average CMP across all inventory items
   */
  private static async getAverageCMP(): Promise<KPIValue> {
    try {
      const avgCMP = await prisma.inventoryItem.aggregate({
        _avg: {
          averageCost: true,
        },
      });

      return normalizeKPIValue(Number(avgCMP._avg.averageCost) || 0);
    } catch (error) {
      logger.error("Failed to calculate average CMP", { error });
      return normalizeKPIValue(0);
    }
  }

  /**
   * Calculate offers value from operational notes
   */
  private static async getOffersValue(startDate: Date, endDate: Date): Promise<KPIValue> {
    try {
      const offerNotes = await prisma.operationalNote.findMany({
        where: {
          reportDate: {
            gte: startDate,
            lte: endDate,
          },
          OR: [
            { content: { contains: 'offer', mode: 'insensitive' } },
            { content: { contains: 'oferta', mode: 'insensitive' } },
            { content: { contains: 'cortesia', mode: 'insensitive' } },
          ],
        },
      });

      let totalOffers = 0;
      offerNotes.forEach(note => {
        const matches = note.content.match(/€(\d+(?:[.,]\d+)?)/g);
        if (matches) {
          matches.forEach(match => {
            const value = parseFloat(match.replace('€', '').replace(',', '.'));
            if (!isNaN(value)) {
              totalOffers += value;
            }
          });
        }
      });

      return normalizeKPIValue(totalOffers, 0, undefined);
    } catch (error) {
      logger.error("Failed to calculate offers value", { error });
      return normalizeKPIValue(0);
    }
  }

  /**
   * Calculate cash discrepancies from operational notes
   */
  private static async getCashDiscrepancies(startDate: Date, endDate: Date): Promise<KPIValue> {
    try {
      const cashNotes = await prisma.operationalNote.findMany({
        where: {
          reportDate: {
            gte: startDate,
            lte: endDate,
          },
          OR: [
            { content: { contains: 'cash difference', mode: 'insensitive' } },
            { content: { contains: 'diferença de caixa', mode: 'insensitive' } },
            { content: { contains: 'cash discrepancy', mode: 'insensitive' } },
          ],
        },
      });

      let totalDiscrepancies = 0;
      cashNotes.forEach(note => {
        const matches = note.content.match(/[+-]?€(\d+(?:[.,]\d+)?)/g);
        if (matches) {
          matches.forEach(match => {
            const value = parseFloat(match.replace('€', '').replace(',', '.'));
            if (!isNaN(value)) {
              totalDiscrepancies += Math.abs(value); // Take absolute value
            }
          });
        }
      });

      return normalizeKPIValue(totalDiscrepancies, 0, undefined);
    } catch (error) {
      logger.error("Failed to calculate cash discrepancies", { error });
      return normalizeKPIValue(0);
    }
  }

  /**
   * Estimate customer count from operational data
   */
  private static async estimateCustomerCount(startDate: Date, endDate: Date): Promise<number> {
    try {
      // Look for customer-related KPIs or mentions in operational notes
      const customerKPIs = await prisma.kPISnapshot.findMany({
        where: {
          date: {
            gte: startDate,
            lte: endDate,
          },
          kpiName: {
            contains: 'cliente',
            mode: 'insensitive',
          },
        },
      });

      if (customerKPIs.length > 0) {
        return customerKPIs.reduce((sum, kpi) => sum + Number(kpi.value), 0);
      }

      // Fallback: estimate based on operational activity
      const operationalDays = await prisma.operationalNote.count({
        where: {
          reportDate: {
            gte: startDate,
            lte: endDate,
          },
          noteType: 'EXECUTIVE_SUMMARY',
        },
      });

      return operationalDays * 100; // Rough estimate: 100 customers per operational day
    } catch (error) {
      logger.warn("Failed to estimate customer count", { error });
      return 0;
    }
  }

  /**
   * Calculate overtime costs
   */
  private static async calculateOvertimeCosts(startDate: Date, endDate: Date): Promise<number> {
    try {
      // Get attendance records with overtime
      const overtimeRecords = await prisma.attendance.findMany({
        where: {
          shift: {
            shiftDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          overtimeHours: {
            gt: 0,
          },
        },
        include: {
          employee: true,
        },
      });

      let totalOvertimeCost = 0;
      overtimeRecords.forEach(record => {
        const overtimeHours = Number(record.overtimeHours) || 0;
        const hourlyRate = Number(record.employee.hourlyRate) || 10; // Default rate
        const overtimeRate = hourlyRate * 1.5; // Assuming 1.5x overtime rate
        totalOvertimeCost += overtimeHours * overtimeRate;
      });

      return totalOvertimeCost;
    } catch (error) {
      logger.warn("Failed to calculate overtime costs", { error });
      return 0;
    }
  }

  /**
   * Calculate maintenance costs from operational notes
   */
  private static async calculateMaintenanceCosts(startDate: Date, endDate: Date): Promise<number> {
    try {
      const maintenanceNotes = await prisma.operationalNote.findMany({
        where: {
          reportDate: {
            gte: startDate,
            lte: endDate,
          },
          OR: [
            { content: { contains: 'manutenção', mode: 'insensitive' } },
            { content: { contains: 'maintenance', mode: 'insensitive' } },
            { content: { contains: 'reparação', mode: 'insensitive' } },
            { content: { contains: 'repair', mode: 'insensitive' } },
          ],
        },
      });

      let totalMaintenanceCost = 0;
      maintenanceNotes.forEach(note => {
        const matches = note.content.match(/€(\d+(?:[.,]\d+)?)/g);
        if (matches) {
          matches.forEach(match => {
            const value = parseFloat(match.replace('€', '').replace(',', '.'));
            if (!isNaN(value)) {
              totalMaintenanceCost += value;
            }
          });
        }
      });

      return totalMaintenanceCost;
    } catch (error) {
      logger.warn("Failed to calculate maintenance costs", { error });
      return 0;
    }
  }

  /**
   * Get comprehensive financial dashboard data
   */
  static async getFinancialDashboard(
    startDate: Date,
    endDate: Date
  ): Promise<{
    summary: FinancialMetrics;
    wasteAnalysis: Awaited<ReturnType<typeof this.getWasteMetrics>>;
    incidentImpact: Awaited<ReturnType<typeof this.getIncidentFinancialImpact>>;
    operationalCosts: Awaited<ReturnType<typeof this.getOperationalCosts>>;
    consumptionAnalysis: Awaited<ReturnType<typeof this.getConsumptionAnalysis>>;
    trends: Array<{
      metric: string;
      current: number;
      previous?: number;
      trend: string;
    }>;
  }> {
    try {
      const [summary, wasteAnalysis, incidentImpact, operationalCosts, consumptionAnalysis] = 
        await Promise.all([
          this.calculateFinancialMetrics(startDate, endDate),
          this.getWasteMetrics(startDate, endDate),
          this.getIncidentFinancialImpact(startDate, endDate),
          this.getOperationalCosts(startDate, endDate),
          this.getConsumptionAnalysis(startDate, endDate),
        ]);

      // Generate trends
      const trends = [
        {
          metric: "Inventory Value",
          current: summary.currentInventoryValue.value,
          previous: summary.currentInventoryValue.previousValue,
          trend: summary.currentInventoryValue.trend || "stable",
        },
        {
          metric: "Daily Average Cost",
          current: operationalCosts.dailyAverageCost.value,
          trend: "stable", // Would need historical comparison
        },
        {
          metric: "Waste Value",
          current: wasteAnalysis.wasteValue.value,
          trend: "stable", // Would need historical comparison
        },
      ];

      return {
        summary,
        wasteAnalysis,
        incidentImpact,
        operationalCosts,
        consumptionAnalysis,
        trends,
      };
    } catch (error) {
      logger.error("Failed to get financial dashboard", { error });
      throw error;
    }
  }
}