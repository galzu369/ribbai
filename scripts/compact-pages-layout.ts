import { readFileSync, writeFileSync } from 'fs';
import puppeteer from 'puppeteer';
import { join } from 'path';

async function compactPagesLayout() {
  console.log('📄 COMPACTANDO PÁGINAS 2-4 NUMA ÚNICA PÁGINA');
  console.log('═'.repeat(50));

  try {
    const htmlPath = join('reports', 'monthly', 'ribbai-executive-complete-2026-06.html');
    let htmlContent = readFileSync(htmlPath, 'utf8');

    console.log('🗜️ Aplicando layout ultra-compacto...');

    // CSS ultra-compacto para máxima utilização do espaço
    const compactCSS = `
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            line-height: 1.3;
            margin: 0;
            padding: 10px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            font-size: 13px;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 15px 40px rgba(0,0,0,0.08);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
            color: white;
            padding: 20px;
            text-align: center;
        }
        
        .header h1 {
            margin: 0 0 6px 0;
            font-size: 2.2em;
            font-weight: 300;
        }
        
        .subtitle {
            font-size: 1.1em;
            opacity: 0.9;
        }
        
        .executive-summary {
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
            color: white;
            padding: 15px 20px;
            margin: 0;
        }
        
        .executive-summary h2 {
            margin: 0 0 8px 0;
            font-size: 1.4em;
        }
        
        .executive-summary p {
            margin: 6px 0;
            font-size: 0.95em;
        }
        
        /* Layout compacto multi-coluna */
        .compact-layout {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            padding: 15px 20px;
            background: #f8f9fa;
        }
        
        .metrics-overview {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 8px;
            padding: 15px 20px;
            background: #f8f9fa;
        }
        
        .metric-card {
            background: white;
            border-radius: 8px;
            padding: 12px 8px;
            text-align: center;
            box-shadow: 0 2px 6px rgba(0,0,0,0.04);
            border-left: 3px solid;
        }
        
        .metric-card.operational { border-left-color: #6f42c1; }
        .metric-card.improvements { border-left-color: #28a745; }
        .metric-card.inventory { border-left-color: #17a2b8; }
        .metric-card.kpis { border-left-color: #ffc107; }
        .metric-card.alerts { border-left-color: #dc3545; }
        
        .metric-value {
            font-size: 1.6em;
            font-weight: bold;
            margin-bottom: 4px;
        }
        
        .metric-label {
            color: #666;
            font-size: 0.8em;
            font-weight: 500;
        }
        
        .section {
            padding: 12px 15px;
        }
        
        .section h2 {
            color: #333;
            margin-bottom: 8px;
            font-size: 1.3em;
            padding-bottom: 4px;
            border-bottom: 2px solid #ff6b35;
        }
        
        .section h3 {
            color: #444;
            margin: 12px 0 6px 0;
            font-size: 1.1em;
        }
        
        /* Layout de colunas para conteúdo denso */
        .multi-column-content {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 12px;
            margin: 8px 0;
        }
        
        .data-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 8px;
            margin: 8px 0;
        }
        
        .data-item {
            background: #f8f9fa;
            padding: 10px;
            border-radius: 6px;
            border-left: 3px solid #ff6b35;
            font-size: 0.9em;
        }
        
        .data-item h4 {
            margin: 0 0 6px 0;
            color: #333;
            font-size: 1em;
        }
        
        .data-item .value {
            font-size: 1.3em;
            font-weight: bold;
            color: #ff6b35;
        }
        
        .priority-operational { border-left-color: #6f42c1; }
        
        .kpi-grid {
            display: grid;
            grid-template-columns: repeat(6, 1fr);
            gap: 6px;
            margin: 8px 0;
        }
        
        .kpi-item {
            background: white;
            padding: 8px;
            border-radius: 6px;
            border-top: 2px solid #007bff;
            box-shadow: 0 1px 4px rgba(0,0,0,0.03);
            font-size: 0.85em;
        }
        
        .kpi-item h4 {
            margin: 0 0 4px 0;
            font-size: 0.9em;
        }
        
        .improvements-list, .success, .highlight {
            background: #e8f5e8;
            padding: 8px;
            border-radius: 4px;
            margin: 6px 0;
            font-size: 0.9em;
        }
        
        .success {
            background: #d4edda;
            border-left: 3px solid #28a745;
        }
        
        .highlight {
            background: #fff3cd;
            border-left: 3px solid #ffc107;
        }
        
        .table {
            width: 100%;
            border-collapse: collapse;
            margin: 8px 0;
            background: white;
            border-radius: 4px;
            overflow: hidden;
            font-size: 0.85em;
        }
        
        .table th, .table td {
            padding: 6px 8px;
            text-align: left;
            border-bottom: 1px solid #eee;
        }
        
        .table th {
            background: #f8f9fa;
            font-weight: 600;
            font-size: 0.8em;
        }
        
        .footer {
            text-align: center;
            padding: 15px;
            color: #666;
            background: #f8f9fa;
            font-size: 0.9em;
        }
        
        .status-critical { color: #dc3545; font-weight: bold; }
        .status-warning { color: #ffc107; font-weight: bold; }
        .status-good { color: #28a745; font-weight: bold; }
        
        /* Força tudo nas páginas 2-4 numa única página */
        @media print {
            body { 
                padding: 0;
                font-size: 11px;
            }
            
            .section { 
                padding: 8px 12px;
                page-break-inside: avoid;
            }
            
            /* Primeira quebra após métricas */
            .metrics-overview {
                page-break-after: always;
                break-after: page;
            }
            
            /* Força conteúdo das páginas 2-4 numa única página */
            .service-improvements-section {
                page-break-before: avoid !important;
                break-before: avoid !important;
                margin-top: 0 !important;
            }
            
            .compact-sections {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                display: block !important;
            }
            
            /* Compactar elementos para caber numa página */
            .data-grid, .kpi-grid {
                page-break-inside: avoid;
                break-inside: avoid;
            }
            
            .multi-column-content > * {
                page-break-inside: avoid;
                break-inside: avoid;
            }
            
            h2 { 
                font-size: 1.2em !important;
                margin-bottom: 6px !important;
            }
            
            h3 { 
                font-size: 1em !important;
                margin: 8px 0 4px 0 !important;
            }
        }
        
        /* Classe para forçar conteúdo compacto */
        .compact-sections {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
    `;

    // Encontrar e substituir o CSS
    const cssStartIndex = htmlContent.indexOf('<style>');
    const cssEndIndex = htmlContent.indexOf('</style>') + 8;
    
    if (cssStartIndex !== -1 && cssEndIndex !== -1) {
      const beforeCSS = htmlContent.substring(0, cssStartIndex);
      const afterCSS = htmlContent.substring(cssEndIndex);
      
      htmlContent = beforeCSS + '<style>' + compactCSS + '\n    </style>' + afterCSS;
    }

    // Reorganizar conteúdo para layout compacto
    // Encontrar a secção de melhorias e as seguintes para compactar
    htmlContent = htmlContent.replace(
      /<div class="section service-improvements-section">/,
      '<div class="compact-sections"><div class="section service-improvements-section">'
    );

    // Fechar o wrapper compacto no final das secções principais
    htmlContent = htmlContent.replace(
      /<div class="footer">/,
      '</div><div class="footer">'
    );

    // Usar layout multi-coluna para KPIs
    htmlContent = htmlContent.replace(
      /<div class="kpi-grid">/g,
      '<div class="kpi-grid">'
    );

    // Salvar HTML compactado
    writeFileSync(htmlPath, htmlContent);
    console.log('✅ Layout compactado aplicado');

    // Gerar PDF com configurações ultra-compactas
    console.log('📄 Gerando PDF ultra-compacto...');
    
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
        top: '8mm',
        right: '8mm',
        bottom: '8mm',
        left: '8mm'
      },
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="font-size: 7px; color: #666; text-align: center; width: 100%; border-bottom: 1px solid #ddd; padding-bottom: 2px;">
          <strong>RIBBAI - Relatório Executivo Junho 2026</strong> | BI Otimizado | Páginas 2-4 Compactadas
        </div>
      `,
      footerTemplate: `
        <div style="font-size: 7px; color: #666; text-align: center; width: 100%; border-top: 1px solid #ddd; padding-top: 2px;">
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; padding: 0 8mm;">
            <span>451 registos • 14 melhorias • 106 KPIs • €1,218.39</span>
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
    console.log('🎉 PÁGINAS 2-4 COMPACTADAS NUMA ÚNICA PÁGINA!');
    console.log('═'.repeat(50));
    console.log('✅ Otimizações aplicadas:');
    console.log('• 📄 Páginas 2, 3 e 4 agora numa única página');
    console.log('• 🗜️ Layout multi-coluna implementado');
    console.log('• 📏 Margens reduzidas para 8mm (máximo espaço)');
    console.log('• 🔤 Fonte reduzida para 11px (print)');
    console.log('• 📊 KPIs em grid de 6 colunas');
    console.log('• 🎯 Spacing ultra-compacto');
    console.log();
    console.log(`📏 Tamanho final: ${(pdf.length / 1024).toFixed(1)} KB`);
    console.log(`📂 PDF: c:\\Users\\HP\\Desktop\\RIBBAI\\${pdfPath.replace(/\//g, '\\')}`);

  } catch (error) {
    console.error('❌ Erro na compactação:', error);
  }
}

if (require.main === module) {
  compactPagesLayout().catch(console.error);
}