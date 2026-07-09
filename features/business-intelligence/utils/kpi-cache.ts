/**
 * KPI Memoization Cache
 * 
 * Simple in-memory cache to avoid redundant KPI calculations
 * during report generation. Cache is scoped per request.
 */

interface KPIResult {
  operational?: any;
  team?: any;
  financial?: any;
  health?: any;
}

class KPICacheManager {
  private cache = new Map<string, any>();

  private getCacheKey(service: string, startDate: Date, endDate: Date): string {
    return `${service}:${startDate.toISOString()}:${endDate.toISOString()}`;
  }

  async memoize<T>(
    service: string,
    startDate: Date,
    endDate: Date,
    calculation: () => Promise<T>
  ): Promise<T> {
    const key = this.getCacheKey(service, startDate, endDate);
    
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const result = await calculation();
    this.cache.set(key, result);
    return result;
  }

  clear(): void {
    this.cache.clear();
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Singleton cache instance per process
export const kpiCache = new KPICacheManager();

// Helper functions for common KPI patterns
export class CachedKPIService {
  static async getOperationalKPIs(startDate: Date, endDate: Date) {
    const { OperationalKPIService } = await import("../services/operational-kpis");
    return kpiCache.memoize(
      'operational',
      startDate,
      endDate,
      () => OperationalKPIService.calculateOperationalMetrics(startDate, endDate)
    );
  }

  static async getTeamKPIs(startDate: Date, endDate: Date) {
    const { TeamKPIService } = await import("../services/team-kpis");
    return kpiCache.memoize(
      'team',
      startDate,
      endDate,
      () => TeamKPIService.getTeamPerformanceSummary(startDate, endDate)
    );
  }

  static async getFinancialKPIs(startDate: Date, endDate: Date) {
    const { FinancialKPIService } = await import("../services/financial-kpis");
    return kpiCache.memoize(
      'financial',
      startDate,
      endDate,
      () => FinancialKPIService.calculateFinancialMetrics(startDate, endDate)
    );
  }

  static async getHealthScore(date: Date) {
    const { HealthScoreService } = await import("../services/health-score");
    return kpiCache.memoize(
      'health',
      date,
      date,
      () => HealthScoreService.calculateHealthScore(date)
    );
  }

  static clearCache(): void {
    kpiCache.clear();
  }

  static getCacheStats() {
    return kpiCache.getCacheStats();
  }
}