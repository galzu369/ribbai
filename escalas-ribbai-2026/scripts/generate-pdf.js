#!/usr/bin/env node

/**
 * RIBBAI 2.0 - Gerador de PDF Executivo
 * Script para conversão HTML → PDF usando Puppeteer
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

/**
 * Gera PDF executivo da escala
 */
async function generateExecutivePDF() {
  console.log('📄 RIBBAI 2.0 - Iniciando geração de PDF executivo...\n');
  
  try {
    // Verificar se HTML existe (usar versão horária)
    const htmlPath = path.join(__dirname, '../output/schedule-hourly.html');
    const pdfPath = path.join(__dirname, '../output/schedule-hourly.pdf');
    
    if (!fs.existsSync(htmlPath)) {
      throw new Error('Arquivo schedule.html não encontrado. Execute "npm run generate" primeiro.');
    }

    console.log('🚀 Iniciando Puppeteer...');
    
    // Inicializar Puppeteer
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Configurar página para impressão A4
    await page.setViewport({
      width: 1200,
      height: 1600,
      deviceScaleFactor: 2
    });

    console.log('📖 Carregando documento HTML...');
    
    // Carregar HTML
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    await page.setContent(htmlContent, {
      waitUntil: ['networkidle0', 'domcontentloaded']
    });

    // Aguardar renderização completa (gráficos, etc.)
    console.log('⏳ Aguardando renderização...');
    await page.waitForTimeout(3000);

    // Executar JavaScript para garantir que tudo foi renderizado
    await page.evaluate(() => {
      // Aguardar que todos os gráficos Chart.js sejam renderizados
      return new Promise((resolve) => {
        if (typeof Chart !== 'undefined') {
          setTimeout(resolve, 1000);
        } else {
          resolve();
        }
      });
    });

    console.log('🎨 Configurando layout de impressão...');

    // Configuração PDF premium
    const pdfOptions = {
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: '15mm',
        right: '18mm',
        bottom: '15mm',
        left: '18mm'
      },
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="font-family: Inter, sans-serif; font-size: 9px; color: #64748b; width: 100%; text-align: center; margin: 0 18mm;">
          <span>RIBBAI 2.0 - Plano de Escalas Operacionais | Julho 2026</span>
        </div>
      `,
      footerTemplate: `
        <div style="font-family: Inter, sans-serif; font-size: 9px; color: #64748b; width: 100%; text-align: center; margin: 0 18mm; display: flex; justify-content: space-between;">
          <span>Documento Executivo Oficial</span>
          <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
          <span>${new Date().toLocaleDateString('pt-PT')}</span>
        </div>
      `
    };

    console.log('📄 Gerando PDF...');
    
    // Gerar PDF
    await page.pdf(pdfOptions);
    
    await browser.close();
    
    // Verificar se arquivo foi criado
    if (fs.existsSync(pdfPath)) {
      const stats = fs.statSync(pdfPath);
      const fileSizeKB = (stats.size / 1024).toFixed(2);
      
      console.log('✅ PDF gerado com sucesso!');
      console.log('════════════════════════════════════════');
      console.log(`📄 Arquivo: ${path.basename(pdfPath)}`);
      console.log(`📊 Tamanho: ${fileSizeKB} KB`);
      console.log(`📁 Localização: ${pdfPath}`);
      console.log(`📅 Data: ${new Date().toLocaleString('pt-PT')}`);
      console.log('\n🎉 PDF executivo pronto para apresentação!\n');
      
    } else {
      throw new Error('PDF não foi criado corretamente');
    }

  } catch (error) {
    console.error('❌ ERRO na geração do PDF:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

/**
 * Gera versão otimizada para impressão
 */
async function generatePrintOptimizedPDF() {
  console.log('🖨️ Gerando versão otimizada para impressão...\n');
  
  try {
    const htmlPath = path.join(__dirname, '../output/schedule.html');
    const pdfPath = path.join(__dirname, '../output/schedule-print.pdf');
    
    if (!fs.existsSync(htmlPath)) {
      throw new Error('Arquivo schedule.html não encontrado.');
    }

    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    // Configurar para impressão
    await page.setViewport({ width: 794, height: 1123 }); // A4 em pixels
    
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    // Adicionar CSS específico para impressão
    const printCSS = `
      <style>
        @media print {
          body { -webkit-print-color-adjust: exact; }
          .kpi-dashboard { page-break-inside: avoid; }
          .employee-section { page-break-inside: avoid; margin-bottom: 20px; }
          .analytics-section > div { page-break-inside: avoid; }
          .calendar-grid { page-break-inside: avoid; }
        }
      </style>
    `;
    
    const enhancedHTML = htmlContent.replace('</head>', printCSS + '</head>');
    
    await page.setContent(enhancedHTML, { waitUntil: 'networkidle0' });
    await page.waitForTimeout(2000);

    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
    });
    
    await browser.close();
    
    console.log(`✅ PDF de impressão gerado: ${pdfPath}\n`);
    
  } catch (error) {
    console.error('❌ Erro na geração da versão de impressão:', error.message);
  }
}

/**
 * Função principal
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--print')) {
    await generatePrintOptimizedPDF();
  } else if (args.includes('--both')) {
    await generateExecutivePDF();
    await generatePrintOptimizedPDF();
  } else {
    await generateExecutivePDF();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = { 
  generateExecutivePDF, 
  generatePrintOptimizedPDF 
};