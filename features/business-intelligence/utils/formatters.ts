/**
 * Formatting utilities for BI displays
 */

export function formatCurrency(value: number, currency: string = "EUR"): string {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: currency,
  }).format(value);
}

export function formatPercentage(value: number, decimals: number = 1): string {
  return new Intl.NumberFormat('pt-PT', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return `${mins}m`;
  }
  
  if (mins === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h${mins}m`;
}

export function formatNumber(value: number, decimals: number = 0): string {
  return new Intl.NumberFormat('pt-PT', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatKPIValue(value: number, unit?: string): string {
  let formatted = formatNumber(value, unit === "EUR" ? 2 : 1);
  
  if (unit) {
    switch (unit) {
      case "EUR":
        return formatCurrency(value);
      case "%":
        return formatPercentage(value);
      case "minutes":
        return formatDuration(value);
      case "hours":
        return formatDuration(value * 60);
      default:
        return `${formatted} ${unit}`;
    }
  }
  
  return formatted;
}

export function formatTrend(trend: "increasing" | "decreasing" | "stable" | "volatile"): {
  text: string;
  icon: string;
  color: string;
} {
  switch (trend) {
    case "increasing":
      return { text: "Crescente", icon: "↗️", color: "green" };
    case "decreasing":
      return { text: "Decrescente", icon: "↘️", color: "red" };
    case "stable":
      return { text: "Estável", icon: "→", color: "blue" };
    case "volatile":
      return { text: "Volátil", icon: "↕️", color: "orange" };
    default:
      return { text: "Desconhecido", icon: "?", color: "gray" };
  }
}

export function formatStatus(status: "good" | "warning" | "critical"): {
  text: string;
  icon: string;
  color: string;
} {
  switch (status) {
    case "good":
      return { text: "Bom", icon: "✅", color: "green" };
    case "warning":
      return { text: "Atenção", icon: "⚠️", color: "orange" };
    case "critical":
      return { text: "Crítico", icon: "🚨", color: "red" };
    default:
      return { text: "Desconhecido", icon: "?", color: "gray" };
  }
}