/**
 * RIBBAI 2.0 Executive Manual - PDF Generator
 * Premium Corporate Document Generator using Puppeteer
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;

async function generateExecutivePDF() {
    let browser;
    
    try {
        console.log('🚀 Iniciando geração do PDF Executivo RIBBAI 2.0...');
        
        // Launch browser with specific settings for high-quality PDF
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-web-security',
                '--allow-running-insecure-content'
            ]
        });

        const page = await browser.newPage();

        // Set viewport for consistent rendering
        await page.setViewport({
            width: 1200,
            height: 1600,
            deviceScaleFactor: 2 // Higher DPI for better quality
        });

        // Get the HTML file path
        const htmlPath = path.join(__dirname, 'html', 'index.html');
        const htmlUrl = `file://${htmlPath.replace(/\\/g, '/')}`;
        
        console.log('📄 Carregando documento HTML...');
        
        // Navigate to HTML document
        await page.goto(htmlUrl, {
            waitUntil: ['networkidle0', 'domcontentloaded'],
            timeout: 60000
        });

        // Wait for fonts to load
        await page.evaluateHandle('document.fonts.ready');
        
        // Wait for any dynamic content and animations
        await page.waitForTimeout(3000);

        // Inject additional CSS for print optimization
        await page.addStyleTag({
            content: `
                @media print {
                    * {
                        -webkit-print-color-adjust: exact !important;
                        color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    
                    body {
                        margin: 0;
                        padding: 0;
                    }
                    
                    .page {
                        page-break-after: always;
                        page-break-inside: avoid;
                        margin: 0;
                        padding: 20mm;
                        min-height: calc(297mm - 40mm);
                        box-sizing: border-box;
                    }
                    
                    .page:last-child {
                        page-break-after: avoid;
                    }
                    
                    .card, .kpi-card {
                        page-break-inside: avoid;
                        margin-bottom: 1rem;
                    }
                    
                    .timeline-item {
                        page-break-inside: avoid;
                    }
                    
                    .table-container {
                        page-break-inside: avoid;
                    }
                    
                    .kpi-grid {
                        page-break-inside: avoid;
                    }
                    
                    svg {
                        max-width: 100%;
                        height: auto;
                    }
                    
                    /* Ensure gradients and colors are preserved */
                    .hero-title, h1, h2 {
                        background: linear-gradient(135deg, #1e293b 0%, #0d9488 100%);
                        -webkit-background-clip: text !important;
                        -webkit-text-fill-color: transparent !important;
                        background-clip: text !important;
                    }
                    
                    /* Fix for shadows and effects */
                    .card, .kpi-card {
                        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
                    }
                }
            `
        });

        console.log('🖨️ Gerando PDF com configurações premium...');

        // Generate PDF with high-quality settings
        const pdfPath = path.join(__dirname, 'pdf', 'RIBBAI_2.0_EXECUTIVE_MANUAL.pdf');
        
        await page.pdf({
            path: pdfPath,
            format: 'A4',
            printBackground: true,
            preferCSSPageSize: true,
            displayHeaderFooter: true,
            headerTemplate: '<div></div>',
            footerTemplate: `
                <div style="font-size: 9px; text-align: center; width: 100%; color: #64748b; margin-top: 5mm;">
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0 15mm;">
                        <span>RIBBAI 2.0 • Manual Executivo</span>
                        <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
                        <span>Junho 2026</span>
                    </div>
                </div>
            `,
            margin: {
                top: '15mm',
                right: '12mm', 
                bottom: '18mm',
                left: '12mm'
            },
            // Enhanced quality settings for institutional PDF
            quality: 100,
            timeout: 120000,
            omitBackground: false,
            tagged: true,
            // Ensure proper scaling for high-resolution displays
            scale: 1.0,
            // Optimize for print
            landscape: false
        });

        console.log('✅ PDF gerado com sucesso!');
        console.log(`📁 Localização: ${pdfPath}`);
        
        // Get file size for confirmation
        const stats = await fs.stat(pdfPath);
        const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
        console.log(`📊 Tamanho do arquivo: ${fileSizeInMB} MB`);

        // Generate HTML preview version as well
        const previewPath = path.join(__dirname, 'pdf', 'RIBBAI_2.0_PREVIEW.html');
        const htmlContent = await fs.readFile(htmlPath, 'utf8');
        await fs.writeFile(previewPath, htmlContent);
        
        console.log('📋 Preview HTML copiado para pasta PDF');
        console.log(`📁 Preview: ${previewPath}`);

        return {
            success: true,
            pdfPath,
            previewPath,
            fileSize: fileSizeInMB
        };

    } catch (error) {
        console.error('❌ Erro na geração do PDF:', error);
        return {
            success: false,
            error: error.message
        };
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Additional utility function to validate PDF generation
async function validatePDF(pdfPath) {
    try {
        const stats = await fs.stat(pdfPath);
        return {
            exists: true,
            size: stats.size,
            sizeInMB: (stats.size / (1024 * 1024)).toFixed(2),
            created: stats.birthtime,
            modified: stats.mtime
        };
    } catch (error) {
        return {
            exists: false,
            error: error.message
        };
    }
}

// Function to create package.json if it doesn't exist
async function ensurePackageJson() {
    const packagePath = path.join(__dirname, 'package.json');
    
    try {
        await fs.access(packagePath);
        console.log('📦 package.json encontrado');
    } catch (error) {
        console.log('📦 Criando package.json...');
        
        const packageJson = {
            name: "ribbai-executive-manual",
            version: "1.0.0",
            description: "RIBBAI 2.0 Executive Manual PDF Generator",
            main: "generate-pdf.js",
            scripts: {
                "generate": "node generate-pdf.js",
                "install-deps": "npm install puppeteer",
                "build": "npm run install-deps && npm run generate"
            },
            dependencies: {
                "puppeteer": "^21.0.0"
            },
            keywords: ["pdf", "executive", "manual", "ribbai"],
            author: "RIBBAI Team"
        };
        
        await fs.writeFile(packagePath, JSON.stringify(packageJson, null, 2));
        console.log('✅ package.json criado');
    }
}

// Main execution
async function main() {
    console.log('🎯 RIBBAI 2.0 Executive Manual - PDF Generator');
    console.log('================================================');
    
    // Ensure package.json exists
    await ensurePackageJson();
    
    // Generate PDF
    const result = await generateExecutivePDF();
    
    if (result.success) {
        console.log('\n🎉 GERAÇÃO CONCLUÍDA COM SUCESSO!');
        console.log('=================================');
        console.log(`📄 PDF: ${result.pdfPath}`);
        console.log(`🌐 Preview: ${result.previewPath}`);
        console.log(`📊 Tamanho: ${result.fileSize} MB`);
        
        // Validate the generated PDF
        const validation = await validatePDF(result.pdfPath);
        if (validation.exists) {
            console.log(`✅ PDF validado - ${validation.sizeInMB} MB`);
            console.log(`📅 Criado em: ${validation.created.toLocaleString('pt-PT')}`);
        }
        
        console.log('\n📋 PRÓXIMOS PASSOS:');
        console.log('- Revisar o PDF gerado');
        console.log('- Verificar qualidade de impressão');
        console.log('- Testar links internos');
        console.log('- Validar formatação em diferentes visualizadores');
        
    } else {
        console.log('\n❌ ERRO NA GERAÇÃO');
        console.log('==================');
        console.log(`Erro: ${result.error}`);
        console.log('\n🔧 SUGESTÕES:');
        console.log('- Verificar se o arquivo HTML existe');
        console.log('- Instalar dependências: npm install puppeteer');
        console.log('- Verificar permissões de escrita na pasta PDF');
    }
}

// Execute if run directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    generateExecutivePDF,
    validatePDF,
    ensurePackageJson
};