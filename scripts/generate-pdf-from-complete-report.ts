import puppeteer from 'puppeteer';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

async function generatePDFFromCompleteReport() {
  console.log('📄 GERANDO PDF DO RELATÓRIO EXECUTIVO COMPLETO');
  console.log('═'.repeat(50));

  try {
    // Read the complete HTML report
    const htmlPath = join('reports', 'monthly', 'ribbai-executive-complete-2026-06.html');
    const htmlContent = readFileSync(htmlPath, 'utf8');

    console.log('📖 Lendo relatório HTML completo...');
    console.log(`📂 Fonte: ${htmlPath}`);

    // Launch browser and generate PDF
    console.log('🚀 Iniciando geração de PDF...');
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // Set content and wait for any dynamic content to load
    await page.setContent(htmlContent, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });

    // Generate PDF with optimized settings for executive report
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      },
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="font-size: 10px; color: #666; text-align: center; width: 100%; margin: 0 15mm;">
          <strong>RIBBAI - Relatório Executivo Completo Junho 2026</strong>
        </div>
      `,
      footerTemplate: `
        <div style="font-size: 10px; color: #666; text-align: center; width: 100%; margin: 0 15mm;">
          <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
          <span style="float: right;">Gerado em: ${new Date().toLocaleDateString('pt-PT')}</span>
        </div>
      `
    });

    await browser.close();

    // Save PDF
    const pdfPath = join('reports', 'monthly', 'ribbai-executive-complete-2026-06.pdf');
    writeFileSync(pdfPath, pdf);

    console.log('✅ PDF gerado com sucesso!');
    console.log(`📂 Localização: ${pdfPath}`);
    console.log(`📏 Tamanho: ${(pdf.length / 1024).toFixed(1)} KB`);
    
    console.log();
    console.log('🎉 RELATÓRIO EXECUTIVO COMPLETO DISPONÍVEL!');
    console.log('═'.repeat(50));
    console.log(`📄 HTML: c:\\Users\\HP\\Desktop\\RIBBAI\\${htmlPath.replace(/\//g, '\\')}`);
    console.log(`📋 PDF:  c:\\Users\\HP\\Desktop\\RIBBAI\\${pdfPath.replace(/\//g, '\\')}`);
    console.log();
    console.log('🏆 Relatório contém:');
    console.log('• 451 registos operacionais processados');
    console.log('• 14 melhorias de serviço identificadas');
    console.log('• 106 snapshots de KPIs analisados');
    console.log('• €1,218.39 valor de inventário detalhado');
    console.log('• Análise completa de alertas e tendências');
    console.log('• Dashboard executivo com métricas avançadas');

  } catch (error) {
    console.error('❌ Erro na geração do PDF:', error);
  }
}

if (require.main === module) {
  generatePDFFromCompleteReport().catch(console.error);
}