/**
 * RIBBAI Business Intelligence - Alert System Service
 * 
 * Intelligent alerting system for operational thresholds, trends, and anomalies.
 * Provides real-time monitoring and proactive notifications.
 */

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logging";
import { Alert, AlertRule, AlertCondition } from "../types";
import { OperationalKPIService } from "./operational-kpis";
import { TeamKPIService } from "./team-kpis";
import { FinancialKPIService } from "./financial-kpis";
import { HealthScoreService } from "./health-score";
import { TrendAnalysisService } from "./trend-analysis";

interface AlertThreshold {
  metric: string;
  category: 'operational' | 'team' | 'financial' | 'health' | 'trend';
  condition: 'greater_than' | 'less_than' | 'equals' | 'percentage_change';
  value: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendation: string;
}

interface AlertSummary {
  totalAlerts: number;
  criticalAlerts: number;
  categories: Record<string, number>;
  trends: string[];
  recommendations: string[];
  lastChecked: Date;
}

export class AlertService {
  /**
   * Alert thresholds configuration
   */
  private static readonly ALERT_THRESHOLDS: AlertThreshold[] = [
    // Operational Thresholds
    {
      metric: 'incident_count',
      category: 'operational',
      condition: 'greater_than',
      value: 3,
      severity: 'high',
      description: 'High incident frequency detected',
      recommendation: 'Review operational procedures and implement preventive measures',
    },
    {
      metric: 'stock_breaks',
      category: 'operational',
      condition: 'greater_than',
      value: 2,
      severity: 'medium',
      description: 'Multiple stock breaks impacting service',
      recommendation: 'Review inventory management and reorder points',
    },
    {
      metric: 'maintenance_overdue',
      category: 'operational',
      condition: 'greater_than',
      value: 0,
      severity: 'high',
      description: 'Overdue maintenance tasks detected',
      recommendation: 'Schedule immediate maintenance to prevent equipment failures',
    },
    
    // Team Performance Thresholds
    {
      metric: 'overtime_hours_daily',
      category: 'team',
      condition: 'greater_than',
      value: 8,
      severity: 'medium',
      description: 'Excessive daily overtime detected',
      recommendation: 'Review staffing levels and workload distribution',
    },
    {
      metric: 'overtime_hours_weekly',
      category: 'team',
      condition: 'greater_than',
      value: 25,
      severity: 'high',
      description: 'Weekly overtime exceeds acceptable limits',
      recommendation: 'Urgent staffing review required - potential burnout risk',
    },
    {
      metric: 'performance_score',
      category: 'team',
      condition: 'less_than',
      value: 6,
      severity: 'high',
      description: 'Team performance below acceptable standards',
      recommendation: 'Implement performance improvement plan and additional training',
    },
    
    // Financial Thresholds
    {
      metric: 'waste_percentage',
      category: 'financial',
      condition: 'greater_than',
      value: 5,
      severity: 'medium',
      description: 'Waste percentage exceeds acceptable threshold',
      recommendation: 'Implement waste reduction protocols and review portion control',
    },
    {
      metric: 'incident_financial_impact',
      category: 'financial',
      condition: 'greater_than',
      value: 100,
      severity: 'high',
      description: 'High financial impact from operational incidents',
      recommendation: 'Strengthen incident prevention and financial controls',
    },
    
    // Health Score Thresholds
    {
      metric: 'health_score',
      category: 'health',
      condition: 'less_than',
      value: 60,
      severity: 'critical',
      description: 'Restaurant health score below acceptable threshold',
      recommendation: 'Immediate comprehensive operational review required',
    },
  ];

  /**
   * Generate alerts based on current metrics and rules
   */
  static async generateAlerts(date: Date): Promise<Alert[]> {
    logger.info("Generating intelligent alerts", { date: date.toISOString() });

    try {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      // Check all alert categories
      const [
        operationalAlerts,
        teamAlerts,
        financialAlerts,
        healthAlerts,
        trendAlerts
      ] = await Promise.all([
        this.checkOperationalThresholds(date),
        this.checkTeamAlerts(date),
        this.checkFinancialAlerts(date),
        this.checkHealthAlerts(date),
        this.checkTrendAlerts([]), // Will be populated with actual trends
      ]);

      const allAlerts = [
        ...operationalAlerts,
        ...teamAlerts,
        ...financialAlerts,
        ...healthAlerts,
        ...trendAlerts,
      ];

      // Store alerts in database for history
      await this.storeAlerts(allAlerts, date);

      logger.info("Alert generation completed", {
        date: date.toISOString(),
        totalAlerts: allAlerts.length,
        criticalAlerts: allAlerts.filter(a => a.severity === 'critical').length,
      });

      return allAlerts;
    } catch (error) {
      logger.error("Failed to generate alerts", { error, date });
      throw error;
    }
  }

  /**
   * Check threshold-based alerts
   */
  static async checkThresholdAlerts(
    metrics: Record<string, number>,
    rules: AlertRule[]
  ): Promise<Alert[]> {
    const alerts: Alert[] = [];

    try {
      for (const rule of rules) {
        if (!rule.isActive) continue;

        const metricValue = metrics[rule.metric];
        if (metricValue === undefined) continue;

        let triggered = false;
        
        switch (rule.condition.operator) {
          case 'greater_than':
            triggered = metricValue > rule.condition.value;
            break;
          case 'less_than':
            triggered = metricValue < rule.condition.value;
            break;
          case 'equals':
            triggered = metricValue === rule.condition.value;
            break;
          case 'percentage_change':
            // Would need historical comparison
            triggered = false;
            break;
        }

        if (triggered) {
          alerts.push({
            id: `threshold-alert-${rule.id}-${Date.now()}`,
            type: 'threshold',
            category: rule.category as Alert['category'],
            severity: rule.severity as Alert['severity'],
            title: rule.name,
            message: `${rule.metric} value of ${metricValue} ${rule.condition.operator} ${rule.condition.value}`,
            metric: rule.metric,
            currentValue: metricValue,
            thresholdValue: rule.condition.value,
            recommendation: rule.action || 'Review and take appropriate action',
            triggeredAt: new Date(),
            resolved: false,
          });
        }
      }

      return alerts;
    } catch (error) {
      logger.warn("Failed to check threshold alerts", { error });
      return alerts;
    }
  }

  /**
   * Check trend-based alerts
   */
  static async checkTrendAlerts(
    trends: Array<{ metric: string; trend: string; confidence: number }>
  ): Promise<Alert[]> {
    const alerts: Alert[] = [];

    try {
      // Get recent trend analysis
      const trendAnalysis = await TrendAnalysisService.analyzeComprehensiveTrends('weekly');
      
      // Check for concerning trends
      trendAnalysis.trends.forEach(trend => {
        if (trend.confidence > 0.7) {
          if (trend.type === 'consumption' && trend.direction === 'increasing' && trend.value > 50) {
            alerts.push({
              id: `consumption-trend-alert-${Date.now()}`,
              type: 'trend',
              category: 'operational',
              severity: 'medium',
              title: 'Abnormal Consumption Increase',
              message: `${trend.metric} consumption increased by ${trend.value.toFixed(1)}%`,
              metric: 'consumption_trend',
              currentValue: trend.value,
              thresholdValue: 30,
              recommendation: trend.recommendation,
              triggeredAt: new Date(),
              resolved: false,
            });
          }

          if (trend.type === 'performance' && trend.direction === 'decreasing' && trend.value > 15) {
            alerts.push({
              id: `performance-trend-alert-${Date.now()}`,
              type: 'trend',
              category: 'team',
              severity: 'high',
              title: 'Performance Decline Detected',
              message: `${trend.metric} declining by ${trend.value.toFixed(1)}%`,
              metric: 'performance_trend',
              currentValue: trend.value,
              thresholdValue: 10,
              recommendation: trend.recommendation,
              triggeredAt: new Date(),
              resolved: false,
            });
          }
        }
      });

      return alerts;
    } catch (error) {
      logger.warn("Failed to check trend alerts", { error });
      return alerts;
    }
  }

  /**
   * Create alert rule
   */
  static async createAlertRule(rule: Omit<AlertRule, "id" | "createdAt">): Promise<AlertRule> {
    try {
      const newRule = await prisma.alertRule.create({
        data: {
          name: rule.name,
          description: rule.description || '',
          category: rule.category,
          metric: rule.metric,
          condition: rule.condition as any,
          severity: rule.severity,
          action: rule.action || '',
          isActive: rule.isActive ?? true,
        },
      });

      logger.info("Alert rule created", { ruleId: newRule.id, name: newRule.name });
      
      return newRule as AlertRule;
    } catch (error) {
      logger.error("Failed to create alert rule", { error, rule });
      throw error;
    }
  }

  /**
   * Get active alert rules
   */
  static async getActiveRules(): Promise<AlertRule[]> {
    try {
      const rules = await prisma.alertRule.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });

      return rules as AlertRule[];
    } catch (error) {
      logger.error("Failed to get active rules", { error });
      return [];
    }
  }

  // Private helper methods for specific alert checks

  private static async checkOperationalThresholds(date: Date): Promise<Alert[]> {
    const alerts: Alert[] = [];

    try {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      const operationalMetrics = await OperationalKPIService.calculateOperationalMetrics(startDate, endDate);

      // Check incident count
      if (operationalMetrics.incidentCount?.value > 3) {
        alerts.push({
          id: `incident-alert-${date.getTime()}`,
          type: 'threshold',
          category: 'operational',
          severity: operationalMetrics.incidentCount.value > 5 ? 'critical' : 'high',
          title: 'High Incident Frequency',
          message: `${operationalMetrics.incidentCount.value} incidents recorded today`,
          metric: 'incident_count',
          currentValue: operationalMetrics.incidentCount.value,
          thresholdValue: 3,
          recommendation: 'Review operational procedures and implement preventive measures',
          triggeredAt: new Date(),
          resolved: false,
        });
      }

      // Check stock breaks
      if (operationalMetrics.stockBreaks?.value > 1) {
        alerts.push({
          id: `stock-breaks-alert-${date.getTime()}`,
          type: 'threshold',
          category: 'operational',
          severity: 'medium',
          title: 'Stock Availability Issues',
          message: `${operationalMetrics.stockBreaks.value} stock breaks detected`,
          metric: 'stock_breaks',
          currentValue: operationalMetrics.stockBreaks.value,
          thresholdValue: 1,
          recommendation: 'Review inventory reorder points and stock monitoring',
          triggeredAt: new Date(),
          resolved: false,
        });
      }

      return alerts;
    } catch (error) {
      logger.warn("Failed to check operational thresholds", { error, date });
      return alerts;
    }
  }

  private static async checkTeamAlerts(date: Date): Promise<Alert[]> {
    const alerts: Alert[] = [];

    try {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      const teamSummary = await TeamKPIService.getTeamPerformanceSummary(startDate, endDate);

      // Check daily overtime
      const dailyOvertime = teamSummary.totalOvertimeHours?.value || 0;
      if (dailyOvertime > 8) {
        alerts.push({
          id: `daily-overtime-alert-${date.getTime()}`,
          type: 'threshold',
          category: 'team',
          severity: 'high',
          title: 'Excessive Daily Overtime',
          message: `${dailyOvertime.toFixed(1)} hours of overtime today`,
          metric: 'daily_overtime',
          currentValue: dailyOvertime,
          thresholdValue: 8,
          recommendation: 'Review staffing schedule and workload distribution',
          triggeredAt: new Date(),
          resolved: false,
        });
      }

      // Check team performance
      const performanceScore = teamSummary.avgPerformanceScore?.value || 0;
      if (performanceScore < 6) {
        alerts.push({
          id: `performance-alert-${date.getTime()}`,
          type: 'threshold',
          category: 'team',
          severity: 'high',
          title: 'Below Standard Performance',
          message: `Team performance score: ${performanceScore.toFixed(1)}/10`,
          metric: 'team_performance',
          currentValue: performanceScore,
          thresholdValue: 6,
          recommendation: 'Implement performance improvement plan',
          triggeredAt: new Date(),
          resolved: false,
        });
      }

      return alerts;
    } catch (error) {
      logger.warn("Failed to check team alerts", { error, date });
      return alerts;
    }
  }

  private static async checkFinancialAlerts(date: Date): Promise<Alert[]> {
    const alerts: Alert[] = [];

    try {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      const financialMetrics = await FinancialKPIService.calculateFinancialMetrics(startDate, endDate);

      // Check waste percentage
      const totalConsumption = financialMetrics.totalConsumption?.value || 1;
      const wasteValue = financialMetrics.wasteValue?.value || 0;
      const wastePercentage = (wasteValue / totalConsumption) * 100;

      if (wastePercentage > 5) {
        alerts.push({
          id: `waste-alert-${date.getTime()}`,
          type: 'threshold',
          category: 'financial',
          severity: 'high',
          title: 'High Waste Percentage',
          message: `Waste at ${wastePercentage.toFixed(1)}% of consumption`,
          metric: 'waste_percentage',
          currentValue: wastePercentage,
          thresholdValue: 5,
          recommendation: 'Implement waste reduction protocols',
          triggeredAt: new Date(),
          resolved: false,
        });
      }

      return alerts;
    } catch (error) {
      logger.warn("Failed to check financial alerts", { error, date });
      return alerts;
    }
  }

  private static async checkHealthAlerts(date: Date): Promise<Alert[]> {
    const alerts: Alert[] = [];

    try {
      const healthScore = await HealthScoreService.calculateHealthScore(date);

      if (healthScore.overallScore < 60) {
        alerts.push({
          id: `health-score-alert-${date.getTime()}`,
          type: 'threshold',
          category: 'health',
          severity: healthScore.overallScore < 40 ? 'critical' : 'high',
          title: 'Low Restaurant Health Score',
          message: `Health score: ${healthScore.overallScore.toFixed(1)}/100`,
          metric: 'health_score',
          currentValue: healthScore.overallScore,
          thresholdValue: 60,
          recommendation: 'Conduct comprehensive operational review',
          triggeredAt: new Date(),
          resolved: false,
        });
      }

      return alerts;
    } catch (error) {
      logger.warn("Failed to check health alerts", { error, date });
      return alerts;
    }
  }

  private static async storeAlerts(alerts: Alert[], date: Date): Promise<void> {
    try {
      for (const alert of alerts) {
        await prisma.alertHistory.upsert({
          where: { id: alert.id },
          create: {
            id: alert.id,
            type: alert.type,
            category: alert.category,
            severity: alert.severity,
            title: alert.title,
            message: alert.message,
            metric: alert.metric,
            currentValue: alert.currentValue,
            thresholdValue: alert.thresholdValue,
            recommendation: alert.recommendation,
            triggeredAt: alert.triggeredAt,
            resolved: alert.resolved,
          },
          update: {
            resolved: alert.resolved,
          },
        });
      }
    } catch (error) {
      logger.warn("Failed to store alerts", { error });
    }
  }

  /**
   * Get alert summary for management dashboard
   */
  static async getAlertSummary(startDate: Date, endDate: Date): Promise<AlertSummary> {
    try {
      const alerts = await prisma.alertHistory.findMany({
        where: {
          triggeredAt: { gte: startDate, lte: endDate },
        },
      });

      const categories: Record<string, number> = {};
      alerts.forEach(alert => {
        categories[alert.category] = (categories[alert.category] || 0) + 1;
      });

      return {
        totalAlerts: alerts.length,
        criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
        categories,
        trends: [],
        recommendations: [...new Set(alerts.map(a => a.recommendation).filter(Boolean))].slice(0, 5),
        lastChecked: new Date(),
      };
    } catch (error) {
      logger.error("Failed to generate alert summary", { error });
      return {
        totalAlerts: 0,
        criticalAlerts: 0,
        categories: {},
        trends: [],
        recommendations: [],
        lastChecked: new Date(),
      };
    }
  }

  /**
   * Get active alerts for dashboard
   */
  static async getActiveAlerts(limit: number = 10): Promise<Alert[]> {
    try {
      const activeAlerts = await prisma.alertHistory.findMany({
        where: {
          resolved: false,
          triggeredAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
        orderBy: [
          { severity: 'desc' },
          { triggeredAt: 'desc' },
        ],
        take: limit,
      });

      return activeAlerts.map(alert => ({
        id: alert.id,
        type: alert.type as Alert['type'],
        category: alert.category as Alert['category'],
        severity: alert.severity as Alert['severity'],
        title: alert.title,
        message: alert.message,
        metric: alert.metric,
        currentValue: alert.currentValue,
        thresholdValue: alert.thresholdValue || 0,
        recommendation: alert.recommendation || '',
        triggeredAt: alert.triggeredAt,
        resolved: alert.resolved,
      }));
    } catch (error) {
      logger.error("Failed to get active alerts", { error });
      return [];
    }
  }
}