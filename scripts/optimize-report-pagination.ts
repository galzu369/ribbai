import { readFileSync, writeFileSync } from 'fs';
import puppeteer from 'puppeteer';
import { join } from 'path';

async function optimizeReportPagination() {
  console.log('📄 OTIMIZANDO PAGINAÇÃO DO RELATÓRIO EXECUTIVO');
  console.log('═'.repeat(50));

  try {
    const htmlPath = join('reports', 'monthly', 'ribbai-executive-complete-2026-06.html');
    let htmlContent = readFileSync(htmlPath, 'utf8');

    console.log('📝 Aplicando otimizações de paginação...');

    // Melhorar CSS para controle de páginas mais preciso
    const enhancedCSS = `
        /* Controle avançado de paginação */
        @media print {
            .page-break-before {
                page-break-before: always !important;
                break-before: page !important;
            }
            
            .page-break-after {
                page-break-after: always !important;
                break-after: page !important;
            }
            
            .no-page-break {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
            }
            
            .metrics-overview {
                page-break-after: always !important;
                break-after: page !important;
            }
            
            /* Garantir que melhorias começam na página 3 */
            .service-improvements-section {
                page-break-before: always !important;
                break-before: page !important;
                margin-top: 0 !important;
                padding-top: 20px !important;
            }
            
            /* Evitar quebras indesejadas */
            .data-grid {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
            }
            
            .metric-card {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
            }
        }
        
        /* Estilos para visualização web */
        @media screen {
            .service-improvements-section {
                margin-top: 80px;
                padding-top: 40px;
                border-top: 4px solid #28a745;
                background: linear-gradient(135deg, #f8fff8 0%, #e8f5e8 100%);
            }
            
            .page-indicator {
                position: relative;
                color: #666;
                font-size: 0.9em;
                margin-bottom: 20px;
                text-align: center;
                padding: 10px;
                background: #f0f0f0;
                border-radius: 5px;
            }
        }
    `;

    // Substituir a secção de melhorias com classe específica e indicador de página
    htmlContent = htmlContent.replace(
      '<div class="section page-break-before">',
      '<div class="section service-improvements-section">'
    );

    // Adicionar indicador de página 3 para melhorias
    htmlContent = htmlContent.replace(
      '<h2>🎯 Análise de Melhorias de Serviço</h2>',
      `<div class="page-indicator">📋 PÁGINA 3 - ANÁLISE ESTRATÉGICA</div>
            <h2>🎯 Análise de Melhorias de Serviço</h2>`
    );

    // Adicionar CSS melhorado
    htmlContent = htmlContent.replace(
      '</style>',
      enhancedCSS + '\n    </style>'
    );

    // Salvar HTML otimizado
    writeFileSync(htmlPath, htmlContent);
    console.log('✅ HTML otimizado salvo');

    // Gerar PDF com configurações otimizadas para paginação
    console.log('📄 Gerando PDF com paginação otimizada...');
    
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // Configurar página para melhor renderização
    await page.setViewport({ width: 1200, height: 1600 });
    await page.setContent(htmlContent, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });

    // Aguardar renderização completa
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Gerar PDF com configurações otimizadas
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: '15mm',
        right: '12mm',
        bottom: '15mm',
        left: '12mm'
      },
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="font-size: 9px; color: #666; text-align: center; width: 100%; margin: 0;">
          <div style="border-bottom: 1px solid #ddd; padding-bottom: 5px;">
            <strong>RIBBAI - Relatório Executivo Completo</strong> | Junho 2026 | Sistema BI Otimizado
          </div>
        </div>
      `,
      footerTemplate: `
        <div style="font-size: 9px; color: #666; text-align: center; width: 100%; margin: 0; border-top: 1px solid #ddd; padding-top: 5px;">
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; padding: 0 15mm;">
            <span>451 registos • 14 melhorias • 106 KPIs • €1,218.39 inventário</span>
            <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
            <span>Gerado: ${new Date().toLocaleDateString('pt-PT', { 
              day: '2-digit', 
              month: '2-digit', 
              year: 'numeric' 
            })}</span>
          </div>
        </div>
      `
    });

    await browser.close();

    // Salvar PDF otimizado
    const pdfPath = join('reports', 'monthly', 'ribbai-executive-complete-2026-06.pdf');
    writeFileSync(pdfPath, pdf);

    console.log();
    console.log('🎉 FORMATAÇÃO OTIMIZADA CONCLUÍDA!');
    console.log('═'.repeat(50));
    console.log('📋 Melhorias aplicadas:');
    console.log('• ✅ Secção "Análise de Melhorias" começa na Página 3');
    console.log('• ✅ Indicador de página adicionado');  
    console.log('• ✅ Quebras de página otimizadas');
    console.log('• ✅ Cabeçalhos e rodapés profissionais');
    console.log('• ✅ Margens ajustadas para melhor legibilidade');
    console.log();
    console.log(`📂 Localização dos ficheiros atualizados:`);
    console.log(`   HTML: c:\\Users\\HP\\Desktop\\RIBBAI\\${htmlPath.replace(/\//g, '\\')}`);
    console.log(`   PDF:  c:\\Users\\HP\\Desktop\\RIBBAI\\${pdfPath.replace(/\//g, '\\')}`);
    console.log();
    console.log(`📏 Tamanho do PDF: ${(pdf.length / 1024).toFixed(1)} KB`);

  } catch (error) {
    console.error('❌ Erro na otimização:', error);
  }
}

if (require.main === module) {
  optimizeReportPagination().catch(console.error);
}