/**
 * RIBBAI Business Intelligence - Health Score Service
 * 
 * Comprehensive restaurant health score calculation (0-100) incorporating
 * all operational dimensions for executive decision support.
 */

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logging";
import { HealthScore } from "../types";
import { OperationalKPIService } from "./operational-kpis";
import { TeamKPIService } from "./team-kpis";
import { FinancialKPIService } from "./financial-kpis";

interface HealthScoreDimension {
  name: string;
  weight: number;
  score: number;
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  factors: Array<{
    name: string;
    value: number;
    impact: number;
    description: string;
  }>;
}

interface HealthScoreBreakdown {
  operational: HealthScoreDimension;
  inventory: HealthScoreDimension;
  financial: HealthScoreDimension;
  team: HealthScoreDimension;
  quality: HealthScoreDimension;
  efficiency: HealthScoreDimension;
}

interface HealthScoreResult {
  overallScore: number;
  breakdown: HealthScoreBreakdown;
  trend: "improving" | "declining" | "stable";
  recommendations: string[];
  criticalAreas: string[];
  strengths: string[];
  calculatedAt: Date;
  period: string;
}

export class HealthScoreService {
  /**
   * Health score dimension weights (must sum to 1.0)
   */
  private static readonly DIMENSION_WEIGHTS = {
    operational: 0.20,  // 20% - Incidents, maintenance, improvements
    inventory: 0.15,    // 15% - Stock levels, waste, efficiency
    financial: 0.20,    // 20% - Costs, consumption, CMP efficiency
    team: 0.25,         // 25% - Performance, overtime, engagement
    quality: 0.10,      // 10% - Service quality, customer satisfaction
    efficiency: 0.10,   // 10% - Operational efficiency, productivity
  };

  /**
   * Calculate overall restaurant health score
   */
  static async calculateHealthScore(date: Date): Promise<HealthScore> {
    logger.info("Calculating restaurant health score", { date: date.toISOString() });

    try {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      // Get data from all KPI engines
      const [operationalMetrics, teamSummary, financialMetrics] = await Promise.all([
        OperationalKPIService.calculateOperationalMetrics(startDate, endDate),
        TeamKPIService.getTeamPerformanceSummary(startDate, endDate),
        FinancialKPIService.calculateFinancialMetrics(startDate, endDate),
      ]);

      // Calculate individual dimension scores
      const breakdown: HealthScoreBreakdown = {
        operational: await this.calculateOperationalScore(operationalMetrics, startDate, endDate),
        inventory: await this.calculateInventoryScore(financialMetrics, startDate, endDate),
        financial: await this.calculateFinancialScore(financialMetrics, startDate, endDate),
        team: await this.calculateTeamScore(teamSummary, startDate, endDate),
        quality: await this.calculateQualityScore(operationalMetrics, startDate, endDate),
        efficiency: await this.calculateEfficiencyScore(operationalMetrics, teamSummary, financialMetrics),
      };

      // Calculate weighted overall score
      const overallScore = Object.entries(breakdown).reduce((total, [dimension, data]) => {
        const weight = this.DIMENSION_WEIGHTS[dimension as keyof typeof this.DIMENSION_WEIGHTS];
        return total + (data.score * weight);
      }, 0);

      // Determine trend (compare with previous day)
      const trend = await this.calculateTrend(date, overallScore);

      // Generate recommendations and insights
      const { recommendations, criticalAreas, strengths } = await this.generateInsights(
        overallScore,
        breakdown,
        []
      );

      // Store health score in history
      await this.storeHealthScore(date, overallScore, breakdown);

      const result: HealthScore = {
        overallScore: Math.round(overallScore * 100) / 100,
        categoryScores: {
          operational: breakdown.operational.score,
          team: breakdown.team.score,
          financial: breakdown.financial.score,
          quality: breakdown.quality.score,
          maintenance: breakdown.operational.factors.find(f => f.name === 'Maintenance Compliance')?.value || 0,
          communication: breakdown.team.factors.find(f => f.name === 'Team Engagement')?.value || 0,
        },
        trend,
        status: this.getScoreStatus(overallScore),
        factors: Object.values(breakdown).flatMap(dimension =>
          dimension.factors.map(factor => ({
            name: factor.name,
            weight: factor.impact,
            score: factor.value,
            impact: factor.value >= 70 ? "positive" as const : "negative" as const,
          }))
        ),
        recommendations,
        calculatedAt: new Date(),
      };

      logger.info("Health score calculated successfully", {
        date: date.toISOString(),
        overallScore: result.overallScore,
        trend,
        criticalAreas: criticalAreas.length,
        recommendations: recommendations.length,
      });

      return result;
    } catch (error) {
      logger.error("Failed to calculate health score", { error, date });
      throw error;
    }
  }

  /**
   * Calculate operational dimension score
   */
  private static async calculateOperationalScore(
    metrics: any,
    startDate: Date,
    endDate: Date
  ): Promise<HealthScoreDimension> {
    const incidentCount = metrics.incidentCount?.value || 0;
    const stockBreaks = metrics.stockBreaks?.value || 0;
    const maintenanceCompleted = metrics.maintenanceCompleted?.value || 0;
    const maintenancePlanned = metrics.maintenancePlanned?.value || 0;
    const improvementsImplemented = metrics.improvementsImplemented?.value || 0;

    const factors = [
      {
        name: 'Incident Management',
        value: Math.max(0, 100 - (incidentCount * 10)),
        impact: 0.4,
        description: `${incidentCount} incidents recorded`,
      },
      {
        name: 'Stock Availability',
        value: Math.max(0, 100 - (stockBreaks * 15)),
        impact: 0.3,
        description: `${stockBreaks} stock breaks detected`,
      },
      {
        name: 'Maintenance Compliance',
        value: Math.min(100, (maintenanceCompleted / Math.max(1, maintenancePlanned)) * 100),
        impact: 0.2,
        description: `${maintenanceCompleted}/${maintenancePlanned} maintenance tasks completed`,
      },
      {
        name: 'Service Improvements',
        value: Math.min(100, improvementsImplemented * 10),
        impact: 0.1,
        description: `${improvementsImplemented} improvements implemented`,
      },
    ];

    const weightedScore = factors.reduce((score, factor) => {
      return score + (factor.value * factor.impact);
    }, 0);

    return {
      name: 'Operational Excellence',
      weight: this.DIMENSION_WEIGHTS.operational,
      score: Math.max(0, Math.min(100, weightedScore)),
      status: this.getScoreStatus(weightedScore),
      factors,
    };
  }

  /**
   * Calculate inventory dimension score
   */
  private static async calculateInventoryScore(
    metrics: any,
    startDate: Date,
    endDate: Date
  ): Promise<HealthScoreDimension> {
    // Get current inventory status
    const currentValue = metrics.currentInventoryValue?.value || 0;
    const wasteValue = metrics.wasteValue?.value || 0;
    const consumptionValue = metrics.totalConsumption?.value || 1;

    const factors = [
      {
        name: 'Stock Value Management',
        value: Math.min(100, currentValue > 1000 ? 95 : (currentValue / 1000) * 95),
        impact: 0.4,
        description: `Inventory value: €${currentValue.toFixed(2)}`,
      },
      {
        name: 'Waste Control',
        value: Math.max(0, 100 - (wasteValue > 0 ? (wasteValue / consumptionValue) * 200 : 0)),
        impact: 0.3,
        description: `Waste: €${wasteValue.toFixed(2)} (${((wasteValue / Math.max(1, consumptionValue)) * 100).toFixed(1)}%)`,
      },
      {
        name: 'Stock Turnover',
        value: consumptionValue > 0 ? Math.min(100, (consumptionValue / currentValue) * 50) : 50,
        impact: 0.2,
        description: `Turnover ratio: ${(consumptionValue / Math.max(1, currentValue)).toFixed(2)}`,
      },
      {
        name: 'Inventory Efficiency',
        value: 85, // Base efficiency score
        impact: 0.1,
        description: 'Stock management efficiency',
      },
    ];

    const weightedScore = factors.reduce((score, factor) => {
      return score + (factor.value * factor.impact);
    }, 0);

    return {
      name: 'Inventory Management',
      weight: this.DIMENSION_WEIGHTS.inventory,
      score: Math.max(0, Math.min(100, weightedScore)),
      status: this.getScoreStatus(weightedScore),
      factors,
    };
  }

  /**
   * Calculate financial dimension score
   */
  private static async calculateFinancialScore(
    metrics: any,
    startDate: Date,
    endDate: Date
  ): Promise<HealthScoreDimension> {
    const incidentFinancialImpact = metrics.incidentFinancialImpact?.value || 0;
    const totalConsumption = metrics.totalConsumption?.value || 0;
    const wasteValue = metrics.wasteValue?.value || 0;

    const factors = [
      {
        name: 'Cost Control',
        value: Math.max(0, 100 - (incidentFinancialImpact / 10)),
        impact: 0.3,
        description: `Incident impact: €${incidentFinancialImpact.toFixed(2)}`,
      },
      {
        name: 'Consumption Efficiency',
        value: 80, // Base efficiency - would need historical comparison
        impact: 0.25,
        description: `Total consumption: €${totalConsumption.toFixed(2)}`,
      },
      {
        name: 'Waste Management',
        value: Math.max(0, 100 - (wasteValue > 0 ? (wasteValue / Math.max(1, totalConsumption)) * 100 : 0)),
        impact: 0.25,
        description: `Waste control effectiveness`,
      },
      {
        name: 'CMP Accuracy',
        value: 90, // CMP system accuracy - baseline high
        impact: 0.2,
        description: 'Weighted-average cost tracking accuracy',
      },
    ];

    const weightedScore = factors.reduce((score, factor) => {
      return score + (factor.value * factor.impact);
    }, 0);

    return {
      name: 'Financial Performance',
      weight: this.DIMENSION_WEIGHTS.financial,
      score: Math.max(0, Math.min(100, weightedScore)),
      status: this.getScoreStatus(weightedScore),
      factors,
    };
  }

  /**
   * Calculate team dimension score
   */
  private static async calculateTeamScore(
    teamSummary: any,
    startDate: Date,
    endDate: Date
  ): Promise<HealthScoreDimension> {
    const avgPerformanceScore = teamSummary.avgPerformanceScore?.value || 0;
    const totalOvertimeHours = teamSummary.totalOvertimeHours?.value || 0;
    const participationRates = teamSummary.participationRates || {};
    const improvementAreas = teamSummary.improvementAreas || [];

    // Calculate participation rate safely
    const participationValues = Object.values(participationRates);
    const avgParticipation = participationValues.length > 0 
      ? participationValues.reduce((sum: number, kpi: any) => sum + (kpi?.value || 0), 0) / participationValues.length 
      : 0.5; // Default to 50% if no data

    const factors = [
      {
        name: 'Performance Quality',
        value: avgPerformanceScore * 10, // Assuming 0-10 scale
        impact: 0.4,
        description: `Average performance: ${avgPerformanceScore.toFixed(1)}/10`,
      },
      {
        name: 'Overtime Management',
        value: Math.max(0, 100 - (totalOvertimeHours > 20 ? (totalOvertimeHours - 20) * 2 : 0)),
        impact: 0.3,
        description: `Overtime hours: ${totalOvertimeHours.toFixed(1)}h`,
      },
      {
        name: 'Team Engagement',
        value: Math.min(100, avgParticipation * 100),
        impact: 0.2,
        description: `Participation rate: ${(avgParticipation * 100).toFixed(1)}%`,
      },
      {
        name: 'Development Progress',
        value: Math.min(100, improvementAreas.length > 0 ? 70 : 90),
        impact: 0.1,
        description: `${improvementAreas.length} areas needing development`,
      },
    ];

    const weightedScore = factors.reduce((score, factor) => {
      return score + (factor.value * factor.impact);
    }, 0);

    return {
      name: 'Team Performance',
      weight: this.DIMENSION_WEIGHTS.team,
      score: Math.max(0, Math.min(100, weightedScore)),
      status: this.getScoreStatus(weightedScore),
      factors,
    };
  }

  /**
   * Calculate quality dimension score
   */
  private static async calculateQualityScore(
    operationalMetrics: any,
    startDate: Date,
    endDate: Date
  ): Promise<HealthScoreDimension> {
    // Get quality-related operational notes
    const qualityNotes = await prisma.operationalNote.count({
      where: {
        reportDate: { gte: startDate, lte: endDate },
        OR: [
          { content: { contains: 'qualidade', mode: 'insensitive' } },
          { content: { contains: 'quality', mode: 'insensitive' } },
          { content: { contains: 'excelente', mode: 'insensitive' } },
          { tags: { has: 'quality' } },
        ],
      },
    });

    const complaintNotes = await prisma.operationalNote.count({
      where: {
        reportDate: { gte: startDate, lte: endDate },
        OR: [
          { content: { contains: 'reclamação', mode: 'insensitive' } },
          { content: { contains: 'complaint', mode: 'insensitive' } },
          { tags: { has: 'complaint' } },
        ],
      },
    });

    const factors = [
      {
        name: 'Service Quality',
        value: Math.max(0, 100 - (complaintNotes * 20)),
        impact: 0.4,
        description: `${complaintNotes} complaints recorded`,
      },
      {
        name: 'Quality Recognition',
        value: Math.min(100, qualityNotes * 15),
        impact: 0.3,
        description: `${qualityNotes} quality acknowledgments`,
      },
      {
        name: 'Incident Impact on Quality',
        value: Math.max(0, 100 - ((operationalMetrics.incidentCount?.value || 0) * 5)),
        impact: 0.2,
        description: 'Service continuity maintenance',
      },
      {
        name: 'Process Consistency',
        value: 85, // Base consistency score
        impact: 0.1,
        description: 'Standard process adherence',
      },
    ];

    const weightedScore = factors.reduce((score, factor) => {
      return score + (factor.value * factor.impact);
    }, 0);

    return {
      name: 'Service Quality',
      weight: this.DIMENSION_WEIGHTS.quality,
      score: Math.max(0, Math.min(100, weightedScore)),
      status: this.getScoreStatus(weightedScore),
      factors,
    };
  }

  /**
   * Calculate efficiency dimension score
   */
  private static async calculateEfficiencyScore(
    operationalMetrics: any,
    teamSummary: any,
    financialMetrics: any
  ): Promise<HealthScoreDimension> {
    const incidentCount = operationalMetrics.incidentCount?.value || 0;
    const overtimeHours = teamSummary.totalOvertimeHours?.value || 0;
    const wasteValue = financialMetrics.wasteValue?.value || 0;
    const totalConsumption = financialMetrics.totalConsumption?.value || 1;
    const improvementsImplemented = operationalMetrics.improvementsImplemented?.value || 0;

    const factors = [
      {
        name: 'Operational Efficiency',
        value: Math.max(0, 100 - (incidentCount * 8)),
        impact: 0.4,
        description: 'Smooth operations with minimal disruptions',
      },
      {
        name: 'Resource Utilization',
        value: Math.max(0, 100 - (overtimeHours > 15 ? (overtimeHours - 15) * 3 : 0)),
        impact: 0.3,
        description: 'Efficient staff deployment',
      },
      {
        name: 'Cost Efficiency',
        value: Math.max(0, 100 - (wasteValue / totalConsumption * 100)),
        impact: 0.2,
        description: 'Optimized resource consumption',
      },
      {
        name: 'Process Optimization',
        value: Math.min(100, improvementsImplemented * 8),
        impact: 0.1,
        description: 'Continuous improvement implementation',
      },
    ];

    const weightedScore = factors.reduce((score, factor) => {
      return score + (factor.value * factor.impact);
    }, 0);

    return {
      name: 'Operational Efficiency',
      weight: this.DIMENSION_WEIGHTS.efficiency,
      score: Math.max(0, Math.min(100, weightedScore)),
      status: this.getScoreStatus(weightedScore),
      factors,
    };
  }

  /**
   * Calculate trend by comparing with previous period
   */
  private static async calculateTrend(date: Date, currentScore: number): Promise<"improving" | "declining" | "stable"> {
    try {
      const previousDate = new Date(date);
      previousDate.setDate(date.getDate() - 7); // Compare with a week ago

      const historicalScores = await prisma.healthScoreHistory.findMany({
        where: {
          date: {
            gte: previousDate,
            lt: date,
          },
        },
        orderBy: { date: 'desc' },
        take: 3,
      });

      if (historicalScores.length === 0) {
        return 'stable';
      }

      const avgPreviousScore = historicalScores.reduce((sum, record) => sum + record.overallScore, 0) / historicalScores.length;
      const difference = currentScore - avgPreviousScore;

      if (difference > 2) return 'improving';
      if (difference < -2) return 'declining';
      return 'stable';
    } catch (error) {
      logger.warn("Failed to calculate trend", { error, date });
      return 'stable';
    }
  }

  /**
   * Store health score in history
   */
  private static async storeHealthScore(date: Date, score: number, breakdown: HealthScoreBreakdown): Promise<void> {
    try {
      // Extract individual category scores from breakdown
      const operationalScore = breakdown.operational?.score || 0;
      const teamScore = breakdown.team?.score || 0;
      const financialScore = breakdown.financial?.score || 0;
      const qualityScore = breakdown.quality?.score || 0;
      const efficiencyScore = breakdown.efficiency?.score || 0;
      const inventoryScore = breakdown.inventory?.score || 0;

      // Generate factors array for JSON field
      const factors = Object.values(breakdown).map(category => ({
        name: category.name,
        weight: category.weight,
        score: category.score,
        status: category.status,
        factors: category.factors
      }));

      // Generate recommendations based on critical areas
      let recommendations = this.generateHealthRecommendations(breakdown);
      
      // Ensure recommendations is always an array
      if (!Array.isArray(recommendations)) {
        recommendations = [
          "Manter padrões de excelência operacional",
          "Continuar monitorização de KPIs críticos"
        ];
      }

      logger.debug("Health score recommendations generated", {
        date: date.toISOString(),
        recommendationsCount: recommendations.length,
        recommendations: recommendations
      });

      await prisma.healthScoreHistory.upsert({
        where: { date },
        create: {
          date,
          overallScore: score,
          operationalScore,
          teamScore,
          financialScore,
          qualityScore,
          maintenanceScore: efficiencyScore, // Map efficiency to maintenance
          communicationScore: inventoryScore, // Map inventory to communication
          factors,
          recommendations: {
            set: recommendations // Use 'set' for string array creation
          },
          calculationVersion: "2.0",
          dataPointsUsed: factors.length,
          calculatedBy: "HealthScoreService"
        },
        update: {
          overallScore: score,
          operationalScore,
          teamScore,
          financialScore,
          qualityScore,
          maintenanceScore: efficiencyScore,
          communicationScore: inventoryScore,
          factors,
          recommendations: {
            set: recommendations // Use 'set' for string array updates
          },
          calculationVersion: "2.0",
          dataPointsUsed: factors.length,
          calculatedBy: "HealthScoreService"
        }
      });

      logger.debug("Health score stored successfully", {
        date: date.toISOString(),
        score,
        operationalScore,
        teamScore,
        financialScore
      });
    } catch (error) {
      logger.warn("Failed to store health score", {
        error: error.message,
        date: date.toISOString(),
        score
      });
    }
  }

  /**
   * Get score status based on value
   */
  private static getScoreStatus(score: number): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'fair';
    if (score >= 40) return 'poor';
    return 'critical';
  }

  /**
   * Generate health recommendations based on breakdown analysis
   */
  private static generateHealthRecommendations(breakdown: HealthScoreBreakdown): string[] {
    const recommendations: string[] = [];

    try {
      // Analyze each category and suggest improvements
      Object.values(breakdown).forEach(category => {
        if (category && typeof category.score === 'number') {
          if (category.score < 60) {
            recommendations.push(`Ação crítica necessária: ${category.name} (${category.score.toFixed(1)}%)`);
          } else if (category.score < 75) {
            recommendations.push(`Melhorar ${category.name}: implementar ações de melhoria`);
          }

          // Specific recommendations based on factors
          if (category.factors && Array.isArray(category.factors)) {
            category.factors.forEach(factor => {
              if (factor && typeof factor.value === 'number' && typeof factor.impact === 'number') {
                if (factor.value < 50 && factor.impact >= 0.3) {
                  recommendations.push(`Prioridade alta: ${factor.description}`);
                }
              }
            });
          }
        }
      });

      // Default recommendations if all scores are good
      if (recommendations.length === 0) {
        recommendations.push("Manter padrões de excelência operacional");
        recommendations.push("Continuar monitorização de KPIs críticos");
      }

      return recommendations.slice(0, 5); // Limit to top 5 recommendations
    } catch (error) {
      // Fallback recommendations
      return [
        "Manter padrões de excelência operacional",
        "Continuar monitorização de KPIs críticos"
      ];
    }
  }

  /**
   * Calculate category-specific health scores
   */
  static async calculateCategoryScores(date: Date): Promise<{
    operational: number;
    team: number;
    financial: number;
    quality: number;
    maintenance: number;
    communication: number;
  }> {
    try {
      const healthScore = await this.calculateHealthScore(date);
      return healthScore.categoryScores;
    } catch (error) {
      logger.error("Failed to calculate category scores", { error, date });
      return {
        operational: 0,
        team: 0,
        financial: 0,
        quality: 0,
        maintenance: 0,
        communication: 0,
      };
    }
  }

  /**
   * Get health score factors and their impacts
   */
  static async getHealthFactors(date: Date): Promise<Array<{
    name: string;
    weight: number;
    score: number;
    impact: "positive" | "negative";
  }>> {
    try {
      const healthScore = await this.calculateHealthScore(date);
      return healthScore.factors;
    } catch (error) {
      logger.error("Failed to get health factors", { error, date });
      return [];
    }
  }

  /**
   * Generate health-based recommendations
   */
  static async generateHealthRecommendations(scoreResult: HealthScoreResult): Promise<string[]> {
    const recommendations: string[] = [];

    try {
      // Based on overall score
      if (scoreResult.overallScore < 60) {
        recommendations.push("Immediate management intervention required - conduct comprehensive operational review");
      } else if (scoreResult.overallScore < 75) {
        recommendations.push("Focus on improvement areas identified in category breakdown");
      }

      // Category-specific recommendations using breakdown
      if (scoreResult.breakdown?.operational?.score < 70) {
        recommendations.push("Strengthen incident prevention and operational procedures");
      }
      if (scoreResult.breakdown?.team?.score < 70) {
        recommendations.push("Implement team development and performance improvement initiatives");
      }
      if (scoreResult.breakdown?.financial?.score < 70) {
        recommendations.push("Review cost control measures and financial management processes");
      }
      if (scoreResult.breakdown?.quality?.score < 70) {
        recommendations.push("Enhance service quality standards and customer satisfaction measures");
      }

      return recommendations.concat(scoreResult.recommendations || []).slice(0, 5);
    } catch (error) {
      return [
        "Conduct comprehensive operational review",
        "Monitor key performance indicators closely"
      ];
    }
  }

  /**
   * Generate insights based on current and historical health scores
   */
  private static async generateInsights(
    currentScore: number,
    breakdown: HealthScoreBreakdown,
    historicalData: Array<{ date: Date; score: number }>
  ): Promise<{
    recommendations: string[];
    criticalAreas: string[];
    strengths: string[];
  }> {
    const recommendations: string[] = [];
    const criticalAreas: string[] = [];
    const strengths: string[] = [];

    // Analyze each dimension
    Object.entries(breakdown).forEach(([dimension, data]) => {
      if (data.score >= 85) {
        strengths.push(`${data.name}: Strong performance (${data.score.toFixed(1)}%)`);
      } else if (data.score < 60) {
        criticalAreas.push(`${data.name}: Requires immediate attention (${data.score.toFixed(1)}%)`);
        
        // Generate specific recommendations based on dimension
        switch (dimension) {
          case 'operational':
            if (data.factors.find(f => f.name === 'Incident Management')?.value < 70) {
              recommendations.push("Implement proactive incident prevention measures and review operational procedures");
            }
            break;
          case 'team':
            if (data.factors.find(f => f.name === 'Performance Quality')?.value < 70) {
              recommendations.push("Focus on team training and performance development initiatives");
            }
            if (data.factors.find(f => f.name === 'Overtime Management')?.value < 70) {
              recommendations.push("Review staffing levels and workload distribution to reduce overtime dependency");
            }
            break;
          case 'financial':
            if (data.factors.find(f => f.name === 'Cost Control')?.value < 70) {
              recommendations.push("Implement stricter cost control measures and review incident prevention strategies");
            }
            break;
          case 'inventory':
            if (data.factors.find(f => f.name === 'Waste Control')?.value < 70) {
              recommendations.push("Develop waste reduction protocols and improve inventory turnover management");
            }
            break;
        }
      }
    });

    // General recommendations based on score
    if (currentScore < 75) {
      recommendations.push("Schedule weekly performance review meetings to address improvement areas");
    }
    
    if (criticalAreas.length > 2) {
      recommendations.push("Prioritize top 2 critical areas for immediate action to maximize impact");
    }

    return {
      recommendations: recommendations.slice(0, 5), // Limit to top 5 recommendations
      criticalAreas,
      strengths,
    };
  }

  /**
   * Get health score summary for executive reporting
   */
  static async getExecutiveSummary(date: Date): Promise<{
    score: number;
    status: string;
    trend: string;
    keyInsights: string[];
    priorityActions: string[];
  }> {
    try {
      const healthScore = await this.calculateHealthScore(date);
      const { criticalAreas, strengths } = await this.generateInsights(
        healthScore.overallScore,
        {} as HealthScoreBreakdown, // Would be filled from healthScore if available
        []
      );
      
      return {
        score: healthScore.overallScore,
        status: healthScore.status,
        trend: healthScore.trend,
        keyInsights: criticalAreas.concat(strengths).slice(0, 3),
        priorityActions: healthScore.recommendations.slice(0, 3),
      };
    } catch (error) {
      logger.error("Failed to generate executive summary", { error, date });
      return {
        score: 0,
        status: 'unknown',
        trend: 'stable',
        keyInsights: ['Health score calculation unavailable'],
        priorityActions: ['Review system configuration'],
      };
    }
  }
}