import { prisma } from '../lib/db';
import { HealthScoreService } from '../features/business-intelligence/services/health-score';
import { FinancialKPIService } from '../features/business-intelligence/services/financial-kpis';
import { OperationalKPIService } from '../features/business-intelligence/services/operational-kpis';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { format, startOfMonth, endOfMonth } from 'date-fns';

async function generateSimpleExecutiveSummary() {
  console.log('🎯 SIMPLE EXECUTIVE SUMMARY - June 2026');
  console.log('═'.repeat(50));
  console.log();

  try {
    // Use June 2026
    const reportMonth = new Date(2026, 5, 1); // June 2026
    const monthStart = startOfMonth(reportMonth);
    const monthEnd = endOfMonth(reportMonth);
    
    console.log(`📊 Analysis Period: ${format(monthStart, 'dd/MM/yyyy')} - ${format(monthEnd, 'dd/MM/yyyy')}`);
    console.log();

    // 1. Get basic health score
    console.log('• Calculating restaurant health score...');
    const healthResult = await HealthScoreService.calculateHealthScore(monthEnd);
    console.log(`✓ Health Score: ${healthResult.overallScore.toFixed(1)}/100 (${healthResult.trend})`);

    // 2. Get current inventory value (simplified)
    console.log('• Getting inventory summary...');
    const inventoryItems = await prisma.inventoryItem.findMany({
      select: {
        id: true,
        name: true,
        currentStock: true,
        unitCost: true,
        category: true
      }
    });
    
    const totalInventoryValue = inventoryItems.reduce((total, item) => 
      total + (item.currentStock * item.unitCost), 0
    );
    
    console.log(`✓ Inventory: €${totalInventoryValue.toFixed(2)} (${inventoryItems.length} items)`);

    // 3. Get operational records count
    console.log('• Counting operational records...');
    const operationalNotes = await prisma.operationalNote.count({
      where: {
        date: {
          gte: monthStart,
          lte: monthEnd
        }
      }
    });
    
    const incidents = await prisma.operationalNote.count({
      where: {
        date: {
          gte: monthStart,
          lte: monthEnd
        },
        content: {
          contains: 'incident'
        }
      }
    });

    console.log(`✓ Operational Records: ${operationalNotes} notes, ${incidents} incidents`);

    // 4. Generate simple HTML report
    console.log('• Generating executive summary HTML...');
    
    const htmlContent = generateExecutiveHTML({
      healthScore: healthResult.overallScore,
      healthTrend: healthResult.trend,
      inventoryValue: totalInventoryValue,
      inventoryItems: inventoryItems.length,
      operationalNotes,
      incidents,
      monthStart,
      monthEnd,
      categories: [...new Set(inventoryItems.map(item => item.category))].length
    });

    // 5. Save HTML file
    const reportsDir = './reports/monthly';
    mkdirSync(reportsDir, { recursive: true });
    
    const filename = `executive-summary-${format(reportMonth, 'yyyy-MM')}.html`;
    const filepath = join(reportsDir, filename);
    
    writeFileSync(filepath, htmlContent, 'utf-8');

    console.log();
    console.log('📁 EXECUTIVE SUMMARY GENERATED!');
    console.log(`  - File: ${filename}`);
    console.log(`  - Location: ${filepath}`);
    console.log(`  - Size: ${(htmlContent.length / 1024).toFixed(1)}KB`);
    console.log();
    console.log('🎉 SUCCESS! Open the HTML file to view your executive summary.');

  } catch (error) {
    console.error('❌ Error generating executive summary:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

function generateExecutiveHTML(data: any): string {
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
        
        .health-score {
            color: ${data.healthScore >= 80 ? '#28a745' : data.healthScore >= 60 ? '#ffc107' : '#dc3545'};
        }
        
        .inventory-value {
            color: #17a2b8;
        }
        
        .operational-count {
            color: #6f42c1;
        }
        
        .incidents-count {
            color: ${data.incidents > 5 ? '#dc3545' : data.incidents > 2 ? '#ffc107' : '#28a745'};
        }
        
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
        
        .status-indicator {
            display: inline-block;
            padding: 5px 15px;
            border-radius: 25px;
            font-weight: bold;
            margin-left: 10px;
        }
        
        .status-excellent {
            background: #d4edda;
            color: #155724;
        }
        
        .status-good {
            background: #fff3cd;
            color: #856404;
        }
        
        .status-attention {
            background: #f8d7da;
            color: #721c24;
        }
        
        .footer {
            text-align: center;
            padding: 30px;
            color: #666;
            border-top: 1px solid #eee;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>RIBBAI Executive Summary</h1>
            <div class="subtitle">${format(data.monthStart, 'MMMM yyyy', { locale: { localize: { month: (n: number) => ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][n] } } })}</div>
        </div>
        
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value health-score">${data.healthScore.toFixed(1)}</div>
                <div class="metric-label">
                    Health Score
                    <span class="status-indicator ${data.healthScore >= 80 ? 'status-excellent' : data.healthScore >= 60 ? 'status-good' : 'status-attention'}">
                        ${data.healthTrend.toUpperCase()}
                    </span>
                </div>
            </div>
            
            <div class="metric-card">
                <div class="metric-value inventory-value">€${data.inventoryValue.toFixed(0)}</div>
                <div class="metric-label">Inventory Value<br><small>${data.inventoryItems} items, ${data.categories} categories</small></div>
            </div>
            
            <div class="metric-card">
                <div class="metric-value operational-count">${data.operationalNotes}</div>
                <div class="metric-label">Operational Records</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-value incidents-count">${data.incidents}</div>
                <div class="metric-label">
                    Incidents Reported
                    <span class="status-indicator ${data.incidents > 5 ? 'status-attention' : data.incidents > 2 ? 'status-good' : 'status-excellent'}">
                        ${data.incidents > 5 ? 'HIGH' : data.incidents > 2 ? 'MODERATE' : 'LOW'}
                    </span>
                </div>
            </div>
        </div>
        
        <div class="summary-section">
            <h2>📊 Executive Overview</h2>
            <p><strong>Period Analysis:</strong> ${format(data.monthStart, 'dd/MM/yyyy')} - ${format(data.monthEnd, 'dd/MM/yyyy')}</p>
            
            <h3>🎯 Key Performance Indicators</h3>
            <ul>
                <li><strong>Restaurant Health Score:</strong> ${data.healthScore.toFixed(1)}/100 - ${getHealthDescription(data.healthScore)}</li>
                <li><strong>Operational Activity:</strong> ${data.operationalNotes} records logged with ${data.incidents} incidents</li>
                <li><strong>Financial Position:</strong> €${data.inventoryValue.toFixed(2)} in current inventory</li>
                <li><strong>Data Coverage:</strong> Comprehensive tracking across ${data.categories} operational categories</li>
            </ul>
            
            <h3>📈 Strategic Insights</h3>
            <ul>
                ${getStrategicInsights(data).map(insight => `<li>${insight}</li>`).join('')}
            </ul>
        </div>
        
        <div class="footer">
            <p>Generated on ${format(new Date(), 'dd/MM/yyyy HH:mm')} | RIBBAI Business Intelligence Platform</p>
            <p><em>This is a simplified executive summary. Complete BI reports available upon request.</em></p>
        </div>
    </div>
</body>
</html>`;
}

function getHealthDescription(score: number): string {
  if (score >= 85) return 'Excellent operational performance';
  if (score >= 75) return 'Good performance with minor improvements needed';
  if (score >= 65) return 'Satisfactory performance, attention required';
  if (score >= 50) return 'Below expectations, immediate action needed';
  return 'Critical performance issues require urgent intervention';
}

function getStrategicInsights(data: any): string[] {
  const insights = [];
  
  if (data.healthScore >= 80) {
    insights.push('🟢 Exceptional operational standards maintained consistently');
  } else if (data.healthScore >= 65) {
    insights.push('🟡 Performance within acceptable range with optimization opportunities');
  } else {
    insights.push('🔴 Performance below target - strategic review recommended');
  }
  
  if (data.incidents === 0) {
    insights.push('🟢 Zero incidents recorded - excellent safety and quality protocols');
  } else if (data.incidents <= 3) {
    insights.push('🟡 Minimal incidents recorded - continue monitoring preventive measures');
  } else {
    insights.push('🔴 Multiple incidents require immediate operational review');
  }
  
  insights.push(`💼 Inventory management stable with €${data.inventoryValue.toFixed(0)} asset value`);
  insights.push(`📋 Strong operational documentation with ${data.operationalNotes} detailed records`);
  
  return insights;
}

// Run the generator
generateSimpleExecutiveSummary().catch(console.error);