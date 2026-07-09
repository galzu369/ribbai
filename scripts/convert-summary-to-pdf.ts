import puppeteer from 'puppeteer';
import { existsSync } from 'fs';
import { join, dirname, basename } from 'path';

async function convertSummaryToPDF() {
  console.log('🎯 CONVERTING EXECUTIVE SUMMARY TO PDF');
  console.log('═'.repeat(50));
  console.log();

  try {
    const htmlFilePath = './reports/monthly/basic-executive-summary-2026-06.html';
    
    // Check if HTML file exists
    if (!existsSync(htmlFilePath)) {
      console.error('❌ HTML file not found:', htmlFilePath);
      process.exit(1);
    }

    console.log(`📄 Converting: ${basename(htmlFilePath)}`);
    console.log();

    // Launch Puppeteer
    console.log('• Starting browser...');
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // Set viewport for consistent rendering
    await page.setViewport({ width: 1200, height: 800 });

    console.log('• Loading HTML file...');
    const absolutePath = join(process.cwd(), htmlFilePath);
    await page.goto(`file://${absolutePath}`, { waitUntil: 'networkidle0' });

    // Generate PDF
    console.log('• Generating PDF...');
    const pdfPath = htmlFilePath.replace('.html', '.pdf');
    
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      },
      preferCSSPageSize: true
    });

    await browser.close();

    console.log();
    console.log('🎉 PDF CONVERSION COMPLETED!');
    console.log(`  - Original: ${basename(htmlFilePath)}`);
    console.log(`  - PDF: ${basename(pdfPath)}`);
    console.log(`  - Location: ${dirname(pdfPath)}`);
    console.log();
    console.log('✓ Your executive summary is now available in PDF format!');

  } catch (error) {
    console.error('❌ Error converting to PDF:', error);
    process.exit(1);
  }
}

// Run the conversion
convertSummaryToPDF().catch(console.error);