/**
 * Data transformation utilities for BI operations
 */

import { KPIValue, TrendData } from "../types";

export function normalizeKPIValue(
  value: number,
  target?: number,
  previousValue?: number
): KPIValue {
  const trend = previousValue 
    ? value > previousValue ? "increasing" 
    : value < previousValue ? "decreasing" 
    : "stable"
    : "stable";

  const status = target 
    ? value >= target ? "good"
    : value >= target * 0.8 ? "warning"
    : "critical"
    : "good";

  return {
    value,
    targetValue: target,
    previousValue,
    trend,
    status,
  };
}

export function aggregateMetrics(
  data: Array<{ date: Date; value: number }>,
  aggregationType: "sum" | "avg" | "min" | "max" | "count"
): number {
  if (data.length === 0) return 0;

  const values = data.map(d => d.value);

  switch (aggregationType) {
    case "sum":
      return values.reduce((sum, val) => sum + val, 0);
    case "avg":
      return values.reduce((sum, val) => sum + val, 0) / values.length;
    case "min":
      return Math.min(...values);
    case "max":
      return Math.max(...values);
    case "count":
      return values.length;
    default:
      return 0;
  }
}

export function calculateTrend(data: Array<{ date: Date; value: number }>): {
  trend: "upward" | "downward" | "stable" | "volatile";
  slope: number;
  confidence: number;
} {
  if (data.length < 2) {
    return { trend: "stable", slope: 0, confidence: 0 };
  }

  // Simple linear regression for trend calculation
  const n = data.length;
  const x = data.map((_, i) => i);
  const y = data.map(d => d.value);

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.map((xi, i) => xi * y[i]).reduce((a, b) => a + b, 0);
  const sumXX = x.map(xi => xi * xi).reduce((a, b) => a + b, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  
  // Calculate R-squared for confidence
  const yMean = sumY / n;
  const ssRes = y.map((yi, i) => Math.pow(yi - (slope * x[i]), 2)).reduce((a, b) => a + b, 0);
  const ssTot = y.map(yi => Math.pow(yi - yMean, 2)).reduce((a, b) => a + b, 0);
  const rSquared = 1 - (ssRes / ssTot);

  let trend: "upward" | "downward" | "stable" | "volatile";
  if (Math.abs(slope) < 0.1) {
    trend = "stable";
  } else if (rSquared < 0.5) {
    trend = "volatile";
  } else {
    trend = slope > 0 ? "upward" : "downward";
  }

  return {
    trend,
    slope,
    confidence: Math.max(0, Math.min(1, rSquared)),
  };
}