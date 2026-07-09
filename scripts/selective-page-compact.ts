import { readFileSync, writeFileSync } from 'fs';
import puppeteer from 'puppeteer';
import { join } from 'path';

async function selectivePageCompact() {
  console.log('🎯 COMPACTANDO APENAS PÁGINAS 2, 3 E 4 NUMA SÓ');
  console.log('═'.repeat(50));

  try {
    const htmlPath = join('reports', 'monthly', 'ribbai-executive-complete-2026-06.html');
    let htmlContent = readFileSync(htmlPath, 'utf8');

    console.log('🔄 Restaurando layout original e aplicando compactação seletiva...');

    // CSS com layout normal + compactação seletiva para páginas 2-4
    const selectiveCSS = `
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            line-height: 1.6;
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
        
        /* Layout NORMAL para métricas overview (página 1) */
        .metrics-overview {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
            gap: 15px;
            padding: 25px 30px;
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
        
        /* Layout NORMAL para secções regulares */
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
        
        /* Layout COMPACTO apenas para as páginas 2-4 específicas */
        .compact-target {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            padding: 15px 20px;
            font-size: 0.9em;
        }
        
        .compact-target .section {
            padding: 12px 15px;
        }
        
        .compact-target h2 {
            font-size: 1.4em;
            margin-bottom: 10px;
        }
        
        .compact-target h3 {
            font-size: 1.2em;
            margin: 12px 0 8px 0;
        }
        
        .compact-target .data-grid {
            grid-template-columns: 1fr;
            gap: 8px;
        }
        
        .compact-target .kpi-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
        }
        
        .compact-target .data-item,
        .compact-target .kpi-item {
            padding: 10px;
            font-size: 0.85em;
        }
        
        .compact-target .table {
            font-size: 0.8em;
        }
        
        .compact-target .table th,
        .compact-target .table td {
            padding: 4px 6px;
        }
        
        /* Layout normal para outras secções */
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
        
        .priority-operational { border-left-color: #6f42c1; }
        
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
        
        .highlight, .success {
            padding: 12px;
            margin: 12px 0;
            border-radius: 4px;
        }
        
        .success {
            background: #d4edda;
            border-left: 4px solid #28a745;
        }
        
        .highlight {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
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
        
        /* Controle de páginas - páginas 2-4 numa só */
        @media print {
            body { padding: 0; }
            
            /* Página 1 normal */
            .metrics-overview {
                page-break-after: always;
                break-after: page;
            }
            
            /* Páginas 2-4 compactadas numa só */
            .compact-target {
                page-break-before: avoid;
                page-break-inside: avoid;
                break-inside: avoid;
            }
            
            .compact-target .section {
                page-break-inside: avoid;
                break-inside: avoid;
            }
            
            /* Após páginas compactadas, voltar ao normal */
            .normal-sections {
                page-break-before: always;
                break-before: page;
            }
            
            .normal-sections .section {
                padding: 20px 25px;
            }
        }
        
        @media screen {
            .compact-target {
                border: 2px dashed #28a745;
                border-radius: 10px;
                background: linear-gradient(135deg, #f8fff8 0%, #e8f5e8 100%);
                margin: 20px 0;
            }
            
            .compact-target::before {
                content: "📄 PÁGINAS 2-4 COMPACTADAS";
                display: block;
                text-align: center;
                font-weight: bold;
                color: #28a745;
                padding: 8px;
                margin-bottom: 10px;
                background: rgba(40, 167, 69, 0.1);
                border-radius: 5px;
            }
        }
    `;

    // Substituir CSS
    const cssStartIndex = htmlContent.indexOf('<style>');
    const cssEndIndex = htmlContent.indexOf('</style>') + 8;
    
    if (cssStartIndex !== -1 && cssEndIndex !== -1) {
      const beforeCSS = htmlContent.substring(0, cssStartIndex);
      const afterCSS = htmlContent.substring(cssEndIndex);
      
      htmlContent = beforeCSS + '<style>' + selectiveCSS + '\n    </style>' + afterCSS;
    }

    // Identificar e marcar as secções das páginas 2-4 para compactação
    // Páginas 2-4 seriam: Melhorias, KPIs, e Inventário
    htmlContent = htmlContent.replace(
      /<div class="section service-improvements-section">/,
      '<div class="compact-target">\n        <div class="section service-improvements-section">'
    );

    // Encontrar onde termina a secção de inventário para fechar o compact-target
    htmlContent = htmlContent.replace(
      /(<div class="section">\s*<h2>📋 Atividade Operacional Detalhada<\/h2>)/,
      '</div>\n    <div class="normal-sections">\n        $1'
    );

    // Fechar normal-sections antes do footer
    htmlContent = htmlContent.replace(
      /<div class="footer">/,
      '</div>\n    <div class="footer">'
    );

    // Salvar HTML com compactação seletiva
    writeFileSync(htmlPath, htmlContent);
    console.log('✅ Layout seletivo aplicado');

    // Gerar PDF
    console.log('📄 Gerando PDF com compactação seletiva...');
    
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
          <strong>RIBBAI - Relatório Executivo Junho 2026</strong> | Páginas 2-4 Compactadas Seletivamente
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
    console.log('🎉 COMPACTAÇÃO SELETIVA CONCLUÍDA!');
    console.log('═'.repeat(50));
    console.log('✅ Aplicado:');
    console.log('• 📄 Página 1: Layout NORMAL (métricas overview)');
    console.log('• 🗜️ Páginas 2-4: COMPACTADAS numa só (melhorias + KPIs + inventário)');
    console.log('• 📄 Páginas 5+: Layout NORMAL (atividade operacional + resto)');
    console.log('• 🎯 Layout 2-colunas nas secções compactadas');
    console.log('• 📏 Margens normais mantidas (12mm/10mm)');
    console.log();
    console.log(`📏 Tamanho: ${(pdf.length / 1024).toFixed(1)} KB`);
    console.log(`📂 PDF: c:\\Users\\HP\\Desktop\\RIBBAI\\${pdfPath.replace(/\//g, '\\')}`);

  } catch (error) {
    console.error('❌ Erro na compactação seletiva:', error);
  }
}

if (require.main === module) {
  selectivePageCompact().catch(console.error);
}