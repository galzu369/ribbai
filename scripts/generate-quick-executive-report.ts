import { ExecutiveMonthlyReportService } from '../features/business-intelligence/services/executive-monthly-reports';
import { MonthlyReportTemplateService } from '../features/business-intelligence/services/monthly-report-template';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { startOfMonth } from 'date-fns';
import { prisma } from '../lib/db';

async function generateQuickExecutiveReport() {
  console.log('🎯 QUICK EXECUTIVE REPORT GENERATION');
  console.log('═'.repeat(50));
  console.log();

  try {
    // Use June 2026 data
    const reportMonth = startOfMonth(new Date(2026, 5, 1)); // June 2026
    
    console.log(`📊 Generating report for: ${reportMonth.toDateString()}`);
    console.log();

    // Generate the executive report data
    console.log('• Gathering executive data...');
    const reportData = await ExecutiveMonthlyReportService.generateMonthlyExecutiveReport(
      reportMonth,
      {
        includeSWOT: true,
        includeRankings: true,
        includeStrategicRecommendations: true,
        includeMarketAnalysis: true
      }
    );

    console.log('✓ Executive data generated successfully');
    console.log(`  - Report ID: ${reportData.reportId}`);
    console.log(`  - Health Score: ${reportData.executiveSummary.healthScore}/100`);
    console.log(`  - Performance: ${reportData.executiveSummary.overallPerformance}`);
    console.log(`  - SWOT Items: ${reportData.swotAnalysis.strengths.length + reportData.swotAnalysis.weaknesses.length}`);
    console.log();

    // Generate HTML template
    console.log('• Generating HTML template...');
    const htmlContent = MonthlyReportTemplateService.generateHTML(reportData);

    console.log('✓ HTML template generated');
    console.log(`  - Size: ${(htmlContent.length / 1024).toFixed(1)}KB`);
    console.log();

    // Save HTML file
    const reportsDir = './reports/monthly';
    mkdirSync(reportsDir, { recursive: true });
    
    const filename = `executive-report-${reportData.reportId}.html`;
    const filepath = join(reportsDir, filename);
    
    writeFileSync(filepath, htmlContent, 'utf-8');

    console.log('📁 Report saved successfully');
    console.log(`  - Location: ${filepath}`);
    console.log(`  - File: ${filename}`);
    console.log();

    console.log('🎉 QUICK EXECUTIVE REPORT COMPLETED!');
    console.log(`Open the file to view your comprehensive BI report.`);

  } catch (error) {
    console.error('❌ Error generating report:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the quick report generation
generateQuickExecutiveReport().catch(console.error);