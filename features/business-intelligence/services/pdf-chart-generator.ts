import { ChartConfiguration } from 'chart.js';
import { logger } from '../utils/logger';

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
    fill?: boolean;
    tension?: number;
    pointRadius?: number;
    pointHoverRadius?: number;
  }>;
}

export interface ChartOptions {
  type: 'line' | 'bar' | 'doughnut' | 'pie' | 'area' | 'radar' | 'scatter' | 'gauge';
  title?: string;
  subtitle?: string;
  width?: number;
  height?: number;
  colors?: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    danger: string;
    info: string;
  };
  responsive?: boolean;
  maintainAspectRatio?: boolean;
  plugins?: {
    legend?: boolean;
    tooltip?: boolean;
    datalabels?: boolean;
  };
  axes?: {
    x?: {
      display?: boolean;
      title?: string;
      grid?: boolean;
    };
    y?: {
      display?: boolean;
      title?: string;
      grid?: boolean;
      min?: number;
      max?: number;
    };
  };
}

export class PDFChartGenerator {
  /**
   * Executive color palette for professional charts
   */
  private static readonly EXECUTIVE_COLORS = {
    primary: '#1e40af',      // Executive Blue
    secondary: '#64748b',    // Professional Gray
    success: '#059669',      // Performance Green
    warning: '#d97706',      // Alert Orange
    danger: '#dc2626',       // Critical Red
    info: '#0891b2',        // Information Cyan
    accent: '#7c3aed',      // Strategic Purple
    gold: '#ca8a04',        // Achievement Gold
    navy: '#0a1628',        // Executive Navy
    light: '#f8fafc',       // Background Light
  };

  /**
   * Generate executive-grade chart configuration for PDFs
   */
  static generateChartConfig(data: ChartData, options: ChartOptions): string {
    try {
      const config = this.buildChartConfiguration(data, options);
      return this.generateChartHTML(config, options);
    } catch (error) {
      logger.error('Failed to generate chart configuration', { error, options });
      return this.getFallbackChart(options);
    }
  }

  /**
   * Build Chart.js configuration with executive styling
   */
  private static buildChartConfiguration(data: ChartData, options: ChartOptions): ChartConfiguration {
    const colors = { ...this.EXECUTIVE_COLORS, ...(options.colors || {}) };
    
    return {
      type: options.type as any,
      data: this.enhanceDataWithColors(data, colors, options.type),
      options: {
        responsive: options.responsive ?? true,
        maintainAspectRatio: options.maintainAspectRatio ?? false,
        plugins: {
          title: {
            display: !!options.title,
            text: options.title,
            font: {
              size: 16,
              weight: 'bold',
              family: 'Inter, sans-serif'
            },
            color: colors.navy,
            padding: 20
          },
          subtitle: {
            display: !!options.subtitle,
            text: options.subtitle,
            font: {
              size: 12,
              family: 'Inter, sans-serif'
            },
            color: colors.secondary,
            padding: 10
          },
          legend: {
            display: options.plugins?.legend ?? true,
            position: 'top' as const,
            labels: {
              font: {
                size: 11,
                family: 'Inter, sans-serif'
              },
              color: colors.navy,
              usePointStyle: true,
              padding: 15
            }
          },
          tooltip: {
            enabled: options.plugins?.tooltip ?? true,
            backgroundColor: colors.navy,
            titleColor: colors.light,
            bodyColor: colors.light,
            borderColor: colors.primary,
            borderWidth: 1,
            cornerRadius: 8,
            font: {
              family: 'Inter, sans-serif'
            }
          }
        },
        scales: this.buildScalesConfiguration(options, colors),
        elements: {
          point: {
            radius: options.type === 'line' ? 4 : 0,
            hoverRadius: options.type === 'line' ? 6 : 0,
            borderWidth: 2
          },
          line: {
            borderWidth: 3,
            tension: 0.4
          },
          bar: {
            borderRadius: 4,
            borderSkipped: false
          }
        }
      }
    };
  }

  /**
   * Enhance chart data with executive color scheme
   */
  private static enhanceDataWithColors(data: ChartData, colors: any, chartType: string): ChartData {
    const colorPalette = [
      colors.primary, colors.success, colors.warning, colors.info,
      colors.accent, colors.gold, colors.secondary, colors.danger
    ];

    const enhancedData = { ...data };
    
    enhancedData.datasets = data.datasets.map((dataset, index) => {
      const baseColor = colorPalette[index % colorPalette.length];
      
      return {
        ...dataset,
        backgroundColor: dataset.backgroundColor || this.getBackgroundColor(baseColor, chartType),
        borderColor: dataset.borderColor || baseColor,
        borderWidth: dataset.borderWidth || (chartType === 'line' ? 3 : 1),
        fill: dataset.fill ?? (chartType === 'area'),
        tension: dataset.tension ?? 0.4,
        pointRadius: dataset.pointRadius ?? (chartType === 'line' ? 4 : 0),
        pointHoverRadius: dataset.pointHoverRadius ?? (chartType === 'line' ? 6 : 0)
      };
    });

    return enhancedData;
  }

  /**
   * Get appropriate background color based on chart type
   */
  private static getBackgroundColor(baseColor: string, chartType: string): string | string[] {
    switch (chartType) {
      case 'line':
        return this.hexToRgba(baseColor, 0.1);
      case 'area':
        return this.hexToRgba(baseColor, 0.3);
      case 'bar':
        return this.hexToRgba(baseColor, 0.8);
      case 'doughnut':
      case 'pie':
        return [
          this.hexToRgba(baseColor, 0.9),
          this.hexToRgba(baseColor, 0.7),
          this.hexToRgba(baseColor, 0.5),
          this.hexToRgba(baseColor, 0.3)
        ];
      default:
        return this.hexToRgba(baseColor, 0.7);
    }
  }

  /**
   * Build scales configuration for executive charts
   */
  private static buildScalesConfiguration(options: ChartOptions, colors: any): any {
    if (options.type === 'doughnut' || options.type === 'pie') {
      return {};
    }

    return {
      x: {
        display: options.axes?.x?.display ?? true,
        title: {
          display: !!options.axes?.x?.title,
          text: options.axes?.x?.title,
          font: {
            size: 12,
            weight: 'bold',
            family: 'Inter, sans-serif'
          },
          color: colors.navy
        },
        grid: {
          display: options.axes?.x?.grid ?? true,
          color: this.hexToRgba(colors.secondary, 0.2),
          borderDash: [3, 3]
        },
        ticks: {
          font: {
            size: 10,
            family: 'Inter, sans-serif'
          },
          color: colors.secondary
        }
      },
      y: {
        display: options.axes?.y?.display ?? true,
        title: {
          display: !!options.axes?.y?.title,
          text: options.axes?.y?.title,
          font: {
            size: 12,
            weight: 'bold',
            family: 'Inter, sans-serif'
          },
          color: colors.navy
        },
        grid: {
          display: options.axes?.y?.grid ?? true,
          color: this.hexToRgba(colors.secondary, 0.2),
          borderDash: [3, 3]
        },
        ticks: {
          font: {
            size: 10,
            family: 'Inter, sans-serif'
          },
          color: colors.secondary
        },
        min: options.axes?.y?.min,
        max: options.axes?.y?.max
      }
    };
  }

  /**
   * Generate HTML container for chart with executive styling
   */
  private static generateChartHTML(config: ChartConfiguration, options: ChartOptions): string {
    const chartId = `chart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const width = options.width || 600;
    const height = options.height || 300;

    return `
      <div class="executive-chart-container" style="
        background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 20px;
        margin: 16px 0;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        position: relative;
        overflow: hidden;
      ">
        <div style="position: absolute; top: 0; left: 0; width: 100%; height: 3px; background: linear-gradient(90deg, #1e40af 0%, #7c3aed 100%);"></div>
        
        ${options.title ? `
        <div class="chart-header" style="
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid #e2e8f0;
        ">
          <h3 style="
            font-size: 16px;
            font-weight: 700;
            color: #0a1628;
            margin: 0 0 4px 0;
            font-family: 'Inter', sans-serif;
          ">${options.title}</h3>
          ${options.subtitle ? `
          <p style="
            font-size: 12px;
            color: #64748b;
            margin: 0;
            font-family: 'Inter', sans-serif;
          ">${options.subtitle}</p>
          ` : ''}
        </div>
        ` : ''}
        
        <div class="chart-wrapper" style="
          position: relative;
          height: ${height}px;
          width: 100%;
        ">
          <canvas 
            id="${chartId}"
            width="${width}" 
            height="${height}"
            style="max-width: 100%; height: auto;"
          ></canvas>
        </div>
      </div>

      <script>
        (function() {
          const ctx = document.getElementById('${chartId}');
          if (ctx && typeof Chart !== 'undefined') {
            new Chart(ctx, ${JSON.stringify(config)});
          }
        })();
      </script>
    `;
  }

  /**
   * Convert hex color to rgba
   */
  private static hexToRgba(hex: string, alpha: number): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return hex;
    
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /**
   * Generate fallback chart for error cases
   */
  private static getFallbackChart(options: ChartOptions): string {
    return `
      <div class="executive-chart-container" style="
        background: linear-gradient(135deg, #fee2e2 0%, #fef2f2 100%);
        border: 1px solid #fecaca;
        border-radius: 12px;
        padding: 40px;
        margin: 16px 0;
        text-align: center;
      ">
        <div style="color: #dc2626; font-size: 14px; font-weight: 600;">
          ⚠️ Chart Generation Error
        </div>
        <div style="color: #7f1d1d; font-size: 11px; margin-top: 8px;">
          ${options.title || 'Unable to generate chart'}
        </div>
      </div>
    `;
  }

  /**
   * Generate KPI visualization charts
   */
  static generateKPIChart(
    title: string,
    value: number,
    target: number,
    previous?: number,
    unit: string = '%'
  ): string {
    const trend = previous ? (value > previous ? 'up' : value < previous ? 'down' : 'stable') : 'stable';
    const performance = value >= target ? 'success' : value >= target * 0.8 ? 'warning' : 'danger';
    
    const data: ChartData = {
      labels: ['Actual', 'Target', 'Previous'],
      datasets: [{
        label: title,
        data: [value, target, previous || 0],
        backgroundColor: [
          this.EXECUTIVE_COLORS[performance === 'success' ? 'success' : performance === 'warning' ? 'warning' : 'danger'],
          this.EXECUTIVE_COLORS.secondary,
          this.EXECUTIVE_COLORS.info
        ]
      }]
    };

    const options: ChartOptions = {
      type: 'bar',
      title: `${title} - ${value}${unit}`,
      subtitle: `Target: ${target}${unit} | Trend: ${trend}`,
      width: 400,
      height: 250,
      axes: {
        y: {
          title: unit,
          min: 0
        }
      }
    };

    return this.generateChartConfig(data, options);
  }

  /**
   * Generate trend line chart
   */
  static generateTrendChart(
    title: string,
    timeSeriesData: Array<{ date: string; value: number }>,
    subtitle?: string
  ): string {
    const data: ChartData = {
      labels: timeSeriesData.map(d => d.date),
      datasets: [{
        label: title,
        data: timeSeriesData.map(d => d.value),
        borderColor: this.EXECUTIVE_COLORS.primary,
        backgroundColor: this.hexToRgba(this.EXECUTIVE_COLORS.primary, 0.1),
        fill: true,
        tension: 0.4
      }]
    };

    const options: ChartOptions = {
      type: 'line',
      title,
      subtitle: subtitle || `Trend over ${timeSeriesData.length} periods`,
      width: 600,
      height: 300
    };

    return this.generateChartConfig(data, options);
  }

  /**
   * Generate health score gauge
   */
  static generateHealthScoreGauge(score: number, title: string = 'Health Score'): string {
    const data: ChartData = {
      labels: ['Score', 'Remaining'],
      datasets: [{
        data: [score, 100 - score],
        backgroundColor: [
          score >= 80 ? this.EXECUTIVE_COLORS.success :
          score >= 60 ? this.EXECUTIVE_COLORS.warning : this.EXECUTIVE_COLORS.danger,
          this.hexToRgba(this.EXECUTIVE_COLORS.secondary, 0.2)
        ],
        borderWidth: 0
      }]
    };

    const options: ChartOptions = {
      type: 'doughnut',
      title: `${title}: ${score.toFixed(1)}%`,
      subtitle: this.getScoreDescription(score),
      width: 300,
      height: 300,
      plugins: {
        legend: false
      }
    };

    return this.generateChartConfig(data, options);
  }

  /**
   * Get score description for health gauges
   */
  private static getScoreDescription(score: number): string {
    if (score >= 90) return 'Excellent Performance';
    if (score >= 80) return 'Strong Performance';
    if (score >= 70) return 'Good Performance';
    if (score >= 60) return 'Fair Performance';
    return 'Needs Improvement';
  }

  /**
   * Generate SWOT analysis visualization
   */
  static generateSWOTVisualization(swot: {
    strengths: number;
    weaknesses: number;
    opportunities: number;
    threats: number;
  }): string {
    const data: ChartData = {
      labels: ['Strengths', 'Weaknesses', 'Opportunities', 'Threats'],
      datasets: [{
        data: [swot.strengths, swot.weaknesses, swot.opportunities, swot.threats],
        backgroundColor: [
          this.EXECUTIVE_COLORS.success,
          this.EXECUTIVE_COLORS.danger,
          this.EXECUTIVE_COLORS.info,
          this.EXECUTIVE_COLORS.warning
        ]
      }]
    };

    const options: ChartOptions = {
      type: 'radar',
      title: 'SWOT Analysis Overview',
      subtitle: 'Strategic positioning analysis',
      width: 400,
      height: 400,
      axes: {
        y: {
          min: 0,
          max: Math.max(swot.strengths, swot.weaknesses, swot.opportunities, swot.threats) + 2
        }
      }
    };

    return this.generateChartConfig(data, options);
  }
}