/**
 * RIBBAI Business Intelligence - Services Index
 * 
 * Centralized exports for all BI services including KPI calculation engines,
 * data integration, analytics, and intelligence systems.
 */

// KPI Calculation Services
export { OperationalKPIService } from "./operational-kpis";
export { TeamKPIService } from "./team-kpis";
export { FinancialKPIService } from "./financial-kpis";

// Data Integration Services
export { DataIntegrationService } from "./data-integration";
export { SyncService } from "./sync-service";

// Intelligence Services
export { AIAnalysisService } from "./ai-analysis";
export { TrendAnalysisService } from "./trend-analysis";
export { AlertService } from "./alert-system";

// Core Analytics
export { HealthScoreService } from "./health-score";
export { ReportingService } from "./reporting-service";

// Re-export types
export * from "../types";