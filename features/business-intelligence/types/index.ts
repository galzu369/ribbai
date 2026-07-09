/**
 * RIBBAI Business Intelligence - Type Definitions
 * 
 * Core interfaces and types for the BI system including KPIs,
 * analytics data structures, and dashboard components.
 */

import { Prisma } from "@prisma/client";

// ============================================================================
// CORE BI TYPES
// ============================================================================

export interface KPIValue {
  value: number;
  targetValue?: number;
  previousValue?: number;
  trend?: "increasing" | "decreasing" | "stable";
  status?: "good" | "warning" | "critical";
  unit?: string;
  metadata?: Record<string, any>;
}

export interface KPICategory {
  category: "operational" | "team" | "financial" | "quality";
  name: string;
  description?: string;
  kpis: Record<string, KPIValue>;
  lastUpdated: Date;
}

export interface ExecutiveSummary {
  date: Date;
  overallScore: number;
  keyMetrics: KPIValue[];
  alerts: Alert[];
  insights: string[];
  recommendations: string[];
}

// ============================================================================
// OPERATIONAL INTELLIGENCE TYPES
// ============================================================================

export interface OperationalMetrics {
  operationalDays: KPIValue;
  customerCount: KPIValue;
  incidentCount: KPIValue;
  stockBreaks: KPIValue;
  maintenanceTasks: KPIValue;
  improvements: KPIValue;
  briefingsCompleted: KPIValue;
  processChanges: KPIValue;
  averageOpeningTime: KPIValue;
  averageClosingTime: KPIValue;
  incidentFreeDays: KPIValue;
  highPressureDays: KPIValue;
  quietOperationDays: KPIValue;
  eventDays: KPIValue;
  jamSessionDays: KPIValue;
}

export interface TeamPerformanceMetrics {
  employeeId: string;
  employeeName: string;
  hoursWorked: KPIValue;
  overtimeHours: KPIValue;
  daysWorked: KPIValue;
  openingShifts: KPIValue;
  closingShifts: KPIValue;
  reducedBreaks: KPIValue;
  inventoryParticipation: KPIValue;
  trainingParticipation: KPIValue;
  briefingParticipation: KPIValue;
  improvementParticipation: KPIValue;
  extraCleaningParticipation: KPIValue;
  associatedIncidents: KPIValue;
  commendations: KPIValue;
  reliabilityIndex: KPIValue;
  leadershipIndex: KPIValue;
  communicationIndex: KPIValue;
  organizationIndex: KPIValue;
  teamworkIndex: KPIValue;
}

export interface FinancialMetrics {
  currentInventoryValue: KPIValue;
  entryValue: KPIValue;
  consumptionValue: KPIValue;
  averageCMP: KPIValue;
  consumptionByCategory: Record<string, KPIValue>;
  weeklyConsumption: KPIValue;
  monthlyConsumption: KPIValue;
  dailyAverageCost: KPIValue;
  wasteValue: KPIValue;
  operationalErrorValue: KPIValue;
  returnedProductsValue: KPIValue;
  offersValue: KPIValue;
  cashDiscrepancies: KPIValue;
  incidentFinancialImpact: KPIValue;
}

// ============================================================================
// ALERT SYSTEM TYPES
// ============================================================================

export interface Alert {
  id: string;
  type: "operational" | "team" | "financial" | "maintenance" | "quality";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  triggeredAt: Date;
  relatedEntity?: string;
  actionRequired?: string;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  metadata?: Record<string, any>;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  category: string;
  condition: AlertCondition;
  threshold: number;
  severity: Alert["severity"];
  isActive: boolean;
  createdAt: Date;
  lastTriggered?: Date;
}

export interface AlertCondition {
  metric: string;
  operator: ">" | "<" | ">=" | "<=" | "==" | "!=" | "increase" | "decrease";
  value: number;
  timeWindow?: number; // minutes
  consecutiveOccurrences?: number;
}

// ============================================================================
// TREND ANALYSIS TYPES
// ============================================================================

export interface TrendData {
  metric: string;
  data: Array<{
    date: Date;
    value: number;
    target?: number;
  }>;
  trend: "upward" | "downward" | "stable" | "volatile";
  confidence: number; // 0-1
  forecastNextPeriod?: number;
  seasonalityDetected?: boolean;
}

export interface Pattern {
  type: "consumption" | "performance" | "operational" | "seasonal";
  entity: string;
  pattern: string;
  confidence: number;
  firstDetected: Date;
  occurrences: number;
  impact: "positive" | "negative" | "neutral";
  recommendation?: string;
}

// ============================================================================
// HEALTH SCORE TYPES
// ============================================================================

export interface HealthScore {
  overall: number; // 0-100
  categories: {
    operational: number;
    team: number;
    financial: number;
    quality: number;
    maintenance: number;
    communication: number;
  };
  factors: Array<{
    name: string;
    weight: number;
    score: number;
    impact: "positive" | "negative";
  }>;
  recommendations: string[];
  lastCalculated: Date;
}

// ============================================================================
// AI ANALYSIS TYPES
// ============================================================================

export interface AIInsight {
  id: string;
  type: "opportunity" | "risk" | "trend" | "anomaly" | "recommendation";
  category: string;
  title: string;
  description: string;
  confidence: number; // 0-1
  impact: "low" | "medium" | "high";
  actionable: boolean;
  relatedMetrics: string[];
  generatedAt: Date;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

export interface ExecutiveAnalysis {
  date: Date;
  summary: string;
  keyEvents: string[];
  risksIdentified: AIInsight[];
  opportunities: AIInsight[];
  correctiveActions: string[];
  positiveHighlights: string[];
  teamPerformance: string;
  maintenanceNeeds: string[];
  pendingSituations: string[];
  managementAlerts: string[];
}

// ============================================================================
// DASHBOARD TYPES
// ============================================================================

export interface DashboardConfig {
  userId: string;
  role: "executive" | "manager" | "supervisor";
  layout: DashboardLayout[];
  refreshInterval: number; // seconds
  timezone: string;
  preferences: Record<string, any>;
}

export interface DashboardLayout {
  id: string;
  type: "kpi-card" | "chart" | "table" | "alert-panel" | "summary";
  position: { x: number; y: number; width: number; height: number };
  config: Record<string, any>;
  dataSource: string;
}

export interface ChartConfig {
  type: "line" | "bar" | "pie" | "area" | "heatmap" | "gauge";
  metrics: string[];
  timeRange: "1d" | "7d" | "30d" | "90d" | "1y";
  compareWith?: "previous_period" | "target" | "benchmark";
  aggregation?: "sum" | "avg" | "min" | "max" | "count";
}

// ============================================================================
// DATA INTEGRATION TYPES
// ============================================================================

export interface OperationalRecord {
  date: Date;
  author: string;
  validator?: string;
  context?: string;
  executiveSummary: string;
  operationalNotes: string[];
  serviceImprovements: ServiceImprovementData[];
  incidents: IncidentData[];
  teamFeedback: TeamFeedbackData[];
  overtimeData: OvertimeData[];
  managementNotes: string[];
  inventoryContext?: string;
  weeklyReportCandidates: string[];
  dailyRatings: Record<string, number>;
}

export interface ServiceImprovementData {
  type: string;
  problem: string;
  solution: string;
  status: string;
  expectedImpact?: string;
  observationPeriod?: string;
}

export interface IncidentData {
  category: string;
  severity: string;
  financialImpact?: number;
  status: string;
  correctiveAction?: string;
  description: string;
}

export interface TeamFeedbackData {
  employeeName: string;
  feedback: string;
  type: "highlight" | "improvement_area" | "conduct";
  sentiment: "positive" | "neutral" | "negative";
}

export interface OvertimeData {
  employeeName: string;
  minutes: number;
  reason?: string;
  approved: boolean;
}

// ============================================================================
// EXPORT AGGREGATION
// ============================================================================

export type {
  KPIValue,
  KPICategory,
  ExecutiveSummary,
  OperationalMetrics,
  TeamPerformanceMetrics,
  FinancialMetrics,
  Alert,
  AlertRule,
  AlertCondition,
  TrendData,
  Pattern,
  HealthScore,
  AIInsight,
  ExecutiveAnalysis,
  DashboardConfig,
  DashboardLayout,
  ChartConfig,
  OperationalRecord,
  ServiceImprovementData,
  IncidentData,
  TeamFeedbackData,
  OvertimeData,
};