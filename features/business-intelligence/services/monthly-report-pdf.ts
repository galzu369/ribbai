import puppeteer from "puppeteer";
import { promises as fs } from "fs";
import { join } from "path";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { MonthlyExecutiveReport } from "./executive-monthly-reports";
import { MonthlyReportTemplateService } from "./monthly-report-template";
import { logger } from "../utils/logger";

export interface MonthlyPDFOptions {
  outputDir?: string;
  filename?: string;
  includeCharts?: boolean;
  orientation?: 'portrait' | 'landscape';
  headerFooter?: boolean;
  watermark?: boolean;
  executiveSummaryOnly?: boolean;
}

export interface MonthlyPDFResult {
  success: boolean;
  filePath?: string;
  error?: string;
  fileSize?: number;
  pageCount?: number;
  generationTime?: number;
}

export class MonthlyReportPDFService {
  private static readonly DEFAULT_OUTPUT_DIR = join(process.cwd(), 'outputs', 'monthly-reports');

  static async generateExecutiveMonthlyPDF(
    reportData: MonthlyExecutiveReport,
    options: MonthlyPDFOptions = {}
  ): Promise<MonthlyPDFResult> {
    const startTime = Date.now();
    
    const {
      outputDir = this.DEFAULT_OUTPUT_DIR,
      filename = this.generateDefaultFilename(reportData),
      includeCharts = true,
      orientation = 'portrait',
      headerFooter = true,
      watermark = false,
      executiveSummaryOnly = false
    } = options;

    logger.info("Starting monthly executive PDF generation", {
      reportId: reportData.reportId,
      filename,
      options
    });

    try {
      // Ensure output directory exists
      await fs.mkdir(outputDir, { recursive: true });

      const filePath = join(outputDir, filename);

      // Generate HTML content
      let htmlContent: string;
      if (executiveSummaryOnly) {
        htmlContent = await this.generateExecutiveSummaryHTML(reportData);
      } else {
        htmlContent = MonthlyReportTemplateService.generateHTML(reportData);
      }

      // Launch browser and generate PDF
      const browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security',
          '--allow-running-insecure-content',
          '--disable-features=VizDisplayCompositor'
        ]
      });

      const page = await browser.newPage();

      // Set viewport for consistent rendering
      await page.setViewport({
        width: 1200,
        height: 1600,
        deviceScaleFactor: 2
      });

      // Set content and wait for charts to load
      await page.setContent(htmlContent, {
        waitUntil: ['networkidle0', 'domcontentloaded']
      });

      // Wait for charts if enabled
      if (includeCharts) {
        await page.waitForTimeout(3000); // Allow time for Chart.js to render
      }

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        landscape: orientation === 'landscape',
        printBackground: true,
        margin: {
          top: '8mm',
          right: '6mm',
          bottom: '10mm',
          left: '6mm'
        },
        displayHeaderFooter: headerFooter,
        headerTemplate: headerFooter ? this.getHeaderTemplate(reportData) : '',
        footerTemplate: headerFooter ? this.getFooterTemplate(reportData) : '',
        preferCSSPageSize: true
      });

      await browser.close();

      // Add watermark if requested
      let finalBuffer = pdfBuffer;
      if (watermark) {
        finalBuffer = await this.addWatermark(pdfBuffer, 'CONFIDENCIAL');
      }

      // Write file
      await fs.writeFile(filePath, finalBuffer);

      const fileStats = await fs.stat(filePath);
      const generationTime = Date.now() - startTime;

      // Get page count (estimate based on file size)
      const estimatedPageCount = Math.ceil(finalBuffer.length / 50000); // Rough estimate

      logger.info("Monthly executive PDF generated successfully", {
        reportId: reportData.reportId,
        filePath,
        fileSize: fileStats.size,
        pageCount: estimatedPageCount,
        generationTime
      });

      return {
        success: true,
        filePath,
        fileSize: fileStats.size,
        pageCount: estimatedPageCount,
        generationTime
      };

    } catch (error) {
      logger.error("Failed to generate monthly executive PDF", {
        error: error.message,
        reportId: reportData.reportId,
        stack: error.stack
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  static async generateMultipleMonthlyReports(
    reports: MonthlyExecutiveReport[],
    options: MonthlyPDFOptions = {}
  ): Promise<MonthlyPDFResult[]> {
    logger.info("Generating multiple monthly reports", {
      reportCount: reports.length,
      options
    });

    const results: MonthlyPDFResult[] = [];

    for (const report of reports) {
      const filename = this.generateDefaultFilename(report);
      const result = await this.generateExecutiveMonthlyPDF(report, {
        ...options,
        filename
      });
      results.push(result);
    }

    const successCount = results.filter(r => r.success).length;
    logger.info("Completed multiple monthly report generation", {
      total: reports.length,
      success: successCount,
      failed: reports.length - successCount
    });

    return results;
  }

  static async generateComparisonReport(
    currentMonth: MonthlyExecutiveReport,
    previousMonth: MonthlyExecutiveReport,
    options: MonthlyPDFOptions = {}
  ): Promise<MonthlyPDFResult> {
    logger.info("Generating monthly comparison report", {
      currentReportId: currentMonth.reportId,
      previousReportId: previousMonth.reportId
    });

    try {
      // Generate comparison HTML
      const comparisonHTML = this.generateComparisonHTML(currentMonth, previousMonth);
      
      const filename = options.filename || 
        `monthly_comparison_${format(currentMonth.periodStart, 'yyyy-MM')}_vs_${format(previousMonth.periodStart, 'yyyy-MM')}.pdf`;

      // Use similar PDF generation logic
      const outputDir = options.outputDir || this.DEFAULT_OUTPUT_DIR;
      await fs.mkdir(outputDir, { recursive: true });

      const filePath = join(outputDir, filename);

      const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setContent(comparisonHTML, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '8mm', right: '6mm', bottom: '10mm', left: '6mm' }
      });

      await browser.close();
      await fs.writeFile(filePath, pdfBuffer);

      const fileStats = await fs.stat(filePath);

      return {
        success: true,
        filePath,
        fileSize: fileStats.size,
        pageCount: Math.ceil(pdfBuffer.length / 50000)
      };

    } catch (error) {
      logger.error("Failed to generate comparison report", { error: error.message });
      return { success: false, error: error.message };
    }
  }

  private static generateDefaultFilename(reportData: MonthlyExecutiveReport): string {
    const monthStr = format(reportData.periodStart, 'yyyy-MM', { locale: pt });
    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    return `relatorio_executivo_mensal_${monthStr}_${timestamp}.pdf`;
  }

  private static async generateExecutiveSummaryHTML(reportData: MonthlyExecutiveReport): string {
    // Generate a condensed executive summary version
    const monthLabel = format(reportData.periodStart, 'MMMM yyyy', { locale: pt });
    
    return `
<!DOCTYPE html>
<html lang="pt-PT">
<head>
    <meta charset="utf-8" />
    <title>Síntese Executiva | ${monthLabel}</title>
    <style>
        ${this.getExecutiveSummaryStyles()}
    </style>
</head>
<body>
    <div class="executive-summary">
        <div class="summary-header">
            <h1>Síntese Executiva</h1>
            <h2>${monthLabel} | RIBBAI</h2>
            <div class="performance-badge ${reportData.executiveSummary.overallPerformance}">
                ${reportData.executiveSummary.overallPerformance.toUpperCase()}
            </div>
        </div>
        
        <div class="summary-content">
            <div class="headline">
                <h3>Panorama do Mês</h3>
                <p>${reportData.executiveSummary.headline}</p>
            </div>

            <div class="key-metrics">
                <div class="metric-card">
                    <div class="metric-label">Health Score</div>
                    <div class="metric-value">${reportData.executiveSummary.operationalHighlights.healthScore.toFixed(1)}%</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Revenue</div>
                    <div class="metric-value">€${reportData.executiveSummary.financialHighlights.revenue.toLocaleString()}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Team Performance</div>
                    <div class="metric-value">${reportData.executiveSummary.teamHighlights.performanceIndex.toFixed(1)}%</div>
                </div>
            </div>

            <div class="key-points">
                <div class="achievements">
                    <h4>🏆 Principais Conquistas</h4>
                    <ul>
                        ${reportData.executiveSummary.keyAchievements.map(achievement => `<li>${achievement}</li>`).join('')}
                    </ul>
                </div>

                <div class="challenges">
                    <h4>⚠️ Desafios Principais</h4>
                    <ul>
                        ${reportData.executiveSummary.primaryChallenges.map(challenge => `<li>${challenge}</li>`).join('')}
                    </ul>
                </div>
            </div>

            ${reportData.executiveSummary.executiveDecisionsRequired.length > 0 ? `
            <div class="decisions-required">
                <h4>🚨 Decisões Executivas Requeridas</h4>
                <ul>
                    ${reportData.executiveSummary.executiveDecisionsRequired.map(decision => `<li>${decision}</li>`).join('')}
                </ul>
            </div>
            ` : ''}
        </div>
    </div>
</body>
</html>`;
  }

  private static getExecutiveSummaryStyles(): string {
    return `
      body {
        font-family: 'Inter', sans-serif;
        font-size: 12px;
        line-height: 1.6;
        color: #0a1628;
        margin: 0;
        padding: 20px;
        background: #f8fafc;
      }

      .executive-summary {
        max-width: 800px;
        margin: 0 auto;
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        overflow: hidden;
      }

      .summary-header {
        background: linear-gradient(135deg, #0a1628 0%, #1e40af 100%);
        color: white;
        padding: 30px;
        text-align: center;
        position: relative;
      }

      .summary-header h1 {
        font-size: 28px;
        font-weight: 800;
        margin: 0 0 8px 0;
      }

      .summary-header h2 {
        font-size: 16px;
        font-weight: 400;
        opacity: 0.9;
        margin: 0;
      }

      .performance-badge {
        display: inline-block;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-top: 16px;
      }

      .performance-badge.exceptional { background: #059669; }
      .performance-badge.strong { background: #1e40af; }
      .performance-badge.satisfactory { background: #d97706; }
      .performance-badge.below_expectations { background: #dc2626; }
      .performance-badge.critical { background: #7c2d12; }

      .summary-content {
        padding: 30px;
      }

      .headline {
        margin-bottom: 30px;
        text-align: center;
      }

      .headline h3 {
        font-size: 20px;
        font-weight: 700;
        color: #0a1628;
        margin: 0 0 12px 0;
      }

      .headline p {
        font-size: 14px;
        color: #64748b;
        line-height: 1.8;
        max-width: 600px;
        margin: 0 auto;
      }

      .key-metrics {
        display: flex;
        gap: 20px;
        margin-bottom: 30px;
        justify-content: center;
      }

      .metric-card {
        text-align: center;
        padding: 20px;
        background: #f8fafc;
        border-radius: 8px;
        min-width: 120px;
      }

      .metric-label {
        font-size: 10px;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 8px;
      }

      .metric-value {
        font-size: 24px;
        font-weight: 800;
        color: #1e40af;
      }

      .key-points {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 30px;
        margin-bottom: 30px;
      }

      .key-points h4 {
        font-size: 14px;
        font-weight: 600;
        margin: 0 0 12px 0;
      }

      .key-points ul {
        list-style: none;
        padding: 0;
        margin: 0;
      }

      .key-points li {
        font-size: 11px;
        line-height: 1.6;
        padding: 8px 0;
        border-bottom: 1px solid #e2e8f0;
      }

      .key-points li:before {
        content: "•";
        color: #1e40af;
        font-weight: bold;
        width: 16px;
        display: inline-block;
      }

      .decisions-required {
        background: linear-gradient(135deg, #fee2e2 0%, #fef2f2 100%);
        border: 1px solid #fecaca;
        border-radius: 8px;
        padding: 20px;
      }

      .decisions-required h4 {
        color: #dc2626;
        font-size: 14px;
        font-weight: 600;
        margin: 0 0 12px 0;
      }

      .decisions-required ul {
        list-style: none;
        padding: 0;
        margin: 0;
      }

      .decisions-required li {
        font-size: 11px;
        line-height: 1.6;
        padding: 6px 0;
        color: #7f1d1d;
      }

      .decisions-required li:before {
        content: "⚠️";
        margin-right: 8px;
      }
    `;
  }

  private static generateComparisonHTML(current: MonthlyExecutiveReport, previous: MonthlyExecutiveReport): string {
    const currentMonth = format(current.periodStart, 'MMMM yyyy', { locale: pt });
    const previousMonth = format(previous.periodStart, 'MMMM yyyy', { locale: pt });

    return `
<!DOCTYPE html>
<html lang="pt-PT">
<head>
    <meta charset="utf-8" />
    <title>Comparação Mensal | ${currentMonth} vs ${previousMonth}</title>
    <style>
        ${this.getComparisonStyles()}
    </style>
</head>
<body>
    <div class="comparison-report">
        <div class="comparison-header">
            <h1>Análise Comparativa Mensal</h1>
            <h2>${currentMonth} vs ${previousMonth}</h2>
        </div>
        
        <div class="comparison-grid">
            <div class="comparison-section">
                <h3>${currentMonth}</h3>
                <div class="performance-score ${current.executiveSummary.overallPerformance}">
                    ${current.executiveSummary.overallPerformance.toUpperCase()}
                </div>
                <div class="metrics">
                    <div>Health: ${current.executiveSummary.operationalHighlights.healthScore.toFixed(1)}%</div>
                    <div>Revenue: €${current.executiveSummary.financialHighlights.revenue.toLocaleString()}</div>
                    <div>Team: ${current.executiveSummary.teamHighlights.performanceIndex.toFixed(1)}%</div>
                </div>
            </div>
            
            <div class="comparison-section">
                <h3>${previousMonth}</h3>
                <div class="performance-score ${previous.executiveSummary.overallPerformance}">
                    ${previous.executiveSummary.overallPerformance.toUpperCase()}
                </div>
                <div class="metrics">
                    <div>Health: ${previous.executiveSummary.operationalHighlights.healthScore.toFixed(1)}%</div>
                    <div>Revenue: €${previous.executiveSummary.financialHighlights.revenue.toLocaleString()}</div>
                    <div>Team: ${previous.executiveSummary.teamHighlights.performanceIndex.toFixed(1)}%</div>
                </div>
            </div>
        </div>
        
        <div class="analysis-section">
            <h3>Análise Comparativa</h3>
            <p>Comparação detalhada entre os dois períodos mostra as principais evoluções e tendências.</p>
        </div>
    </div>
</body>
</html>`;
  }

  private static getComparisonStyles(): string {
    return `
      body { font-family: 'Inter', sans-serif; margin: 0; padding: 20px; background: #f8fafc; }
      .comparison-report { max-width: 900px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }
      .comparison-header { background: linear-gradient(135deg, #0a1628 0%, #1e40af 100%); color: white; padding: 30px; text-align: center; }
      .comparison-header h1 { font-size: 28px; margin: 0 0 8px 0; }
      .comparison-header h2 { font-size: 16px; opacity: 0.9; margin: 0; }
      .comparison-grid { display: grid; grid-template-columns: 1fr 1fr; }
      .comparison-section { padding: 30px; border-right: 1px solid #e2e8f0; }
      .comparison-section:last-child { border-right: none; }
      .performance-score { display: inline-block; padding: 8px 16px; border-radius: 20px; font-size: 10px; font-weight: 600; text-transform: uppercase; margin: 16px 0; color: white; }
      .performance-score.exceptional { background: #059669; }
      .performance-score.strong { background: #1e40af; }
      .performance-score.satisfactory { background: #d97706; }
      .metrics div { padding: 4px 0; font-size: 12px; }
      .analysis-section { padding: 30px; border-top: 1px solid #e2e8f0; }
      .analysis-section h3 { font-size: 18px; margin: 0 0 16px 0; }
    `;
  }

  private static getHeaderTemplate(reportData: MonthlyExecutiveReport): string {
    return `
      <div style="font-size: 8px; color: #64748b; width: 100%; text-align: center; margin-top: 4mm;">
        RIBBAI - Relatório Executivo Mensal | ${format(reportData.periodStart, 'MMMM yyyy', { locale: pt })} | Confidencial
      </div>
    `;
  }

  private static getFooterTemplate(reportData: MonthlyExecutiveReport): string {
    return `
      <div style="font-size: 8px; color: #64748b; width: 100%; display: flex; justify-content: space-between; margin-bottom: 4mm; padding: 0 8mm;">
        <span>Gerado em ${format(reportData.generatedAt, 'dd/MM/yyyy HH:mm')}</span>
        <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
        <span>Sistema BI RIBBAI v2.0</span>
      </div>
    `;
  }

  private static async addWatermark(pdfBuffer: Buffer, watermarkText: string): Promise<Buffer> {
    // This would require additional PDF manipulation library (e.g., pdf-lib)
    // For now, return the original buffer
    logger.info("Watermark requested but not implemented yet", { watermarkText });
    return pdfBuffer;
  }

  static async getReportStatistics(outputDir?: string): Promise<{
    totalReports: number;
    totalSize: number;
    oldestReport: Date | null;
    newestReport: Date | null;
    averageSize: number;
  }> {
    const dir = outputDir || this.DEFAULT_OUTPUT_DIR;
    
    try {
      const files = await fs.readdir(dir);
      const pdfFiles = files.filter(file => file.endsWith('.pdf'));
      
      if (pdfFiles.length === 0) {
        return {
          totalReports: 0,
          totalSize: 0,
          oldestReport: null,
          newestReport: null,
          averageSize: 0
        };
      }

      let totalSize = 0;
      const dates: Date[] = [];

      for (const file of pdfFiles) {
        const filePath = join(dir, file);
        const stats = await fs.stat(filePath);
        totalSize += stats.size;
        dates.push(stats.mtime);
      }

      dates.sort();

      return {
        totalReports: pdfFiles.length,
        totalSize,
        oldestReport: dates[0],
        newestReport: dates[dates.length - 1],
        averageSize: totalSize / pdfFiles.length
      };

    } catch (error) {
      logger.error("Failed to get report statistics", { error: error.message, outputDir: dir });
      return {
        totalReports: 0,
        totalSize: 0,
        oldestReport: null,
        newestReport: null,
        averageSize: 0
      };
    }
  }
}