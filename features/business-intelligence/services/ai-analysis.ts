/**
 * RIBBAI Business Intelligence - AI Analysis Service
 * 
 * Automated analysis and insight generation service providing executive summaries,
 * risk identification, opportunities, and strategic recommendations.
 */

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logging";
import { AIInsight, ExecutiveAnalysis } from "../types";
import { OperationalKPIService } from "./operational-kpis";
import { TeamKPIService } from "./team-kpis";
import { FinancialKPIService } from "./financial-kpis";

export class AIAnalysisService {
  /**
   * Generate automated daily analysis after operational report
   */
  static async generateDailyAnalysis(date: Date): Promise<ExecutiveAnalysis> {
    logger.info("Generating daily AI analysis", { date: date.toISOString() });

    try {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      // Gather data from all KPI engines
      const [operationalMetrics, teamSummary, financialMetrics] = await Promise.all([
        OperationalKPIService.calculateOperationalMetrics(startDate, endDate),
        TeamKPIService.getTeamPerformanceSummary(startDate, endDate),
        FinancialKPIService.calculateFinancialMetrics(startDate, endDate),
      ]);

      // Generate analysis components
      const [
        keyEvents,
        risks,
        opportunities,
        correctiveActions,
        positiveHighlights,
        teamPerformanceAnalysis,
        maintenanceNeeds,
        pendingSituations,
        managementAlerts
      ] = await Promise.all([
        this.extractKeyEvents(date),
        this.identifyRisks(startDate, endDate),
        this.detectOpportunities(startDate, endDate),
        this.generateCorrectiveActions(operationalMetrics, teamSummary, financialMetrics),
        this.identifyPositiveHighlights(date),
        this.analyzeTeamPerformance(startDate, endDate),
        this.generateMaintenanceNeeds(date),
        this.identifyPendingSituations(date),
        this.generateManagementAlerts(operationalMetrics, teamSummary, financialMetrics)
      ]);

      // Generate executive summary
      const summary = this.generateExecutiveSummary(
        operationalMetrics,
        teamSummary,
        financialMetrics,
        keyEvents,
        risks.length,
        opportunities.length
      );

      const analysis: ExecutiveAnalysis = {
        date,
        summary,
        keyEvents,
        risksIdentified: risks,
        opportunities,
        correctiveActions,
        positiveHighlights,
        teamPerformance: teamPerformanceAnalysis.summary,
        maintenanceNeeds,
        pendingSituations,
        managementAlerts,
      };

      logger.info("Daily AI analysis generated successfully", {
        date: date.toISOString(),
        risksCount: risks.length,
        opportunitiesCount: opportunities.length,
        alertsCount: managementAlerts.length,
      });

      return analysis;
    } catch (error) {
      logger.error("Failed to generate daily AI analysis", { error, date });
      throw error;
    }
  }

  /**
   * Extract key events from operational data for a specific date
   */
  private static async extractKeyEvents(date: Date): Promise<string[]> {
    try {
      const operationalNotes = await prisma.operationalNote.findMany({
        where: {
          reportDate: {
            gte: date,
            lte: date,
          },
          OR: [
            { noteType: 'EXECUTIVE_SUMMARY' },
            { priority: 'HIGH' },
            { tags: { hasSome: ['incident', 'improvement', 'achievement'] } },
          ],
        },
        orderBy: { priority: 'desc' },
      });

      const keyEvents: string[] = [];

      operationalNotes.forEach(note => {
        if (note.noteType === 'EXECUTIVE_SUMMARY') {
          // Extract key points from executive summary
          const sentences = note.content.split(/[.!?]+/).filter(s => s.trim().length > 20);
          keyEvents.push(...sentences.slice(0, 3).map(s => s.trim()));
        } else if (note.priority === 'HIGH') {
          keyEvents.push(`Important: ${note.content.substring(0, 100)}...`);
        }
      });

      // Also check for service improvements
      const improvements = await prisma.serviceImprovement.findMany({
        where: {
          reportDate: date,
          status: {
            in: ['IMPLEMENTADO', 'CONSOLIDADO', 'CONCLUIDO'],
          },
        },
      });

      improvements.forEach(improvement => {
        keyEvents.push(`Service improvement implemented: ${improvement.type} - ${improvement.solution.substring(0, 80)}...`);
      });

      return keyEvents.slice(0, 5); // Limit to top 5 key events
    } catch (error) {
      logger.warn("Failed to extract key events", { error, date });
      return [];
    }
  }

  /**
   * Identify risks in operational data
   */
  static async identifyRisks(
    startDate: Date,
    endDate: Date
  ): Promise<AIInsight[]> {
    const risks: AIInsight[] = [];

    try {
      // Financial risks
      const financialMetrics = await FinancialKPIService.calculateFinancialMetrics(startDate, endDate);
      
      if (financialMetrics.wasteValue.value > 50) {
        risks.push({
          id: `waste-risk-${Date.now()}`,
          type: 'risk',
          category: 'financial',
          title: 'High Waste Value Detected',
          description: `Waste value of €${financialMetrics.wasteValue.value.toFixed(2)} exceeds acceptable threshold`,
          confidence: 0.8,
          impact: financialMetrics.wasteValue.value > 100 ? 'high' : 'medium',
          actionable: true,
          relatedMetrics: ['waste_value', 'operational_efficiency'],
          generatedAt: new Date(),
        });
      }

      if (financialMetrics.incidentFinancialImpact.value > 0) {
        risks.push({
          id: `incident-financial-risk-${Date.now()}`,
          type: 'risk',
          category: 'operational',
          title: 'Financial Impact from Incidents',
          description: `Incidents caused €${financialMetrics.incidentFinancialImpact.value.toFixed(2)} in financial impact`,
          confidence: 0.9,
          impact: financialMetrics.incidentFinancialImpact.value > 100 ? 'high' : 'medium',
          actionable: true,
          relatedMetrics: ['incident_impact', 'operational_quality'],
          generatedAt: new Date(),
        });
      }

      // Operational risks
      const operationalMetrics = await OperationalKPIService.calculateOperationalMetrics(startDate, endDate);
      
      if (operationalMetrics.incidentCount.value > 3) {
        risks.push({
          id: `high-incidents-risk-${Date.now()}`,
          type: 'risk',
          category: 'operational',
          title: 'High Incident Frequency',
          description: `${operationalMetrics.incidentCount.value} incidents recorded - above normal threshold`,
          confidence: 0.85,
          impact: 'high',
          actionable: true,
          relatedMetrics: ['incident_count', 'operational_stability'],
          generatedAt: new Date(),
        });
      }

      if (operationalMetrics.stockBreaks.value > 0) {
        risks.push({
          id: `stock-breaks-risk-${Date.now()}`,
          type: 'risk',
          category: 'operational',
          title: 'Stock Availability Issues',
          description: `${operationalMetrics.stockBreaks.value} stock breaks detected - may impact service quality`,
          confidence: 0.9,
          impact: 'medium',
          actionable: true,
          relatedMetrics: ['stock_breaks', 'service_continuity'],
          generatedAt: new Date(),
        });
      }

      // Team performance risks
      const teamSummary = await TeamKPIService.getTeamPerformanceSummary(startDate, endDate);
      
      if (teamSummary.totalOvertimeHours.value > 20) {
        risks.push({
          id: `high-overtime-risk-${Date.now()}`,
          type: 'risk',
          category: 'team',
          title: 'Excessive Overtime Hours',
          description: `${teamSummary.totalOvertimeHours.value.toFixed(1)} overtime hours may indicate staffing issues`,
          confidence: 0.75,
          impact: 'medium',
          actionable: true,
          relatedMetrics: ['overtime_hours', 'team_burnout'],
          generatedAt: new Date(),
        });
      }

      if (teamSummary.avgPerformanceScore.value < 6) {
        risks.push({
          id: `low-performance-risk-${Date.now()}`,
          type: 'risk',
          category: 'team',
          title: 'Below Average Team Performance',
          description: `Average performance score of ${teamSummary.avgPerformanceScore.value.toFixed(1)}/10 requires attention`,
          confidence: 0.8,
          impact: 'high',
          actionable: true,
          relatedMetrics: ['team_performance', 'quality_indicators'],
          generatedAt: new Date(),
        });
      }

      return risks;
    } catch (error) {
      logger.error("Failed to identify risks", { error, startDate, endDate });
      return risks;
    }
  }

  /**
   * Detect improvement opportunities
   */
  static async detectOpportunities(
    startDate: Date,
    endDate: Date
  ): Promise<AIInsight[]> {
    const opportunities: AIInsight[] = [];

    try {
      // Check for automation opportunities
      const repetitiveIssues = await prisma.operationalNote.groupBy({
        by: ['content'],
        where: {
          reportDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        _count: {
          content: true,
        },
        having: {
          content: {
            _count: {
              gt: 1,
            },
          },
        },
      });

      if (repetitiveIssues.length > 0) {
        opportunities.push({
          id: `automation-opportunity-${Date.now()}`,
          type: 'opportunity',
          category: 'operational',
          title: 'Process Automation Potential',
          description: `${repetitiveIssues.length} repetitive issues identified that could benefit from automation`,
          confidence: 0.7,
          impact: 'medium',
          actionable: true,
          relatedMetrics: ['process_efficiency', 'automation_potential'],
          generatedAt: new Date(),
        });
      }

      // Check for training opportunities
      const teamSummary = await TeamKPIService.getTeamPerformanceSummary(startDate, endDate);
      
      if (teamSummary.improvementAreas.length > 0) {
        opportunities.push({
          id: `training-opportunity-${Date.now()}`,
          type: 'opportunity',
          category: 'team',
          title: 'Targeted Training Opportunities',
          description: `Training needed in: ${teamSummary.improvementAreas.map(area => area.area).join(', ')}`,
          confidence: 0.8,
          impact: 'medium',
          actionable: true,
          relatedMetrics: ['skill_development', 'team_growth'],
          generatedAt: new Date(),
        });
      }

      // Check for cost optimization opportunities
      const financialMetrics = await FinancialKPIService.calculateFinancialMetrics(startDate, endDate);
      
      if (Object.keys(financialMetrics.consumptionByCategory).length > 0) {
        // Find categories with high consumption that might be optimized
        const highConsumptionCategories = Object.entries(financialMetrics.consumptionByCategory)
          .filter(([, kpi]) => kpi.value > 100)
          .map(([category]) => category);

        if (highConsumptionCategories.length > 0) {
          opportunities.push({
            id: `cost-optimization-${Date.now()}`,
            type: 'opportunity',
            category: 'financial',
            title: 'Cost Optimization Potential',
            description: `High consumption in ${highConsumptionCategories.join(', ')} - review for optimization`,
            confidence: 0.6,
            impact: 'medium',
            actionable: true,
            relatedMetrics: ['consumption_patterns', 'cost_efficiency'],
            generatedAt: new Date(),
          });
        }
      }

      // Check for service improvements that could be implemented
      const pendingImprovements = await prisma.serviceImprovement.count({
        where: {
          reportDate: {
            gte: startDate,
            lte: endDate,
          },
          status: 'EM_TESTE',
        },
      });

      if (pendingImprovements > 0) {
        opportunities.push({
          id: `implementation-opportunity-${Date.now()}`,
          type: 'opportunity',
          category: 'operational',
          title: 'Service Improvement Implementation',
          description: `${pendingImprovements} service improvements ready for implementation`,
          confidence: 0.9,
          impact: 'high',
          actionable: true,
          relatedMetrics: ['service_quality', 'continuous_improvement'],
          generatedAt: new Date(),
        });
      }

      return opportunities;
    } catch (error) {
      logger.error("Failed to detect opportunities", { error, startDate, endDate });
      return opportunities;
    }
  }

  /**
   * Generate corrective actions based on KPI analysis
   */
  private static async generateCorrectiveActions(
    operationalMetrics: any,
    teamSummary: any,
    financialMetrics: any
  ): Promise<string[]> {
    const actions: string[] = [];

    // Operational corrective actions
    if (operationalMetrics.incidentCount.value > 2) {
      actions.push("Conduct incident review meeting to identify root causes and prevention strategies");
    }

    if (operationalMetrics.stockBreaks.value > 0) {
      actions.push("Review inventory reorder points and implement proactive stock monitoring");
    }

    // Team corrective actions
    if (teamSummary.totalOvertimeHours.value > 15) {
      actions.push("Analyze staffing patterns and consider additional team members for peak periods");
    }

    if (teamSummary.improvementAreas.length > 0) {
      teamSummary.improvementAreas.forEach((area: any) => {
        actions.push(`Implement targeted training for ${area.area} - focus on: ${area.employees.slice(0, 2).join(', ')}`);
      });
    }

    // Financial corrective actions
    if (financialMetrics.wasteValue.value > 30) {
      actions.push("Investigate waste sources and implement waste reduction protocols");
    }

    if (financialMetrics.incidentFinancialImpact.value > 0) {
      actions.push("Review incident prevention procedures to minimize financial impact");
    }

    return actions.slice(0, 5); // Limit to top 5 actions
  }

  /**
   * Identify positive highlights from the day
   */
  private static async identifyPositiveHighlights(date: Date): Promise<string[]> {
    const highlights: string[] = [];

    try {
      // Look for positive team feedback
      const positiveFeedback = await prisma.teamFeedback.findMany({
        where: {
          reportDate: date,
          sentiment: 'POSITIVE',
        },
        include: {
          employee: true,
        },
      });

      positiveFeedback.forEach(feedback => {
        highlights.push(`${feedback.employee.firstName} received positive feedback: ${feedback.content.substring(0, 80)}...`);
      });

      // Look for implemented improvements
      const completedImprovements = await prisma.serviceImprovement.findMany({
        where: {
          reportDate: date,
          status: {
            in: ['IMPLEMENTADO', 'CONSOLIDADO', 'CONCLUIDO'],
          },
        },
      });

      completedImprovements.forEach(improvement => {
        highlights.push(`Service improvement completed: ${improvement.type} - ${improvement.solution.substring(0, 60)}...`);
      });

      // Look for operational achievements
      const achievementNotes = await prisma.operationalNote.findMany({
        where: {
          reportDate: date,
          OR: [
            { content: { contains: 'sucesso', mode: 'insensitive' } },
            { content: { contains: 'excelente', mode: 'insensitive' } },
            { content: { contains: 'achievement', mode: 'insensitive' } },
            { content: { contains: 'parabéns', mode: 'insensitive' } },
            { tags: { has: 'achievement' } },
          ],
        },
      });

      achievementNotes.forEach(note => {
        highlights.push(note.content.substring(0, 100) + '...');
      });

      return highlights.slice(0, 4); // Limit to top 4 highlights
    } catch (error) {
      logger.warn("Failed to identify positive highlights", { error, date });
      return highlights;
    }
  }

  /**
   * Analyze team performance patterns
   */
  static async analyzeTeamPerformance(
    startDate: Date,
    endDate: Date
  ): Promise<{
    summary: string;
    trends: string[];
    concerns: string[];
    highlights: string[];
  }> {
    try {
      const teamSummary = await TeamKPIService.getTeamPerformanceSummary(startDate, endDate);
      
      let summary = `Team of ${teamSummary.teamSize.value} showing `;
      
      if (teamSummary.avgPerformanceScore.value >= 8) {
        summary += "excellent performance with strong collaboration";
      } else if (teamSummary.avgPerformanceScore.value >= 6) {
        summary += "good performance with room for improvement";
      } else {
        summary += "concerning performance requiring immediate attention";
      }

      const trends: string[] = [];
      const concerns: string[] = [];
      const highlights: string[] = [];

      // Analyze overtime trends
      if (teamSummary.totalOvertimeHours.value > 20) {
        trends.push("Increasing overtime hours indicate potential staffing shortage");
        concerns.push("High overtime may lead to team burnout");
      } else {
        highlights.push("Overtime hours within acceptable limits");
      }

      // Performance analysis
      if (teamSummary.topPerformers.length > 0) {
        highlights.push(`Top performers: ${teamSummary.topPerformers.slice(0, 2).map(p => p.name).join(', ')}`);
      }

      if (teamSummary.improvementAreas.length > 0) {
        concerns.push(`Areas needing attention: ${teamSummary.improvementAreas.map(area => area.area).join(', ')}`);
      }

      // Participation analysis
      const avgParticipation = Object.values(teamSummary.participationRates).reduce((sum, kpi) => sum + kpi.value, 0) / Object.keys(teamSummary.participationRates).length;
      
      if (avgParticipation > 0.8) {
        highlights.push("High team engagement in activities and improvements");
      } else if (avgParticipation < 0.4) {
        concerns.push("Low team participation in development activities");
      }

      return { summary, trends, concerns, highlights };
    } catch (error) {
      logger.error("Failed to analyze team performance", { error, startDate, endDate });
      return {
        summary: "Team performance analysis unavailable",
        trends: [],
        concerns: ["Unable to analyze team performance data"],
        highlights: [],
      };
    }
  }

  /**
   * Generate maintenance recommendations
   */
  static async generateMaintenanceNeeds(date: Date): Promise<string[]> {
    const maintenanceNeeds: string[] = [];

    try {
      // Look for maintenance-related notes
      const maintenanceNotes = await prisma.operationalNote.findMany({
        where: {
          reportDate: date,
          OR: [
            { content: { contains: 'manutenção', mode: 'insensitive' } },
            { content: { contains: 'maintenance', mode: 'insensitive' } },
            { content: { contains: 'reparação', mode: 'insensitive' } },
            { content: { contains: 'avaria', mode: 'insensitive' } },
            { content: { contains: 'equipment', mode: 'insensitive' } },
          ],
        },
      });

      maintenanceNotes.forEach(note => {
        if (note.content.toLowerCase().includes('urgente') || note.content.toLowerCase().includes('urgent')) {
          maintenanceNeeds.push(`URGENT: ${note.content.substring(0, 80)}...`);
        } else {
          maintenanceNeeds.push(note.content.substring(0, 80) + '...');
        }
      });

      // Check for equipment mentioned in incidents
      const equipmentIncidents = await prisma.operationalNote.findMany({
        where: {
          reportDate: date,
          tags: { has: 'incident' },
          OR: [
            { content: { contains: 'equipamento', mode: 'insensitive' } },
            { content: { contains: 'máquina', mode: 'insensitive' } },
            { content: { contains: 'equipment', mode: 'insensitive' } },
          ],
        },
      });

      equipmentIncidents.forEach(incident => {
        maintenanceNeeds.push(`Equipment issue reported: ${incident.content.substring(0, 80)}...`);
      });

      return maintenanceNeeds.slice(0, 5);
    } catch (error) {
      logger.warn("Failed to generate maintenance needs", { error, date });
      return [];
    }
  }

  /**
   * Identify pending situations requiring follow-up
   */
  private static async identifyPendingSituations(date: Date): Promise<string[]> {
    const pendingSituations: string[] = [];

    try {
      // Pending service improvements
      const pendingImprovements = await prisma.serviceImprovement.findMany({
        where: {
          reportDate: date,
          status: 'EM_TESTE',
        },
      });

      pendingImprovements.forEach(improvement => {
        pendingSituations.push(`Testing: ${improvement.type} - ${improvement.solution.substring(0, 60)}...`);
      });

      // Unresolved incidents
      const unresolvedNotes = await prisma.operationalNote.findMany({
        where: {
          reportDate: date,
          OR: [
            { content: { contains: 'pending', mode: 'insensitive' } },
            { content: { contains: 'pendente', mode: 'insensitive' } },
            { content: { contains: 'follow-up', mode: 'insensitive' } },
            { content: { contains: 'acompanhar', mode: 'insensitive' } },
          ],
        },
      });

      unresolvedNotes.forEach(note => {
        pendingSituations.push(`Follow-up required: ${note.content.substring(0, 80)}...`);
      });

      return pendingSituations.slice(0, 5);
    } catch (error) {
      logger.warn("Failed to identify pending situations", { error, date });
      return [];
    }
  }

  /**
   * Generate management alerts based on critical thresholds
   */
  private static async generateManagementAlerts(
    operationalMetrics: any,
    teamSummary: any,
    financialMetrics: any
  ): Promise<string[]> {
    const alerts: string[] = [];

    // Critical operational alerts
    if (operationalMetrics.incidentCount.value > 5) {
      alerts.push("🚨 CRITICAL: High incident frequency requires immediate management attention");
    }

    if (operationalMetrics.stockBreaks.value > 2) {
      alerts.push("⚠️ URGENT: Multiple stock breaks impacting service delivery");
    }

    // Critical team alerts  
    if (teamSummary.avgPerformanceScore.value < 5) {
      alerts.push("🚨 CRITICAL: Team performance below acceptable standards");
    }

    if (teamSummary.totalOvertimeHours.value > 30) {
      alerts.push("⚠️ URGENT: Excessive overtime indicates potential staffing crisis");
    }

    // Critical financial alerts
    if (financialMetrics.wasteValue.value > 100) {
      alerts.push("🚨 CRITICAL: High waste value requires cost control measures");
    }

    if (financialMetrics.incidentFinancialImpact.value > 150) {
      alerts.push("🚨 CRITICAL: High financial impact from incidents");
    }

    // Trend-based alerts
    if (financialMetrics.currentInventoryValue.trend === 'decreasing') {
      alerts.push("📉 TREND ALERT: Declining inventory value requires investigation");
    }

    return alerts.slice(0, 6); // Limit to top 6 critical alerts
  }

  /**
   * Generate executive summary text
   */
  private static generateExecutiveSummary(
    operationalMetrics: any,
    teamSummary: any,
    financialMetrics: any,
    keyEvents: string[],
    risksCount: number,
    opportunitiesCount: number
  ): string {
    let summary = "Daily Operations Summary: ";

    // Operational status
    if (operationalMetrics.incidentCount.value === 0) {
      summary += "Smooth operations with no incidents reported. ";
    } else if (operationalMetrics.incidentCount.value <= 2) {
      summary += `${operationalMetrics.incidentCount.value} minor incident(s) handled effectively. `;
    } else {
      summary += `${operationalMetrics.incidentCount.value} incidents requiring attention. `;
    }

    // Team performance
    if (teamSummary.avgPerformanceScore.value >= 8) {
      summary += "Team performing excellently with high engagement. ";
    } else if (teamSummary.avgPerformanceScore.value >= 6) {
      summary += "Team performance satisfactory with development opportunities. ";
    } else {
      summary += "Team performance concerns require management intervention. ";
    }

    // Financial status
    const inventoryValue = financialMetrics.currentInventoryValue.value;
    summary += `Inventory value at €${inventoryValue.toFixed(2)}`;
    
    if (financialMetrics.wasteValue.value > 0) {
      summary += ` with €${financialMetrics.wasteValue.value.toFixed(2)} in waste recorded. `;
    } else {
      summary += " with no waste recorded. ";
    }

    // Risk and opportunity overview
    if (risksCount > 0) {
      summary += `${risksCount} risk(s) identified requiring attention. `;
    }

    if (opportunitiesCount > 0) {
      summary += `${opportunitiesCount} improvement opportunity(ies) detected.`;
    }

    return summary;
  }

  /**
   * Generate strategic recommendations based on all analysis
   */
  static async generateRecommendations(
    category: "operational" | "team" | "financial" | "all",
    timeframe: Date
  ): Promise<string[]> {
    try {
      const endDate = new Date(timeframe);
      const startDate = new Date(timeframe);
      startDate.setDate(startDate.getDate() - 7); // Look at past week

      const analysis = await this.generateDailyAnalysis(timeframe);
      const recommendations: string[] = [];

      if (category === "operational" || category === "all") {
        if (analysis.risksIdentified.some(r => r.category === 'operational')) {
          recommendations.push("Implement proactive risk monitoring to prevent operational disruptions");
        }
        if (analysis.maintenanceNeeds.length > 0) {
          recommendations.push("Establish preventive maintenance schedule to reduce equipment downtime");
        }
      }

      if (category === "team" || category === "all") {
        if (analysis.risksIdentified.some(r => r.category === 'team')) {
          recommendations.push("Develop targeted training programs to address performance gaps");
        }
        recommendations.push("Implement regular team feedback sessions to maintain high engagement");
      }

      if (category === "financial" || category === "all") {
        if (analysis.risksIdentified.some(r => r.category === 'financial')) {
          recommendations.push("Review cost control measures and waste reduction strategies");
        }
        recommendations.push("Establish monthly financial review meetings to track KPI trends");
      }

      if (category === "all") {
        recommendations.push("Implement integrated dashboard for real-time operational visibility");
        recommendations.push("Establish cross-functional improvement committees for systematic enhancements");
      }

      return recommendations.slice(0, 5);
    } catch (error) {
      logger.error("Failed to generate recommendations", { error, category, timeframe });
      return ["Review operational procedures and team performance regularly"];
    }
  }
}