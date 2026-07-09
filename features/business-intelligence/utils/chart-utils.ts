/**
 * Chart configuration and data preparation utilities for BI visualizations
 */

import { ChartConfig, KPIValue, TrendData } from "../types";

export function generateChartConfig(
  type: ChartConfig["type"],
  metrics: string[],
  timeRange: ChartConfig["timeRange"] = "30d"
): ChartConfig {
  const baseConfig: ChartConfig = {
    type,
    metrics,
    timeRange,
  };

  // Type-specific configurations
  switch (type) {
    case "line":
      return {
        ...baseConfig,
        compareWith: "previous_period",
        aggregation: "avg",
      };

    case "bar":
      return {
        ...baseConfig,
        aggregation: "sum",
      };

    case "pie":
      return {
        ...baseConfig,
        aggregation: "sum",
      };

    case "area":
      return {
        ...baseConfig,
        compareWith: "target",
        aggregation: "avg",
      };

    case "gauge":
      return {
        ...baseConfig,
        compareWith: "target",
        aggregation: "avg",
      };

    case "heatmap":
      return {
        ...baseConfig,
        aggregation: "avg",
      };

    default:
      return baseConfig;
  }
}

export function prepareChartData(
  data: Array<{ date: Date; [key: string]: any }>,
  config: ChartConfig
): Array<{ date: string; [key: string]: any }> {
  // Sort by date
  const sortedData = data.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Format dates for chart display
  const formattedData = sortedData.map(item => ({
    ...item,
    date: formatDateForChart(item.date, config.timeRange),
  }));

  // Apply aggregation if needed
  if (config.aggregation && config.aggregation !== "sum") {
    return applyAggregation(formattedData, config);
  }

  return formattedData;
}

function formatDateForChart(date: Date, timeRange: ChartConfig["timeRange"]): string {
  switch (timeRange) {
    case "1d":
      return date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    
    case "7d":
    case "30d":
      return date.toLocaleDateString('pt-PT', { month: 'short', day: 'numeric' });
    
    case "90d":
    case "1y":
      return date.toLocaleDateString('pt-PT', { month: 'short', year: 'numeric' });
    
    default:
      return date.toLocaleDateString('pt-PT');
  }
}

function applyAggregation(
  data: Array<{ [key: string]: any }>,
  config: ChartConfig
): Array<{ [key: string]: any }> {
  // For now, return data as-is
  // TODO: Implement actual aggregation logic based on config.aggregation
  return data;
}

export function prepareKPICardData(kpi: KPIValue, title: string) {
  return {
    title,
    value: kpi.value,
    unit: kpi.unit,
    trend: kpi.trend,
    status: kpi.status,
    target: kpi.targetValue,
    previous: kpi.previousValue,
    percentageChange: kpi.previousValue 
      ? ((kpi.value - kpi.previousValue) / kpi.previousValue) * 100
      : undefined,
    targetAchievement: kpi.targetValue 
      ? (kpi.value / kpi.targetValue) * 100
      : undefined,
  };
}

export function prepareTrendChartData(trendData: TrendData) {
  return {
    metric: trendData.metric,
    data: trendData.data.map(point => ({
      date: formatDateForChart(point.date, "30d"),
      value: point.value,
      target: point.target,
    })),
    trend: trendData.trend,
    confidence: trendData.confidence,
    forecast: trendData.forecastNextPeriod,
  };
}

export function generateColorPalette(itemCount: number): string[] {
  const colors = [
    '#2563eb', // Blue
    '#dc2626', // Red
    '#16a34a', // Green
    '#ca8a04', // Yellow
    '#9333ea', // Purple
    '#c2410c', // Orange
    '#0891b2', // Cyan
    '#be185d', // Pink
    '#4338ca', // Indigo
    '#059669', // Emerald
  ];

  if (itemCount <= colors.length) {
    return colors.slice(0, itemCount);
  }

  // Generate additional colors if needed
  const additionalColors = [];
  for (let i = colors.length; i < itemCount; i++) {
    const hue = (i * 137.508) % 360; // Golden angle approximation
    additionalColors.push(`hsl(${hue}, 70%, 50%)`);
  }

  return [...colors, ...additionalColors];
}

export function prepareHeatmapData(
  data: Array<{ category: string; subcategory: string; value: number }>,
  categories: string[],
  subcategories: string[]
) {
  const heatmapData = [];
  
  for (let i = 0; i < categories.length; i++) {
    for (let j = 0; j < subcategories.length; j++) {
      const category = categories[i];
      const subcategory = subcategories[j];
      
      const dataPoint = data.find(
        d => d.category === category && d.subcategory === subcategory
      );
      
      heatmapData.push({
        x: j,
        y: i,
        category,
        subcategory,
        value: dataPoint?.value || 0,
      });
    }
  }
  
  return heatmapData;
}

export function calculateChartDimensions(containerWidth: number, containerHeight: number) {
  const margin = { top: 20, right: 30, bottom: 40, left: 40 };
  
  return {
    width: containerWidth - margin.left - margin.right,
    height: containerHeight - margin.top - margin.bottom,
    margin,
  };
}

export function getChartTheme() {
  return {
    colors: {
      primary: '#2563eb',
      secondary: '#64748b',
      success: '#16a34a',
      warning: '#ca8a04',
      danger: '#dc2626',
      info: '#0891b2',
    },
    fonts: {
      body: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      mono: 'Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',
    },
    fontSize: {
      xs: 12,
      sm: 14,
      base: 16,
      lg: 18,
      xl: 20,
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
    },
  };
}