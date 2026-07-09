/**
 * Validation utilities for BI data
 */

import { KPIValue, Alert, TrendData } from "../types";

export function validateKPIData(kpi: KPIValue): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (typeof kpi.value !== 'number') {
    errors.push("KPI value must be a number");
  }

  if (isNaN(kpi.value)) {
    errors.push("KPI value cannot be NaN");
  }

  if (!isFinite(kpi.value)) {
    errors.push("KPI value must be finite");
  }

  // Optional fields validation
  if (kpi.targetValue !== undefined) {
    if (typeof kpi.targetValue !== 'number' || isNaN(kpi.targetValue)) {
      warnings.push("Target value should be a valid number");
    }
  }

  if (kpi.previousValue !== undefined) {
    if (typeof kpi.previousValue !== 'number' || isNaN(kpi.previousValue)) {
      warnings.push("Previous value should be a valid number");
    }
  }

  // Trend validation
  if (kpi.trend && !["increasing", "decreasing", "stable"].includes(kpi.trend)) {
    errors.push("Trend must be 'increasing', 'decreasing', or 'stable'");
  }

  // Status validation
  if (kpi.status && !["good", "warning", "critical"].includes(kpi.status)) {
    errors.push("Status must be 'good', 'warning', or 'critical'");
  }

  // Business logic validation
  if (kpi.value < 0 && kpi.unit !== "EUR") {
    warnings.push("Negative values may indicate data quality issues");
  }

  if (kpi.targetValue && kpi.value && Math.abs(kpi.value - kpi.targetValue) > kpi.targetValue * 2) {
    warnings.push("Value significantly deviates from target (>200%)");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateAlert(alert: Alert): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!alert.id || alert.id.trim() === "") {
    errors.push("Alert ID is required");
  }

  if (!alert.type || !["operational", "team", "financial", "maintenance", "quality"].includes(alert.type)) {
    errors.push("Alert type must be one of: operational, team, financial, maintenance, quality");
  }

  if (!alert.severity || !["low", "medium", "high", "critical"].includes(alert.severity)) {
    errors.push("Alert severity must be one of: low, medium, high, critical");
  }

  if (!alert.title || alert.title.trim() === "") {
    errors.push("Alert title is required");
  }

  if (!alert.description || alert.description.trim() === "") {
    errors.push("Alert description is required");
  }

  if (!alert.triggeredAt || !(alert.triggeredAt instanceof Date)) {
    errors.push("Alert triggered date is required and must be a valid Date");
  }

  // Business logic validation
  if (alert.triggeredAt && alert.triggeredAt > new Date()) {
    warnings.push("Alert triggered date is in the future");
  }

  if (alert.acknowledgedAt && alert.acknowledgedAt < alert.triggeredAt) {
    errors.push("Acknowledged date cannot be before triggered date");
  }

  if (alert.resolvedAt && alert.acknowledgedAt && alert.resolvedAt < alert.acknowledgedAt) {
    errors.push("Resolved date cannot be before acknowledged date");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateTrend(trend: TrendData): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!trend.metric || trend.metric.trim() === "") {
    errors.push("Trend metric name is required");
  }

  if (!Array.isArray(trend.data) || trend.data.length === 0) {
    errors.push("Trend data array is required and must not be empty");
  }

  if (!trend.trend || !["upward", "downward", "stable", "volatile"].includes(trend.trend)) {
    errors.push("Trend direction must be one of: upward, downward, stable, volatile");
  }

  if (typeof trend.confidence !== 'number' || trend.confidence < 0 || trend.confidence > 1) {
    errors.push("Trend confidence must be a number between 0 and 1");
  }

  // Data points validation
  if (trend.data) {
    trend.data.forEach((point, index) => {
      if (!point.date || !(point.date instanceof Date)) {
        errors.push(`Data point ${index} must have a valid date`);
      }

      if (typeof point.value !== 'number' || isNaN(point.value) || !isFinite(point.value)) {
        errors.push(`Data point ${index} must have a valid numeric value`);
      }

      if (point.target !== undefined && (typeof point.target !== 'number' || isNaN(point.target))) {
        warnings.push(`Data point ${index} has invalid target value`);
      }
    });
  }

  // Business logic validation
  if (trend.data.length < 2) {
    warnings.push("At least 2 data points recommended for meaningful trend analysis");
  }

  if (trend.confidence < 0.5) {
    warnings.push("Low confidence trend may not be reliable for decision making");
  }

  // Check for chronological order
  if (trend.data.length > 1) {
    for (let i = 1; i < trend.data.length; i++) {
      if (trend.data[i].date < trend.data[i - 1].date) {
        warnings.push("Data points should be in chronological order");
        break;
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateDateRange(startDate: Date, endDate: Date): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!(startDate instanceof Date) || isNaN(startDate.getTime())) {
    errors.push("Start date must be a valid Date object");
  }

  if (!(endDate instanceof Date) || isNaN(endDate.getTime())) {
    errors.push("End date must be a valid Date object");
  }

  if (startDate && endDate && startDate > endDate) {
    errors.push("Start date cannot be after end date");
  }

  if (startDate && endDate) {
    const diffDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (diffDays > 365) {
      warnings.push("Date range spans more than one year - consider performance implications");
    }
    
    if (diffDays === 0) {
      warnings.push("Date range is a single day");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}