import { prisma } from '../lib/db';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { format, startOfMonth, endOfMonth } from 'date-fns';

async function generateBasicSummary() {
  console.log('🎯 BASIC EXECUTIVE SUMMARY - June 2026');
  console.log('═'.repeat(50));
  console.log();

  try {
    // Use June 2026
    const reportMonth = new Date(2026, 5, 1); // June 2026
    const monthStart = startOfMonth(reportMonth);
    const monthEnd = endOfMonth(reportMonth);
    
    console.log(`📊 Analysis Period: ${format(monthStart, 'dd/MM/yyyy')} - ${format(monthEnd, 'dd/MM/yyyy')}`);
    console.log();

    // 1. Get basic inventory data
    console.log('• Getting inventory data...');
    const inventoryItems = await prisma.inventoryItem.findMany({
      select: {
        name: true,
        currentStock: true,
        stockValue: true,
        category: true,
        status: true
      },
      where: {
        status: 'ACTIVE'
      }
    });
    
    const totalInventoryValue = inventoryItems.reduce((total, item) => {
      const value = item.stockValue || 0;
      return total + Number(value);
    }, 0);
    const categories = [...new Set(inventoryItems.map(item => item.category))];
    
    console.log(`✓ Inventory: €${Number(totalInventoryValue).toFixed(2)} (${inventoryItems.length} items, ${categories.length} categories)`);

    // 2. Get operational notes
    console.log('• Counting operational records...');
    const operationalNotes = await prisma.operationalNote.count({
      where: {
        reportDate: {
          gte: monthStart,
          lte: monthEnd
        }
      }
    });
    
    console.log(`✓ Operational Records: ${operationalNotes} notes logged`);

    // 3. Get service improvements
    console.log('• Counting service improvements...');
    const serviceImprovements = await prisma.serviceImprovement.count({
      where: {
        reportDate: {
          gte: monthStart,
          lte: monthEnd
        }
      }
    });
    
    console.log(`✓ Service Improvements: ${serviceImprovements} initiatives tracked`);

    // 4. Get KPI snapshots
    console.log('• Getting KPI data...');
    const kpiCount = await prisma.kPISnapshot.count({
      where: {
        date: {
          gte: monthStart,
          lte: monthEnd
        }
      }
    });
    
    console.log(`✓ KPI Snapshots: ${kpiCount} metrics recorded`);

    // 5. Get team feedback
    console.log('• Getting team feedback...');
    const teamFeedback = await prisma.teamFeedback.count({
      where: {
        reportDate: {
          gte: monthStart,
          lte: monthEnd
        }
      }
    });
    
    console.log(`✓ Team Feedback: ${teamFeedback} feedback entries`);

    // Generate simple summary
    const summaryData = {
      inventoryValue: totalInventoryValue,
      inventoryItems: inventoryItems.length,
      categories: categories.length,
      operationalNotes,
      serviceImprovements,
      kpiCount,
      teamFeedback,
      monthStart,
      monthEnd
    };

    // 6. Generate HTML report
    console.log('• Generating HTML report...');
    const htmlContent = generateBasicHTML(summaryData);

    // 7. Save HTML file
    const reportsDir = './reports/monthly';
    mkdirSync(reportsDir, { recursive: true });
    
    const filename = `basic-executive-summary-${format(reportMonth, 'yyyy-MM')}.html`;
    const filepath = join(reportsDir, filename);
    
    writeFileSync(filepath, htmlContent, 'utf-8');

    console.log();
    console.log('📁 BASIC EXECUTIVE SUMMARY GENERATED!');
    console.log(`  - File: ${filename}`);
    console.log(`  - Location: ${filepath}`);
    console.log(`  - Size: ${(htmlContent.length / 1024).toFixed(1)}KB`);
    console.log();
    console.log('🎉 SUCCESS! Your executive summary is ready to view.');

  } catch (error) {
    console.error('❌ Error generating summary:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

function generateBasicHTML(data: any): string {
  return `<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RIBBAI - Executive Summary ${format(data.monthStart, 'MMMM yyyy')}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        
        .header h1 {
            margin: 0 0 10px 0;
            font-size: 2.5em;
            font-weight: 300;
        }
        
        .header .subtitle {
            opacity: 0.9;
            font-size: 1.2em;
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 30px;
            padding: 40px;
        }
        
        .metric-card {
            background: #f8f9fa;
            border-radius: 15px;
            padding: 30px;
            text-align: center;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            border: 2px solid transparent;
        }
        
        .metric-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 40px rgba(0,0,0,0.1);
            border-color: #ff6b35;
        }
        
        .metric-value {
            font-size: 2.5em;
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        .metric-label {
            color: #666;
            font-size: 1.1em;
            font-weight: 500;
        }
        
        .inventory-value { color: #17a2b8; }
        .operational-count { color: #6f42c1; }
        .improvements-count { color: #28a745; }
        .kpi-count { color: #ffc107; }
        .feedback-count { color: #fd7e14; }
        
        .summary-section {
            padding: 40px;
            background: #f8f9fa;
            margin: 20px 40px;
            border-radius: 15px;
        }
        
        .summary-section h2 {
            color: #ff6b35;
            margin-bottom: 20px;
            border-bottom: 2px solid #ff6b35;
            padding-bottom: 10px;
        }
        
        .data-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        
        .data-item {
            background: white;
            padding: 20px;
            border-radius: 10px;
            border-left: 4px solid #ff6b35;
        }
        
        .data-item h4 {
            margin: 0 0 10px 0;
            color: #333;
        }
        
        .data-item .value {
            font-size: 1.8em;
            font-weight: bold;
            color: #ff6b35;
        }
        
        .footer {
            text-align: center;
            padding: 30px;
            color: #666;
            border-top: 1px solid #eee;
        }
        
        .status-badge {
            display: inline-block;
            padding: 5px 15px;
            border-radius: 25px;
            font-weight: bold;
            font-size: 0.9em;
            margin-top: 10px;
        }
        
        .status-active {
            background: #d4edda;
            color: #155724;
        }
        
        .status-tracking {
            background: #cce5ff;
            color: #004085;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>RIBBAI Executive Summary</h1>
            <div class="subtitle">Junho 2026 - Dados Operacionais</div>
        </div>
        
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value inventory-value">€${data.inventoryValue.toFixed(0)}</div>
                <div class="metric-label">
                    Valor do Inventário
                    <div class="status-badge status-active">${data.inventoryItems} ITENS ATIVOS</div>
                </div>
            </div>
            
            <div class="metric-card">
                <div class="metric-value operational-count">${data.operationalNotes}</div>
                <div class="metric-label">
                    Registos Operacionais
                    <div class="status-badge status-tracking">DOCUMENTAÇÃO COMPLETA</div>
                </div>
            </div>
            
            <div class="metric-card">
                <div class="metric-value improvements-count">${data.serviceImprovements}</div>
                <div class="metric-label">
                    Melhorias de Serviço
                    <div class="status-badge status-active">INICIATIVAS ATIVAS</div>
                </div>
            </div>
            
            <div class="metric-card">
                <div class="metric-value kpi-count">${data.kpiCount}</div>
                <div class="metric-label">
                    KPIs Monitorizados
                    <div class="status-badge status-tracking">MÉTRICAS ATIVAS</div>
                </div>
            </div>
            
            <div class="metric-card">
                <div class="metric-value feedback-count">${data.teamFeedback}</div>
                <div class="metric-label">
                    Feedback da Equipa
                    <div class="status-badge status-active">COMUNICAÇÃO ATIVA</div>
                </div>
            </div>
        </div>
        
        <div class="summary-section">
            <h2>📊 Resumo Executivo de Junho 2026</h2>
            
            <div class="data-grid">
                <div class="data-item">
                    <h4>💰 Gestão Financeira</h4>
                    <div class="value">€${data.inventoryValue.toFixed(2)}</div>
                    <p>Valor total do inventário em ${data.categories} categorias operacionais</p>
                </div>
                
                <div class="data-item">
                    <h4>📋 Atividade Operacional</h4>
                    <div class="value">${data.operationalNotes}</div>
                    <p>Registos operacionais documentados ao longo do mês</p>
                </div>
                
                <div class="data-item">
                    <h4>🚀 Desenvolvimento</h4>
                    <div class="value">${data.serviceImprovements}</div>
                    <p>Iniciativas de melhoria implementadas</p>
                </div>
                
                <div class="data-item">
                    <h4>📈 Monitorização</h4>
                    <div class="value">${data.kpiCount}</div>
                    <p>Indicadores de performance registados</p>
                </div>
                
                <div class="data-item">
                    <h4>👥 Equipa</h4>
                    <div class="value">${data.teamFeedback}</div>
                    <p>Contribuições e feedback da equipa</p>
                </div>
            </div>
            
            <h3>🎯 Análise de Desempenho</h3>
            <ul>
                <li><strong>Gestão de Inventário:</strong> Sistema CMP ativo com €${data.inventoryValue.toFixed(2)} em stock controlado</li>
                <li><strong>Documentação Operacional:</strong> ${data.operationalNotes} registos detalhados garantem rastreabilidade completa</li>
                <li><strong>Melhoria Contínua:</strong> ${data.serviceImprovements} iniciativas demonstram foco na excelência operacional</li>
                <li><strong>Monitorização de KPIs:</strong> ${data.kpiCount} métricas ativas para decisões baseadas em dados</li>
                <li><strong>Envolvimento da Equipa:</strong> ${data.teamFeedback} contribuições refletem cultura de comunicação aberta</li>
            </ul>
            
            <h3>📌 Pontos-Chave</h3>
            <ul>
                <li>✅ Sistema de BI completamente funcional e a capturar dados operacionais</li>
                <li>✅ Inventário valorizado e controlado através do sistema CMP</li>
                <li>✅ Documentação operacional consistente e detalhada</li>
                <li>✅ Cultura de melhoria contínua estabelecida</li>
                <li>✅ Monitorização ativa de indicadores de performance</li>
            </ul>
        </div>
        
        <div class="footer">
            <p><strong>Relatório gerado em:</strong> ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
            <p><strong>Período de análise:</strong> ${format(data.monthStart, 'dd/MM/yyyy')} - ${format(data.monthEnd, 'dd/MM/yyyy')}</p>
            <p><em>Sistema RIBBAI Business Intelligence - Dados operacionais do restaurante</em></p>
        </div>
    </div>
</body>
</html>`;
}

// Run the generator
generateBasicSummary().catch(console.error);