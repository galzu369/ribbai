import { readFileSync, writeFileSync } from 'fs';
import puppeteer from 'puppeteer';
import { join } from 'path';

async function fixReportFormatting() {
  console.log('🔧 CORRIGINDO FORMATAÇÃO E ESPAÇAMENTOS');
  console.log('═'.repeat(50));

  try {
    const htmlPath = join('reports', 'monthly', 'ribbai-executive-complete-2026-06.html');
    let htmlContent = readFileSync(htmlPath, 'utf8');

    console.log('🧹 Limpando CSS duplicado e otimizando espaçamentos...');

    // Remover CSS duplicado e aplicar otimizações
    const cleanCSS = `
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            line-height: 1.5;
            margin: 0;
            padding: 15px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            margin: 0 0 8px 0;
            font-size: 2.8em;
            font-weight: 300;
        }
        
        .subtitle {
            font-size: 1.2em;
            opacity: 0.9;
        }
        
        .executive-summary {
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
            color: white;
            padding: 20px 30px;
            margin: 0;
        }
        
        .executive-summary h2 {
            margin: 0 0 12px 0;
            font-size: 1.7em;
        }
        
        .metrics-overview {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
            gap: 12px;
            padding: 20px 25px;
            background: #f8f9fa;
        }
        
        .metric-card {
            background: white;
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.06);
            border-left: 4px solid;
        }
        
        .metric-card.operational { border-left-color: #6f42c1; }
        .metric-card.improvements { border-left-color: #28a745; }
        .metric-card.inventory { border-left-color: #17a2b8; }
        .metric-card.kpis { border-left-color: #ffc107; }
        .metric-card.alerts { border-left-color: #dc3545; }
        
        .metric-value {
            font-size: 2.4em;
            font-weight: bold;
            margin-bottom: 8px;
        }
        
        .metric-label {
            color: #666;
            font-size: 1em;
            font-weight: 500;
        }
        
        .section {
            padding: 20px 25px;
            border-bottom: 1px solid #eee;
        }
        
        .section h2 {
            color: #333;
            margin-bottom: 15px;
            font-size: 1.7em;
            padding-bottom: 8px;
            border-bottom: 3px solid #ff6b35;
        }
        
        .section h3 {
            color: #444;
            margin: 20px 0 10px 0;
            font-size: 1.3em;
        }
        
        .data-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 12px;
            margin: 12px 0;
        }
        
        .data-item {
            background: #f8f9fa;
            padding: 16px;
            border-radius: 10px;
            border-left: 4px solid #ff6b35;
        }
        
        .data-item h4 {
            margin: 0 0 10px 0;
            color: #333;
            font-size: 1.1em;
        }
        
        .priority-high { border-left-color: #dc3545; }
        .priority-medium { border-left-color: #ffc107; }
        .priority-low { border-left-color: #28a745; }
        .priority-operational { border-left-color: #6f42c1; }
        
        .improvements-list, .alerts-section {
            background: #e8f5e8;
            padding: 15px;
            border-radius: 8px;
            margin: 12px 0;
        }
        
        .alerts-section {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
        }
        
        .kpi-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
            gap: 12px;
            margin: 12px 0;
        }
        
        .kpi-item {
            background: white;
            padding: 16px;
            border-radius: 8px;
            border-top: 3px solid #007bff;
            box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        
        .footer {
            text-align: center;
            padding: 20px;
            color: #666;
            background: #f8f9fa;
        }
        
        .highlight {
            background: #fff3cd;
            padding: 12px;
            border-left: 4px solid #ffc107;
            margin: 12px 0;
            border-radius: 4px;
        }
        
        .success {
            background: #d4edda;
            padding: 12px;
            border-left: 4px solid #28a745;
            margin: 12px 0;
            border-radius: 4px;
        }
        
        .table {
            width: 100%;
            border-collapse: collapse;
            margin: 12px 0;
            background: white;
            border-radius: 6px;
            overflow: hidden;
        }
        
        .table th, .table td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #eee;
            font-size: 0.95em;
        }
        
        .table th {
            background: #f8f9fa;
            font-weight: 600;
        }
        
        .status-critical { color: #dc3545; font-weight: bold; }
        .status-warning { color: #ffc107; font-weight: bold; }
        .status-good { color: #28a745; font-weight: bold; }
        
        /* Controle de páginas otimizado */
        @media print {
            body { padding: 0; }
            
            .section { 
                padding: 15px 20px;
                page-break-inside: avoid;
            }
            
            .service-improvements-section {
                page-break-before: always;
                break-before: page;
                margin-top: 0;
                padding-top: 15px;
            }
            
            .metrics-overview {
                page-break-after: always;
                break-after: page;
            }
            
            .data-grid, .kpi-grid, .metric-card, .data-item {
                page-break-inside: avoid;
                break-inside: avoid;
            }
            
            .table {
                page-break-inside: avoid;
                break-inside: avoid;
            }
        }
        
        @media screen {
            .service-improvements-section {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 4px solid #28a745;
                background: linear-gradient(135deg, #f8fff8 0%, #e8f5e8 100%);
            }
        }
    `;

    // Encontrar e substituir todo o CSS
    const cssStartIndex = htmlContent.indexOf('<style>');
    const cssEndIndex = htmlContent.indexOf('</style>') + 8;
    
    if (cssStartIndex !== -1 && cssEndIndex !== -1) {
      const beforeCSS = htmlContent.substring(0, cssStartIndex);
      const afterCSS = htmlContent.substring(cssEndIndex);
      
      htmlContent = beforeCSS + '<style>' + cleanCSS + '\n    </style>' + afterCSS;
    }

    // Remover qualquer indicador de página restante
    htmlContent = htmlContent.replace(/<div class="page-indicator">.*?<\/div>/g, '');

    // Salvar HTML limpo
    writeFileSync(htmlPath, htmlContent);
    console.log('✅ HTML otimizado e salvo');

    // Gerar PDF com configurações melhoradas
    console.log('📄 Gerando PDF otimizado...');
    
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1600 });
    await page.setContent(htmlContent, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: '12mm',
        right: '10mm',
        bottom: '12mm',
        left: '10mm'
      },
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="font-size: 8px; color: #666; text-align: center; width: 100%; border-bottom: 1px solid #ddd; padding-bottom: 3px;">
          <strong>RIBBAI - Relatório Executivo Junho 2026</strong> | Sistema BI Otimizado
        </div>
      `,
      footerTemplate: `
        <div style="font-size: 8px; color: #666; text-align: center; width: 100%; border-top: 1px solid #ddd; padding-top: 3px;">
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; padding: 0 10mm;">
            <span>451 registos • 14 melhorias • 106 KPIs</span>
            <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
            <span>${new Date().toLocaleDateString('pt-PT')}</span>
          </div>
        </div>
      `
    });

    await browser.close();

    const pdfPath = join('reports', 'monthly', 'ribbai-executive-complete-2026-06.pdf');
    writeFileSync(pdfPath, pdf);

    console.log();
    console.log('🎉 FORMATAÇÃO CORRIGIDA COM SUCESSO!');
    console.log('═'.repeat(50));
    console.log('✅ Correções aplicadas:');
    console.log('• Indicador "PÁGINA 3" removido completamente');
    console.log('• Espaçamentos otimizados (padding reduzido 30-40%)');
    console.log('• CSS duplicado limpo');
    console.log('• Margens do PDF otimizadas');
    console.log('• Quebras de página melhoradas');
    console.log();
    console.log(`📏 Tamanho do PDF: ${(pdf.length / 1024).toFixed(1)} KB`);
    console.log(`📂 Ficheiros: c:\\Users\\HP\\Desktop\\RIBBAI\\${htmlPath.replace(/\//g, '\\')}`);
    console.log(`📋 PDF: c:\\Users\\HP\\Desktop\\RIBBAI\\${pdfPath.replace(/\//g, '\\')}`);

  } catch (error) {
    console.error('❌ Erro na correção:', error);
  }
}

if (require.main === module) {
  fixReportFormatting().catch(console.error);
}