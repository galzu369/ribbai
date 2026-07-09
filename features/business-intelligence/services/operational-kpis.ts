/**
 * RIBBAI Business Intelligence - Operational KPIs Service
 * 
 * Calculates operational performance indicators including days, incidents,
 * maintenance, improvements, and service quality metrics.
 */

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logging";
import { OperationalMetrics, KPIValue } from "../types";
import { normalizeKPIValue, aggregateMetrics, calculateTrend } from "../utils/data-transforms";

export class OperationalKPIService {
  /**
   * Calculate all operational KPIs for a given date range
   */
  static async calculateOperationalMetrics(
    startDate: Date,
    endDate: Date
  ): Promise<OperationalMetrics> {
    logger.info("Calculating operational metrics", { 
      startDate: startDate.toISOString(), 
      endDate: endDate.toISOString() 
    });

    try {
      // Parallel execution of KPI calculations for performance
      const [
        operationalDays,
        customerCount,
        incidentMetrics,
        maintenanceMetrics,
        serviceQualityMetrics,
        operationalEfficiencyMetrics
      ] = await Promise.all([
        this.getOperationalDays(startDate, endDate),
        this.getCustomerCount(startDate, endDate),
        this.getIncidentMetrics(startDate, endDate),
        this.getMaintenanceMetrics(startDate, endDate),
        this.getServiceQualityMetrics(startDate, endDate),
        this.getOperationalEfficiencyMetrics(startDate, endDate)
      ]);

      const metrics: OperationalMetrics = {
        operationalDays,
        customerCount,
        incidentCount: incidentMetrics.totalIncidents,
        stockBreaks: await this.getStockBreaks(startDate, endDate),
        maintenanceTasks: maintenanceMetrics.maintenanceTasks,
        improvements: maintenanceMetrics.improvementsImplemented,
        briefingsCompleted: maintenanceMetrics.briefingsCompleted,
        processChanges: maintenanceMetrics.processChanges,
        averageOpeningTime: operationalEfficiencyMetrics.averageOpeningTime,
        averageClosingTime: operationalEfficiencyMetrics.averageClosingTime,
        incidentFreeDays: incidentMetrics.incidentFreeDays,
        highPressureDays: await this.getHighPressureDays(startDate, endDate),
        quietOperationDays: await this.getQuietOperationDays(startDate, endDate),
        eventDays: await this.getEventDays(startDate, endDate),
        jamSessionDays: await this.getJamSessionDays(startDate, endDate),
      };

      logger.info("Operational metrics calculated successfully", {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        metricsCount: Object.keys(metrics).length
      });

      return metrics;
    } catch (error) {
      logger.error("Failed to calculate operational metrics", { error, startDate, endDate });
      throw error;
    }
  }

  /**
   * Get operational days count - days with recorded operations
   */
  static async getOperationalDays(startDate: Date, endDate: Date): Promise<KPIValue> {
    try {
      // Count distinct dates with operational notes (indicating operation)
      const result = await prisma.operationalNote.groupBy({
        by: ['reportDate'],
        where: {
          reportDate: {
            gte: startDate,
            lte: endDate,
          },
          noteType: 'EXECUTIVE_SUMMARY', // Only count days with executive summaries
        },
      });

      const operationalDaysCount = result.length;
      
      // Calculate expected operational days (excluding typical closure days)
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const expectedOperationalDays = totalDays; // Assuming restaurant operates daily

      return normalizeKPIValue(
        operationalDaysCount,
        expectedOperationalDays,
        undefined // No previous value for now
      );
    } catch (error) {
      logger.error("Failed to calculate operational days", { error });
      return normalizeKPIValue(0);
    }
  }

  /**
   * Get customer count from KPI snapshots or operational records
   */
  static async getCustomerCount(startDate: Date, endDate: Date): Promise<KPIValue> {
    try {
      // Look for customer-related KPIs in snapshots
      const customerKPIs = await prisma.kPISnapshot.findMany({
        where: {
          date: {
            gte: startDate,
            lte: endDate,
          },
          kpiName: {
            contains: 'clientes',
            mode: 'insensitive',
          },
        },
      });

      if (customerKPIs.length > 0) {
        const totalCustomers = customerKPIs.reduce((sum, kpi) => sum + Number(kpi.value), 0);
        return normalizeKPIValue(totalCustomers);
      }

      // Fallback: estimate from operational notes mentioning customer activity
      const operationalNotes = await prisma.operationalNote.findMany({
        where: {
          reportDate: {
            gte: startDate,
            lte: endDate,
          },
          content: {
            contains: 'cliente',
            mode: 'insensitive',
          },
        },
      });

      // Rough estimation based on operational activity mentions
      const estimatedCustomers = operationalNotes.length * 50; // Placeholder estimation

      return normalizeKPIValue(estimatedCustomers, undefined, undefined);
    } catch (error) {
      logger.error("Failed to calculate customer count", { error });
      return normalizeKPIValue(0);
    }
  }

  /**
   * Calculate incident metrics
   */
  static async getIncidentMetrics(startDate: Date, endDate: Date): Promise<{
    totalIncidents: KPIValue;
    incidentsByCategory: Record<string, KPIValue>;
    incidentFreeDays: KPIValue;
  }> {
    try {
      // Get all incident-related operational notes
      const incidentNotes = await prisma.operationalNote.findMany({
        where: {
          reportDate: {
            gte: startDate,
            lte: endDate,
          },
          OR: [
            { tags: { has: 'incident' } },
            { content: { contains: 'INCIDENT', mode: 'insensitive' } },
            { noteType: 'OPERATIONAL_NOTE', content: { contains: 'incidente', mode: 'insensitive' } },
          ],
        },
      });

      const totalIncidents = incidentNotes.length;

      // Categorize incidents by metadata or content analysis
      const incidentsByCategory: Record<string, number> = {};
      
      incidentNotes.forEach(note => {
        if (note.metadata && typeof note.metadata === 'object') {
          const metadata = note.metadata as any;
          const category = metadata.incidentCategory || 'OTHER';
          incidentsByCategory[category] = (incidentsByCategory[category] || 0) + 1;
        } else {
          // Analyze content for category keywords
          const content = note.content.toLowerCase();
          let category = 'OTHER';
          
          if (content.includes('técnico') || content.includes('equipment')) category = 'TECHNICAL';
          if (content.includes('serviço') || content.includes('service')) category = 'SERVICE';
          if (content.includes('segurança') || content.includes('safety')) category = 'SAFETY';
          if (content.includes('financeiro') || content.includes('cash')) category = 'FINANCIAL';
          
          incidentsByCategory[category] = (incidentsByCategory[category] || 0) + 1;
        }
      });

      // Calculate incident-free days
      const operationalDays = await this.getOperationalDays(startDate, endDate);
      const daysWithIncidents = new Set(incidentNotes.map(note => note.reportDate.toDateString())).size;
      const incidentFreeDays = operationalDays.value - daysWithIncidents;

      return {
        totalIncidents: normalizeKPIValue(totalIncidents, 0, undefined), // Target: 0 incidents
        incidentsByCategory: Object.fromEntries(
          Object.entries(incidentsByCategory).map(([cat, count]) => [
            cat,
            normalizeKPIValue(count, 0, undefined)
          ])
        ),
        incidentFreeDays: normalizeKPIValue(
          incidentFreeDays,
          operationalDays.value, // Target: all days incident-free
          undefined
        ),
      };
    } catch (error) {
      logger.error("Failed to calculate incident metrics", { error });
      return {
        totalIncidents: normalizeKPIValue(0),
        incidentsByCategory: {},
        incidentFreeDays: normalizeKPIValue(0),
      };
    }
  }

  /**
   * Calculate maintenance and improvement metrics
   */
  static async getMaintenanceMetrics(startDate: Date, endDate: Date): Promise<{
    maintenanceTasks: KPIValue;
    improvementsImplemented: KPIValue;
    briefingsCompleted: KPIValue;
    processChanges: KPIValue;
  }> {
    try {
      // Count service improvements
      const improvements = await prisma.serviceImprovement.count({
        where: {
          reportDate: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      const implementedImprovements = await prisma.serviceImprovement.count({
        where: {
          reportDate: {
            gte: startDate,
            lte: endDate,
          },
          status: {
            in: ['IMPLEMENTADO', 'CONSOLIDADO', 'CONCLUIDO'],
          },
        },
      });

      // Count maintenance-related operational notes
      const maintenanceNotes = await prisma.operationalNote.count({
        where: {
          reportDate: {
            gte: startDate,
            lte: endDate,
          },
          OR: [
            { content: { contains: 'manutenção', mode: 'insensitive' } },
            { content: { contains: 'reparação', mode: 'insensitive' } },
            { content: { contains: 'maintenance', mode: 'insensitive' } },
            { tags: { has: 'maintenance' } },
          ],
        },
      });

      // Count briefing-related notes
      const briefingNotes = await prisma.operationalNote.count({
        where: {
          reportDate: {
            gte: startDate,
            lte: endDate,
          },
          OR: [
            { content: { contains: 'briefing', mode: 'insensitive' } },
            { content: { contains: 'reunião', mode: 'insensitive' } },
            { content: { contains: 'formação', mode: 'insensitive' } },
          ],
        },
      });

      // Count process change notes
      const processChangeNotes = await prisma.operationalNote.count({
        where: {
          reportDate: {
            gte: startDate,
            lte: endDate,
          },
          OR: [
            { content: { contains: 'processo', mode: 'insensitive' } },
            { content: { contains: 'procedimento', mode: 'insensitive' } },
            { content: { contains: 'mudança', mode: 'insensitive' } },
            { content: { contains: 'alteração', mode: 'insensitive' } },
          ],
        },
      });

      return {
        maintenanceTasks: normalizeKPIValue(maintenanceNotes),
        improvementsImplemented: normalizeKPIValue(
          implementedImprovements,
          improvements, // Target: implement all identified improvements
          undefined
        ),
        briefingsCompleted: normalizeKPIValue(briefingNotes),
        processChanges: normalizeKPIValue(processChangeNotes),
      };
    } catch (error) {
      logger.error("Failed to calculate maintenance metrics", { error });
      return {
        maintenanceTasks: normalizeKPIValue(0),
        improvementsImplemented: normalizeKPIValue(0),
        briefingsCompleted: normalizeKPIValue(0),
        processChanges: normalizeKPIValue(0),
      };
    }
  }

  /**
   * Get service quality metrics from KPI snapshots
   */
  static async getServiceQualityMetrics(startDate: Date, endDate: Date): Promise<{
    averageQualityScore: KPIValue;
    customerSatisfaction: KPIValue;
    serviceResponse: KPIValue;
  }> {
    try {
      // Get quality-related KPI snapshots
      const qualityKPIs = await prisma.kPISnapshot.findMany({
        where: {
          date: {
            gte: startDate,
            lte: endDate,
          },
          kpiName: {
            in: [
              'Qualidade de Serviço',
              'Capacidade de Resposta',
              'Sucesso Operacional',
              'Colaboração da Equipa',
            ],
          },
        },
      });

      // Group by KPI name and calculate averages
      const kpiAverages = qualityKPIs.reduce((acc, kpi) => {
        if (!acc[kpi.kpiName]) acc[kpi.kpiName] = [];
        acc[kpi.kpiName].push(Number(kpi.value));
        return acc;
      }, {} as Record<string, number[]>);

      const averageQuality = kpiAverages['Qualidade de Serviço']
        ? kpiAverages['Qualidade de Serviço'].reduce((a, b) => a + b, 0) / kpiAverages['Qualidade de Serviço'].length
        : 0;

      const averageResponse = kpiAverages['Capacidade de Resposta']
        ? kpiAverages['Capacidade de Resposta'].reduce((a, b) => a + b, 0) / kpiAverages['Capacidade de Resposta'].length
        : 0;

      const overallSuccess = kpiAverages['Sucesso Operacional']
        ? kpiAverages['Sucesso Operacional'].reduce((a, b) => a + b, 0) / kpiAverages['Sucesso Operacional'].length
        : 0;

      return {
        averageQualityScore: normalizeKPIValue(averageQuality, 8, undefined), // Target: 8/10
        customerSatisfaction: normalizeKPIValue(overallSuccess, 8, undefined),
        serviceResponse: normalizeKPIValue(averageResponse, 8, undefined),
      };
    } catch (error) {
      logger.error("Failed to calculate service quality metrics", { error });
      return {
        averageQualityScore: normalizeKPIValue(0),
        customerSatisfaction: normalizeKPIValue(0),
        serviceResponse: normalizeKPIValue(0),
      };
    }
  }

  /**
   * Get operational efficiency metrics
   */
  static async getOperationalEfficiencyMetrics(startDate: Date, endDate: Date): Promise<{
    averageOpeningTime: KPIValue;
    averageClosingTime: KPIValue;
    operationDuration: KPIValue;
  }> {
    try {
      // Look for timing-related information in operational notes
      const timingNotes = await prisma.operationalNote.findMany({
        where: {
          reportDate: {
            gte: startDate,
            lte: endDate,
          },
          OR: [
            { content: { contains: 'abertura', mode: 'insensitive' } },
            { content: { contains: 'fecho', mode: 'insensitive' } },
            { content: { contains: 'opening', mode: 'insensitive' } },
            { content: { contains: 'closing', mode: 'insensitive' } },
          ],
        },
      });

      // For now, return placeholder values as timing data needs to be extracted
      // from text or stored in a more structured format
      return {
        averageOpeningTime: normalizeKPIValue(9.5, 9, undefined), // Target: 9:00 AM
        averageClosingTime: normalizeKPIValue(23.5, 24, undefined), // Target: Midnight
        operationDuration: normalizeKPIValue(14, 15, undefined), // Target: 15 hours operation
      };
    } catch (error) {
      logger.error("Failed to calculate operational efficiency metrics", { error });
      return {
        averageOpeningTime: normalizeKPIValue(0),
        averageClosingTime: normalizeKPIValue(0),
        operationDuration: normalizeKPIValue(0),
      };
    }
  }

  /**
   * Get stock breaks from inventory or operational notes
   */
  static async getStockBreaks(startDate: Date, endDate: Date): Promise<KPIValue> {
    try {
      const stockBreakNotes = await prisma.operationalNote.count({
        where: {
          reportDate: {
            gte: startDate,
            lte: endDate,
          },
          OR: [
            { content: { contains: 'rutura', mode: 'insensitive' } },
            { content: { contains: 'stock break', mode: 'insensitive' } },
            { content: { contains: 'out of stock', mode: 'insensitive' } },
            { content: { contains: 'esgotado', mode: 'insensitive' } },
          ],
        },
      });

      return normalizeKPIValue(stockBreakNotes, 0, undefined); // Target: 0 stock breaks
    } catch (error) {
      logger.error("Failed to calculate stock breaks", { error });
      return normalizeKPIValue(0);
    }
  }

  /**
   * Get high pressure days from operational ratings
   */
  static async getHighPressureDays(startDate: Date, endDate: Date): Promise<KPIValue> {
    try {
      // Look for pressure-related KPIs or notes
      const pressureIndicators = await prisma.operationalNote.count({
        where: {
          reportDate: {
            gte: startDate,
            lte: endDate,
          },
          OR: [
            { content: { contains: 'pressão', mode: 'insensitive' } },
            { content: { contains: 'pressure', mode: 'insensitive' } },
            { content: { contains: 'stress', mode: 'insensitive' } },
            { content: { contains: 'intenso', mode: 'insensitive' } },
            { content: { contains: 'ocupação elevada', mode: 'insensitive' } },
          ],
        },
      });

      return normalizeKPIValue(pressureIndicators);
    } catch (error) {
      logger.error("Failed to calculate high pressure days", { error });
      return normalizeKPIValue(0);
    }
  }

  /**
   * Get quiet operation days
   */
  static async getQuietOperationDays(startDate: Date, endDate: Date): Promise<KPIValue> {
    try {
      const quietIndicators = await prisma.operationalNote.count({
        where: {
          reportDate: {
            gte: startDate,
            lte: endDate,
          },
          OR: [
            { content: { contains: 'calmo', mode: 'insensitive' } },
            { content: { contains: 'tranquilo', mode: 'insensitive' } },
            { content: { contains: 'quiet', mode: 'insensitive' } },
            { content: { contains: 'peaceful', mode: 'insensitive' } },
            { content: { contains: 'low activity', mode: 'insensitive' } },
          ],
        },
      });

      return normalizeKPIValue(quietIndicators);
    } catch (error) {
      logger.error("Failed to calculate quiet operation days", { error });
      return normalizeKPIValue(0);
    }
  }

  /**
   * Get event days
   */
  static async getEventDays(startDate: Date, endDate: Date): Promise<KPIValue> {
    try {
      const eventIndicators = await prisma.operationalNote.count({
        where: {
          reportDate: {
            gte: startDate,
            lte: endDate,
          },
          OR: [
            { content: { contains: 'evento', mode: 'insensitive' } },
            { content: { contains: 'event', mode: 'insensitive' } },
            { content: { contains: 'celebration', mode: 'insensitive' } },
            { content: { contains: 'festa', mode: 'insensitive' } },
            { content: { contains: 'especial', mode: 'insensitive' } },
          ],
        },
      });

      return normalizeKPIValue(eventIndicators);
    } catch (error) {
      logger.error("Failed to calculate event days", { error });
      return normalizeKPIValue(0);
    }
  }

  /**
   * Get jam session days
   */
  static async getJamSessionDays(startDate: Date, endDate: Date): Promise<KPIValue> {
    try {
      const jamSessionIndicators = await prisma.operationalNote.count({
        where: {
          reportDate: {
            gte: startDate,
            lte: endDate,
          },
          OR: [
            { content: { contains: 'jam session', mode: 'insensitive' } },
            { content: { contains: 'música', mode: 'insensitive' } },
            { content: { contains: 'music', mode: 'insensitive' } },
            { content: { contains: 'live', mode: 'insensitive' } },
          ],
        },
      });

      return normalizeKPIValue(jamSessionIndicators);
    } catch (error) {
      logger.error("Failed to calculate jam session days", { error });
      return normalizeKPIValue(0);
    }
  }

  /**
   * Get current operational status snapshot
   */
  static async getCurrentOperationalStatus(): Promise<{
    todayMetrics: Partial<OperationalMetrics>;
    weekMetrics: Partial<OperationalMetrics>;
    monthMetrics: Partial<OperationalMetrics>;
    alerts: Array<{ type: string; message: string; severity: string }>;
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - 7);
      
      const monthStart = new Date(today);
      monthStart.setMonth(today.getMonth() - 1);

      const [todayMetrics, weekMetrics, monthMetrics] = await Promise.all([
        this.calculateOperationalMetrics(today, today),
        this.calculateOperationalMetrics(weekStart, today),
        this.calculateOperationalMetrics(monthStart, today),
      ]);

      // Generate alerts based on metrics
      const alerts = [];
      
      if (weekMetrics.incidentCount.value > 5) {
        alerts.push({
          type: 'incidents',
          message: `High incident count this week: ${weekMetrics.incidentCount.value}`,
          severity: 'high',
        });
      }
      
      if (weekMetrics.stockBreaks.value > 2) {
        alerts.push({
          type: 'stock',
          message: `Multiple stock breaks detected: ${weekMetrics.stockBreaks.value}`,
          severity: 'medium',
        });
      }

      return {
        todayMetrics,
        weekMetrics,
        monthMetrics,
        alerts,
      };
    } catch (error) {
      logger.error("Failed to get current operational status", { error });
      throw error;
    }
  }
}