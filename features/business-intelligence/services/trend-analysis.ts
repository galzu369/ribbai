/**
 * RIBBAI Business Intelligence - Trend Analysis Service
 * 
 * Pattern recognition service for consumption, performance, and operational trends.
 * Identifies growth patterns, seasonal variations, and predictive indicators.
 */

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logging";
import { TrendData, Pattern } from "../types";

interface ConsumptionTrend {
  itemId: string;
  itemName: string;
  category: string;
  trend: 'increasing' | 'decreasing' | 'stable';
  changePercent: number;
  averageConsumption: number;
  totalConsumption: number;
  projectedNeed: number;
  confidence: number;
}

interface PerformanceTrend {
  metric: string;
  trend: 'improving' | 'declining' | 'stable';
  changeRate: number;
  currentValue: number;
  projectedValue: number;
  confidence: number;
  timeframe: string;
}

interface TrendAnalysis {
  timeframe: string;
  period: string;
  summary: string;
  trends: Array<{
    id: string;
    type: 'consumption' | 'performance' | 'operational';
    direction: 'increasing' | 'decreasing' | 'stable';
    metric: string;
    value: number;
    confidence: number;
    description: string;
    recommendation: string;
    timeframe: string;
  }>;
  patterns: Array<{
    pattern: string;
    description: string;
    frequency: number;
    impact: 'high' | 'medium' | 'low';
    recommendation: string;
  }>;
  forecasts: Array<{
    metric: string;
    currentValue: number;
    predictedValue: number;
    confidence: number;
    timeframe: string;
    trend: string;
  }>;
  anomalies: Array<{
    metric: string;
    expectedValue: number;
    actualValue: number;
    deviation: number;
    severity: 'high' | 'medium' | 'low';
    description: string;
  }>;
  generatedAt: Date;
}

export class TrendAnalysisService {
  /**
   * Detect patterns in operational data
   */
  static async detectPatterns(
    metric: string,
    startDate: Date,
    endDate: Date
  ): Promise<Pattern[]> {
    logger.info("Detecting operational patterns", { metric, startDate, endDate });

    try {
      const patterns: Pattern[] = [];

      // Detect inventory consumption patterns
      if (metric === 'inventory_consumption' || metric === 'all') {
        const consumptionPatterns = await this.detectConsumptionPatterns(startDate, endDate);
        patterns.push(...consumptionPatterns);
      }

      // Detect performance patterns
      if (metric === 'team_performance' || metric === 'all') {
        const performancePatterns = await this.detectPerformancePatterns(startDate, endDate);
        patterns.push(...performancePatterns);
      }

      // Detect operational patterns
      if (metric === 'operational_efficiency' || metric === 'all') {
        const operationalPatterns = await this.detectOperationalPatterns(startDate, endDate);
        patterns.push(...operationalPatterns);
      }

      // Detect time-based patterns
      if (metric === 'time_patterns' || metric === 'all') {
        const timePatterns = await this.detectTimeBasedPatterns(startDate, endDate);
        patterns.push(...timePatterns);
      }

      logger.info("Pattern detection completed", { 
        metric, 
        patternsFound: patterns.length 
      });

      return patterns;
    } catch (error) {
      logger.error("Failed to detect patterns", { error, metric });
      return [];
    }
  }

  /**
   * Analyze consumption trends
   */
  static async analyzeConsumptionTrends(
    startDate: Date,
    endDate: Date
  ): Promise<TrendData[]> {
    logger.info("Analyzing consumption trends", { startDate, endDate });

    try {
      // Get consumption data grouped by item and time period
      const consumptionData = await prisma.inventoryTransaction.groupBy({
        by: ['itemId', 'transactionDate'],
        where: {
          type: { in: ['OUT', 'CONSUMPTION'] },
          transactionDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        _sum: {
          quantity: true,
          totalCost: true,
        },
        orderBy: {
          transactionDate: 'asc',
        },
      });

      // Get item details
      const itemIds = [...new Set(consumptionData.map(d => d.itemId))];
      const items = await prisma.inventoryItem.findMany({
        where: {
          id: { in: itemIds },
        },
        select: {
          id: true,
          name: true,
          category: true,
        },
      });

      const itemMap = new Map(items.map(item => [item.id, item]));

      // Process data into trends
      const trendData: TrendData[] = [];
      const itemTrends = new Map<string, any[]>();

      // Group by item
      consumptionData.forEach(data => {
        if (!itemTrends.has(data.itemId)) {
          itemTrends.set(data.itemId, []);
        }
        itemTrends.get(data.itemId)!.push({
          date: data.transactionDate,
          value: data._sum.totalCost || 0,
          quantity: data._sum.quantity || 0,
        });
      });

      // Calculate trends for each item
      for (const [itemId, data] of itemTrends.entries()) {
        const item = itemMap.get(itemId);
        if (!item || data.length < 2) continue;

        // Calculate linear trend
        const trend = this.calculateLinearTrend(data);
        const totalConsumption = data.reduce((sum, d) => sum + d.value, 0);
        const avgConsumption = totalConsumption / data.length;

        trendData.push({
          date: new Date(),
          value: avgConsumption,
          confidence: Math.min(0.9, Math.max(0.3, data.length / 10)),
          metric: item.name,
          trend: trend.direction,
          metadata: {
            itemId,
            category: item.category,
            changeRate: trend.slope,
            totalConsumption,
            dataPoints: data.length,
            trendStrength: trend.strength,
          },
        });
      }

      logger.info("Consumption trends analyzed", { 
        trendsCalculated: trendData.length 
      });

      return trendData;
    } catch (error) {
      logger.error("Failed to analyze consumption trends", { error });
      return [];
    }
  }

  /**
   * Analyze performance trends for a specific employee or team-wide
   */
  static async analyzePerformanceTrends(
    employeeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<TrendData[]> {
    logger.info("Analyzing performance trends", { employeeId, startDate, endDate });

    try {
      const trendData: TrendData[] = [];

      // Get KPI snapshots for the employee or all employees
      const kpiFilter = employeeId === 'all' 
        ? { date: { gte: startDate, lte: endDate } }
        : { employeeId, date: { gte: startDate, lte: endDate } };

      const kpiSnapshots = await prisma.kPISnapshot.findMany({
        where: kpiFilter,
        orderBy: { date: 'asc' },
        include: {
          employee: true,
        },
      });

      // Group by KPI type
      const kpiGroups = new Map<string, any[]>();
      kpiSnapshots.forEach(kpi => {
        const key = `${kpi.kpiCategory}_${kpi.kpiName}`;
        if (!kpiGroups.has(key)) {
          kpiGroups.set(key, []);
        }
        kpiGroups.get(key)!.push(kpi);
      });

      // Calculate trends for each KPI
      for (const [kpiKey, snapshots] of kpiGroups.entries()) {
        if (snapshots.length < 2) continue;

        const values = snapshots.map(s => ({ date: s.date, value: s.value }));
        const trend = this.calculateLinearTrend(values);
        const latest = snapshots[snapshots.length - 1];
        const first = snapshots[0];
        
        const changePercent = first.value > 0 
          ? ((latest.value - first.value) / first.value) * 100
          : 0;

        trendData.push({
          date: latest.date,
          value: latest.value,
          confidence: Math.min(0.95, Math.max(0.4, snapshots.length / 15)),
          metric: `${latest.kpiCategory}: ${latest.kpiName}`,
          trend: trend.direction,
          metadata: {
            employeeId: employeeId === 'all' ? null : employeeId,
            employeeName: latest.employee?.firstName || 'Team Average',
            kpiCategory: latest.kpiCategory,
            kpiName: latest.kpiName,
            changePercent,
            dataPoints: snapshots.length,
            trendStrength: trend.strength,
            targetValue: latest.targetValue,
            status: latest.status,
          },
        });
      }

      // Also analyze attendance/overtime trends if looking at specific employee
      if (employeeId !== 'all') {
        const attendanceTrends = await this.analyzeAttendanceTrends(employeeId, startDate, endDate);
        trendData.push(...attendanceTrends);
      }

      logger.info("Performance trends analyzed", { 
        employeeId,
        trendsCalculated: trendData.length 
      });

      return trendData;
    } catch (error) {
      logger.error("Failed to analyze performance trends", { error, employeeId });
      return [];
    }
  }

  /**
   * Forecast future values based on trends
   */
  static async forecastMetric(
    metric: string,
    historicalData: Array<{ date: Date; value: number }>,
    forecastDays: number
  ): Promise<Array<{ date: Date; value: number; confidence: number }>> {
    logger.info("Forecasting metric", { metric, dataPoints: historicalData.length, forecastDays });

    try {
      if (historicalData.length < 3) {
        logger.warn("Insufficient data for forecasting", { metric, dataPoints: historicalData.length });
        return [];
      }

      const forecasts: Array<{ date: Date; value: number; confidence: number }> = [];
      
      // Calculate trend from historical data
      const trend = this.calculateLinearTrend(historicalData);
      
      // Generate forecasts
      const lastDate = new Date(Math.max(...historicalData.map(d => d.date.getTime())));
      
      for (let i = 1; i <= forecastDays; i++) {
        const forecastDate = new Date(lastDate);
        forecastDate.setDate(lastDate.getDate() + i);
        
        // Simple linear projection with noise consideration
        const projectedValue = trend.slope * (historicalData.length + i) + trend.intercept;
        
        // Apply seasonal adjustments if detected
        const seasonalFactor = this.getSeasonalFactor(forecastDate, metric);
        const adjustedValue = projectedValue * seasonalFactor;
        
        // Confidence decreases over time and with trend uncertainty
        const baseConfidence = Math.max(0.2, 0.9 - (trend.strength < 0.3 ? 0.3 : 0.1));
        const timeDecay = Math.max(0.1, 1 - (i / forecastDays) * 0.6);
        const confidence = baseConfidence * timeDecay;

        forecasts.push({
          date: forecastDate,
          value: Math.max(0, adjustedValue),
          confidence,
        });
      }

      logger.info("Forecasting completed", { 
        metric, 
        forecastPoints: forecasts.length 
      });

      return forecasts;
    } catch (error) {
      logger.error("Failed to forecast metric", { error, metric });
      return [];
    }
  }

  /**
   * Comprehensive trend analysis for different timeframes
   */
  static async analyzeComprehensiveTrends(
    timeframe: "weekly" | "monthly" | "quarterly"
  ): Promise<TrendAnalysis> {
    logger.info("Performing comprehensive trend analysis", { timeframe });

    try {
      const days = this.getTimeframeDays(timeframe);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);

      // Analyze all trend categories
      const [
        consumptionTrends,
        performanceTrends,
        operationalPatterns
      ] = await Promise.all([
        this.analyzeConsumptionTrends(startDate, endDate),
        this.analyzePerformanceTrends('all', startDate, endDate),
        this.detectPatterns('all', startDate, endDate),
      ]);

      // Combine insights
      const allTrends = [
        ...consumptionTrends.map(t => ({
          id: `consumption-${t.metadata?.itemId || Date.now()}`,
          type: 'consumption' as const,
          direction: t.trend as 'increasing' | 'decreasing' | 'stable',
          metric: t.metric,
          value: t.value,
          confidence: t.confidence,
          description: `${t.metric} consumption trend: ${t.trend}`,
          recommendation: this.getRecommendation('consumption', t.trend, t.value),
          timeframe,
        })),
        ...performanceTrends.map(t => ({
          id: `performance-${Date.now()}-${Math.random()}`,
          type: 'performance' as const,
          direction: t.trend as 'increasing' | 'decreasing' | 'stable',
          metric: t.metric,
          value: t.value,
          confidence: t.confidence,
          description: `${t.metric} performance trend: ${t.trend}`,
          recommendation: this.getRecommendation('performance', t.trend, t.value),
          timeframe,
        })),
      ];

      // Generate forecasts for high-confidence trends
      const forecasts = [];
      for (const trend of allTrends.filter(t => t.confidence > 0.6)) {
        const projection = this.calculateProjection(trend.value, trend.direction, timeframe);
        forecasts.push({
          metric: trend.metric,
          currentValue: trend.value,
          predictedValue: projection,
          confidence: trend.confidence * 0.8, // Reduce confidence for projections
          timeframe: `Next ${timeframe}`,
          trend: trend.direction,
        });
      }

      const analysis: TrendAnalysis = {
        timeframe,
        period: `${startDate.toDateString()} - ${endDate.toDateString()}`,
        summary: `Comprehensive trend analysis over ${days} days. Identified ${allTrends.length} significant trends across consumption, performance, and operational metrics.`,
        trends: allTrends,
        patterns: operationalPatterns,
        forecasts,
        anomalies: await this.detectComprehensiveAnomalies(startDate, endDate),
        generatedAt: new Date(),
      };

      logger.info("Comprehensive trend analysis completed", {
        timeframe,
        trendsFound: allTrends.length,
        patternsFound: operationalPatterns.length,
        forecastsGenerated: forecasts.length,
      });

      return analysis;
    } catch (error) {
      logger.error("Failed to perform comprehensive trend analysis", { error, timeframe });
      throw error;
    }
  }

  // Private helper methods

  private static getTimeframeDays(timeframe: string): number {
    switch (timeframe) {
      case 'weekly': return 7;
      case 'monthly': return 30;
      case 'quarterly': return 90;
      default: return 30;
    }
  }

  private static calculateLinearTrend(data: Array<{ date: Date; value: number }>) {
    if (data.length < 2) {
      return { slope: 0, intercept: 0, direction: 'stable', strength: 0 };
    }

    const n = data.length;
    const sumX = data.reduce((sum, _, i) => sum + i, 0);
    const sumY = data.reduce((sum, d) => sum + d.value, 0);
    const sumXY = data.reduce((sum, d, i) => sum + (i * d.value), 0);
    const sumX2 = data.reduce((sum, _, i) => sum + (i * i), 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate correlation coefficient for trend strength
    const avgY = sumY / n;
    const avgX = sumX / n;
    
    const numerator = data.reduce((sum, d, i) => sum + (i - avgX) * (d.value - avgY), 0);
    const denomX = Math.sqrt(data.reduce((sum, _, i) => sum + Math.pow(i - avgX, 2), 0));
    const denomY = Math.sqrt(data.reduce((sum, d) => sum + Math.pow(d.value - avgY, 2), 0));
    
    const correlation = denomX > 0 && denomY > 0 ? numerator / (denomX * denomY) : 0;

    return {
      slope,
      intercept,
      direction: slope > 0.1 ? 'increasing' : slope < -0.1 ? 'decreasing' : 'stable',
      strength: Math.abs(correlation),
    };
  }

  private static getSeasonalFactor(date: Date, metric: string): number {
    // Simple seasonal adjustments based on day of week and month
    const dayOfWeek = date.getDay();
    const month = date.getMonth();
    
    // Weekend effect for restaurant operations
    if (dayOfWeek === 5 || dayOfWeek === 6) { // Friday/Saturday
      return 1.2; // 20% increase
    } else if (dayOfWeek === 0 || dayOfWeek === 1) { // Sunday/Monday
      return 0.8; // 20% decrease
    }
    
    // Holiday season effect (December/January)
    if (month === 11 || month === 0) {
      return 1.1; // 10% increase
    }
    
    return 1.0; // No seasonal adjustment
  }

  private static async detectConsumptionPatterns(startDate: Date, endDate: Date): Promise<Pattern[]> {
    const patterns: Pattern[] = [];

    try {
      // Find items with high variability
      const consumptionData = await prisma.inventoryTransaction.groupBy({
        by: ['itemId'],
        where: {
          type: { in: ['OUT', 'CONSUMPTION'] },
          transactionDate: { gte: startDate, lte: endDate },
        },
        _sum: { totalCost: true, quantity: true },
        _count: { id: true },
      });

      // Items with high frequency changes
      const highFrequencyItems = consumptionData
        .filter(item => item._count.id > 10)
        .sort((a, b) => b._count.id - a._count.id)
        .slice(0, 5);

      if (highFrequencyItems.length > 0) {
        patterns.push({
          id: `high-consumption-frequency-${Date.now()}`,
          type: 'consumption',
          description: `${highFrequencyItems.length} items showing high consumption frequency`,
          confidence: 0.8,
          impact: 'medium',
          frequency: highFrequencyItems[0]._count.id,
          recommendation: 'Monitor high-frequency consumption items for optimization opportunities',
          detectedAt: new Date(),
        });
      }

      return patterns;
    } catch (error) {
      logger.warn("Failed to detect consumption patterns", { error });
      return patterns;
    }
  }

  private static async detectPerformancePatterns(startDate: Date, endDate: Date): Promise<Pattern[]> {
    const patterns: Pattern[] = [];

    try {
      // Analyze overtime patterns
      const overtimeRecords = await prisma.attendance.findMany({
        where: {
          overtimeHours: { gt: 0 },
          shift: {
            shiftDate: { gte: startDate, lte: endDate },
          },
        },
        include: {
          shift: true,
          employee: true,
        },
      });

      if (overtimeRecords.length > 5) {
        const avgOvertime = overtimeRecords.reduce((sum, r) => sum + r.overtimeHours, 0) / overtimeRecords.length;
        
        patterns.push({
          id: `overtime-pattern-${Date.now()}`,
          type: 'performance',
          description: `Consistent overtime pattern detected: ${overtimeRecords.length} instances, avg ${avgOvertime.toFixed(1)}h`,
          confidence: 0.7,
          impact: avgOvertime > 2 ? 'high' : 'medium',
          frequency: overtimeRecords.length,
          recommendation: 'Review staffing levels and workload distribution',
          detectedAt: new Date(),
        });
      }

      return patterns;
    } catch (error) {
      logger.warn("Failed to detect performance patterns", { error });
      return patterns;
    }
  }

  private static async detectOperationalPatterns(startDate: Date, endDate: Date): Promise<Pattern[]> {
    const patterns: Pattern[] = [];

    try {
      // Analyze incident patterns
      const incidents = await prisma.operationalNote.findMany({
        where: {
          reportDate: { gte: startDate, lte: endDate },
          tags: { has: 'incident' },
        },
      });

      if (incidents.length > 0) {
        // Group by day of week
        const dayOfWeekIncidents = new Map();
        incidents.forEach(incident => {
          const dayOfWeek = incident.reportDate.getDay();
          dayOfWeekIncidents.set(dayOfWeek, (dayOfWeekIncidents.get(dayOfWeek) || 0) + 1);
        });

        // Find peak incident days
        const maxIncidents = Math.max(...dayOfWeekIncidents.values());
        if (maxIncidents > 2) {
          const peakDays = Array.from(dayOfWeekIncidents.entries())
            .filter(([_, count]) => count === maxIncidents)
            .map(([day, _]) => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day]);

          patterns.push({
            id: `incident-day-pattern-${Date.now()}`,
            type: 'operational',
            description: `Higher incident frequency on ${peakDays.join(', ')}`,
            confidence: 0.6,
            impact: 'medium',
            frequency: maxIncidents,
            recommendation: 'Review procedures and staffing for high-incident days',
            detectedAt: new Date(),
          });
        }
      }

      return patterns;
    } catch (error) {
      logger.warn("Failed to detect operational patterns", { error });
      return patterns;
    }
  }

  private static async detectTimeBasedPatterns(startDate: Date, endDate: Date): Promise<Pattern[]> {
    // Placeholder for time-based pattern detection
    return [];
  }

  private static async analyzeAttendanceTrends(employeeId: string, startDate: Date, endDate: Date): Promise<TrendData[]> {
    // Placeholder for attendance trend analysis
    return [];
  }

  private static async detectComprehensiveAnomalies(startDate: Date, endDate: Date) {
    // Placeholder for comprehensive anomaly detection
    return [];
  }

  private static getRecommendation(type: string, trend: string, value: number): string {
    if (type === 'consumption') {
      if (trend === 'increasing') {
        return value > 100 ? 'Consider bulk purchasing or supplier negotiation' : 'Monitor for continued growth';
      } else if (trend === 'decreasing') {
        return 'Review inventory levels and usage patterns';
      }
      return 'Maintain current inventory management practices';
    } else if (type === 'performance') {
      if (trend === 'increasing') {
        return 'Recognize and maintain positive performance trend';
      } else if (trend === 'decreasing') {
        return 'Investigate causes and implement improvement measures';
      }
      return 'Continue performance monitoring';
    }
    return 'Monitor trends closely';
  }

  private static calculateProjection(currentValue: number, direction: string, timeframe: string): number {
    const multiplier = timeframe === 'weekly' ? 0.05 : timeframe === 'monthly' ? 0.15 : 0.4;
    
    switch (direction) {
      case 'increasing':
        return currentValue * (1 + multiplier);
      case 'decreasing':
        return currentValue * (1 - multiplier);
      default:
        return currentValue;
    }
  }
}