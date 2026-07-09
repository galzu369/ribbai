import path from "path";
import fs from "fs/promises";
import puppeteer from "puppeteer";
import { EnhancedWeeklyReportService } from "./enhanced-weekly-reports";
import { WeeklyReportTemplateService } from "./weekly-report-template";
import { logger } from "../utils/logger";
import { format } from "date-fns";

export interface WeeklyReportPDFOptions {
  outputDir?: string;
  filename?: string;
  includeComparisons?: boolean;
  includeForecasts?: boolean;
  includeDetailedAnalysis?: boolean;
  format?: 'A4' | 'Letter';
  orientation?: 'portrait' | 'landscape';
  includeCharts?: boolean;
}

export class WeeklyReportPDFService {
  static async generateWeeklyReportPDF(
    weekStart: Date,
    options: WeeklyReportPDFOptions = {}
  ): Promise<{ pdfPath: string; htmlPath: string; reportData: any }> {
    const {
      outputDir = './reports/weekly-enhanced',
      filename,
      includeComparisons = true,
      includeForecasts = true,
      includeDetailedAnalysis = true,
      format: pageFormat = 'A4',
      orientation = 'portrait',
      includeCharts = true,
    } = options;

    logger.info("Starting enhanced weekly report PDF generation", {
      weekStart: weekStart.toISOString(),
      options
    });

    try {
      // Ensure output directory exists
      await fs.mkdir(outputDir, { recursive: true });

      // Generate the enhanced report data
      logger.info("Generating enhanced report data");
      const reportData = await EnhancedWeeklyReportService.generateWeeklyReport(
        weekStart,
        {
          includeComparisons,
          includeForecasts,
          includeDetailedAnalysis,
        }
      );

      // Generate HTML template
      logger.info("Generating HTML template");
      const htmlContent = WeeklyReportTemplateService.generateHTML(reportData);

      // Generate filenames
      const dateStr = format(weekStart, 'yyyy-MM-dd');
      const endDateStr = format(reportData.periodEnd, 'yyyy-MM-dd');
      const baseFilename = filename || `relatorio-semanal-bi-ribbai-${dateStr}_${endDateStr}`;
      
      const htmlPath = path.join(outputDir, `${baseFilename}.html`);
      const pdfPath = path.join(outputDir, `${baseFilename}.pdf`);

      // Write HTML file
      await fs.writeFile(htmlPath, htmlContent, 'utf-8');
      logger.info("HTML file written", { htmlPath });

      // Generate PDF using Puppeteer
      logger.info("Starting PDF generation");
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      try {
        const page = await browser.newPage();
        
        // Set viewport for consistent rendering
        await page.setViewport({ width: 1200, height: 1600 });
        
        // Load HTML content
        const htmlUrl = `file://${path.resolve(htmlPath)}`;
        await page.goto(htmlUrl, {
          waitUntil: ['networkidle0', 'domcontentloaded'],
          timeout: 60000,
        });

        // Wait for charts to render if included
        if (includeCharts) {
          await page.waitForTimeout(2000); // Wait for Chart.js to render
        }

        // Generate PDF
        await page.pdf({
          path: pdfPath,
          format: pageFormat,
          orientation,
          printBackground: true,
          preferCSSPageSize: true,
          displayHeaderFooter: true,
          headerTemplate: this.generateHeaderTemplate(),
          footerTemplate: this.generateFooterTemplate(),
          margin: {
            top: '15mm',
            right: '10mm',
            bottom: '15mm',
            left: '10mm',
          },
        });

        logger.info("PDF generated successfully", { pdfPath });
      } finally {
        await browser.close();
      }

      // Generate summary statistics
      const stats = this.generateReportStatistics(reportData);
      logger.info("Weekly report PDF generation completed", {
        pdfPath,
        htmlPath,
        stats
      });

      return {
        pdfPath,
        htmlPath,
        reportData,
      };
    } catch (error) {
      logger.error("Failed to generate weekly report PDF", {
        error,
        weekStart: weekStart.toISOString(),
        options
      });
      throw error;
    }
  }

  static async generateMultipleWeeklyReports(
    weeks: Date[],
    options: WeeklyReportPDFOptions = {}
  ): Promise<Array<{ week: Date; pdfPath: string; htmlPath: string; reportData: any }>> {
    logger.info("Generating multiple weekly reports", { 
      weekCount: weeks.length,
      weeks: weeks.map(w => w.toISOString())
    });

    const results = [];
    
    for (const week of weeks) {
      try {
        const result = await this.generateWeeklyReportPDF(week, options);
        results.push({
          week,
          ...result,
        });
      } catch (error) {
        logger.error("Failed to generate report for week", {
          week: week.toISOString(),
          error
        });
        // Continue with other weeks
      }
    }

    return results;
  }

  static async generateComparisonReport(
    weeks: Date[],
    outputPath?: string
  ): Promise<string> {
    logger.info("Generating weekly comparison report", { 
      weekCount: weeks.length 
    });

    try {
      const reports = await Promise.all(
        weeks.map(week => 
          EnhancedWeeklyReportService.generateWeeklyReport(week, {
            includeComparisons: false, // We'll do our own comparisons
            includeDetailedAnalysis: false, // Focus on key metrics
          })
        )
      );

      const comparisonData = this.generateComparisonData(reports);
      const htmlContent = this.generateComparisonHTML(comparisonData);
      
      const defaultPath = `./reports/weekly-enhanced/comparison-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      const finalOutputPath = outputPath || defaultPath;
      
      // Ensure directory exists
      await fs.mkdir(path.dirname(finalOutputPath), { recursive: true });
      
      const htmlPath = finalOutputPath.replace('.pdf', '.html');
      await fs.writeFile(htmlPath, htmlContent, 'utf-8');

      // Generate PDF
      const browser = await puppeteer.launch({ headless: true });
      try {
        const page = await browser.newPage();
        await page.goto(`file://${path.resolve(htmlPath)}`, {
          waitUntil: 'networkidle0',
        });

        await page.pdf({
          path: finalOutputPath,
          format: 'A4',
          printBackground: true,
          margin: {
            top: '15mm',
            right: '10mm',
            bottom: '15mm',
            left: '10mm',
          },
        });
      } finally {
        await browser.close();
      }

      logger.info("Comparison report generated", { path: finalOutputPath });
      return finalOutputPath;
    } catch (error) {
      logger.error("Failed to generate comparison report", { error });
      throw error;
    }
  }

  private static generateHeaderTemplate(): string {
    return `
    <div style="font-family: Inter, sans-serif; font-size: 8px; color: #64748b; width: 100%; padding: 0 10mm; margin-top: 5mm;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 16px; height: 16px; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: 4px;"></div>
          <span style="font-weight: 600;">RIBBAI Business Intelligence</span>
        </div>
        <div style="font-size: 7px; text-transform: uppercase; letter-spacing: 0.5px;">
          Relatório Semanal Avançado
        </div>
      </div>
    </div>`;
  }

  private static generateFooterTemplate(): string {
    return `
    <div style="font-family: Inter, sans-serif; font-size: 7px; color: #94a3b8; width: 100%; padding: 0 10mm; display: flex; justify-content: space-between; align-items: center; margin-bottom: 5mm;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <span>Sistema BI RIBBAI</span>
        <span>•</span>
        <span>Gerado automaticamente em ${format(new Date(), 'dd/MM/yyyy HH:mm')}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <span>Página</span>
        <span class="pageNumber"></span>
        <span>de</span>
        <span class="totalPages"></span>
      </div>
    </div>`;
  }

  private static generateReportStatistics(reportData: any): any {
    return {
      sections: 13,
      healthScore: reportData.healthScoreAnalysis?.currentScore || 0,
      totalKPIs: Object.keys(reportData.kpiDashboard?.operational || {}).length +
                 Object.keys(reportData.kpiDashboard?.team || {}).length +
                 Object.keys(reportData.kpiDashboard?.financial || {}).length,
      totalAlerts: reportData.alerts?.totalAlerts || 0,
      criticalAlerts: reportData.alerts?.criticalAlerts || 0,
      aiInsights: reportData.aiInsights?.keyInsights?.length || 0,
      risksIdentified: reportData.risksForNextWeek?.length || 0,
      actionItems: reportData.actionPlan?.length || 0,
      generationTime: new Date().toISOString(),
    };
  }

  private static generateComparisonData(reports: any[]): any {
    // Extract key metrics from each report for comparison
    return {
      weeks: reports.map((report, index) => ({
        weekNumber: index + 1,
        periodStart: report.periodStart,
        periodEnd: report.periodEnd,
        healthScore: report.healthScoreAnalysis?.currentScore || 0,
        efficiency: report.kpiDashboard?.operational?.efficiencyScore || 0,
        teamPerformance: report.kpiDashboard?.team?.performanceIndex || 0,
        attendance: report.kpiDashboard?.team?.attendanceRate || 0,
        incidents: report.incidentSummary?.totalIncidents || 0,
        alerts: report.alerts?.totalAlerts || 0,
      })),
      trends: {
        healthScore: this.calculateTrend(reports.map(r => r.healthScoreAnalysis?.currentScore || 0)),
        efficiency: this.calculateTrend(reports.map(r => r.kpiDashboard?.operational?.efficiencyScore || 0)),
        performance: this.calculateTrend(reports.map(r => r.kpiDashboard?.team?.performanceIndex || 0)),
      }
    };
  }

  private static calculateTrend(values: number[]): 'improving' | 'stable' | 'declining' {
    if (values.length < 2) return 'stable';
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    const change = ((secondAvg - firstAvg) / firstAvg) * 100;
    
    if (change > 2) return 'improving';
    if (change < -2) return 'declining';
    return 'stable';
  }

  private static generateComparisonHTML(comparisonData: any): string {
    return `
    <!DOCTYPE html>
    <html lang="pt-PT">
    <head>
        <meta charset="utf-8">
        <title>Relatório Comparativo Semanal - RIBBAI BI</title>
        <style>
            body { font-family: Inter, sans-serif; margin: 20px; }
            .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: white; padding: 20px; border-radius: 12px; margin-bottom: 20px; }
            .comparison-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .comparison-table th, .comparison-table td { border: 1px solid #e2e8f0; padding: 8px; text-align: center; }
            .comparison-table th { background: #f1f5f9; font-weight: 600; }
            .trend-up { color: #10b981; }
            .trend-down { color: #ef4444; }
            .trend-stable { color: #64748b; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Relatório Comparativo Semanal</h1>
            <p>Análise evolutiva das métricas principais ao longo de ${comparisonData.weeks.length} semanas</p>
        </div>

        <h2>Evolução das Métricas Principais</h2>
        <table class="comparison-table">
            <thead>
                <tr>
                    <th>Semana</th>
                    <th>Período</th>
                    <th>Health Score</th>
                    <th>Eficiência (%)</th>
                    <th>Performance Equipa (%)</th>
                    <th>Assiduidade (%)</th>
                    <th>Incidentes</th>
                    <th>Alertas</th>
                </tr>
            </thead>
            <tbody>
                ${comparisonData.weeks.map((week: any) => `
                <tr>
                    <td>${week.weekNumber}</td>
                    <td>${format(new Date(week.periodStart), 'dd/MM')} - ${format(new Date(week.periodEnd), 'dd/MM')}</td>
                    <td>${week.healthScore.toFixed(1)}</td>
                    <td>${week.efficiency.toFixed(1)}</td>
                    <td>${week.teamPerformance.toFixed(1)}</td>
                    <td>${week.attendance.toFixed(1)}</td>
                    <td>${week.incidents}</td>
                    <td>${week.alerts}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>

        <h2>Análise de Tendências</h2>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
            <div style="border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px;">
                <h3>Health Score</h3>
                <p class="trend-${comparisonData.trends.healthScore}">
                    ${comparisonData.trends.healthScore === 'improving' ? '↗️ Melhorando' : 
                      comparisonData.trends.healthScore === 'declining' ? '↘️ Em declínio' : '→ Estável'}
                </p>
            </div>
            <div style="border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px;">
                <h3>Eficiência</h3>
                <p class="trend-${comparisonData.trends.efficiency}">
                    ${comparisonData.trends.efficiency === 'improving' ? '↗️ Melhorando' : 
                      comparisonData.trends.efficiency === 'declining' ? '↘️ Em declínio' : '→ Estável'}
                </p>
            </div>
            <div style="border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px;">
                <h3>Performance</h3>
                <p class="trend-${comparisonData.trends.performance}">
                    ${comparisonData.trends.performance === 'improving' ? '↗️ Melhorando' : 
                      comparisonData.trends.performance === 'declining' ? '↘️ Em declínio' : '→ Estável'}
                </p>
            </div>
        </div>
    </body>
    </html>`;
  }
}

// Utility function to generate weekly reports for a date range
export async function generateWeeklyReportsForRange(
  startDate: Date,
  endDate: Date,
  options: WeeklyReportPDFOptions = {}
): Promise<Array<{ week: Date; pdfPath: string; htmlPath: string }>> {
  const weeks: Date[] = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    weeks.push(new Date(current));
    current.setDate(current.getDate() + 7);
  }

  return WeeklyReportPDFService.generateMultipleWeeklyReports(weeks, options);
}

// Utility function for testing
export async function generateSampleWeeklyReport(
  outputDir: string = './reports/samples'
): Promise<string> {
  const sampleWeek = new Date('2026-06-23'); // Recent Monday
  
  const result = await WeeklyReportPDFService.generateWeeklyReportPDF(sampleWeek, {
    outputDir,
    includeComparisons: true,
    includeForecasts: true,
    includeDetailedAnalysis: true,
    includeCharts: true,
  });

  return result.pdfPath;
}