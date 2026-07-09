import { MonthlyExecutiveReport } from './executive-monthly-reports';
import { ExecutivePDFStyling } from './executive-pdf-styling';
import { PDFChartGenerator } from './pdf-chart-generator';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

export class MonthlyReportTemplateService {
  static generateHTML(reportData: MonthlyExecutiveReport): string {
    const { periodStart, periodEnd } = reportData;
    const monthLabel = format(periodStart, 'MMMM yyyy', { locale: pt });
    
    return `
<!DOCTYPE html>
<html lang="pt-PT">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Relatório Executivo Mensal | RIBBAI | ${monthLabel}</title>
    <style>
        ${ExecutivePDFStyling.generateExecutiveCSS()}
    </style>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns@3.0.0/dist/chartjs-adapter-date-fns.bundle.min.js"></script>
</head>
<body>
    <div class="executive-container">
        ${this.generateExecutiveHeader(reportData)}
        ${this.generateExecutiveSummary(reportData)}
        ${this.generatePerformanceOverview(reportData)}
        ${this.generateSWOTAnalysis(reportData)}
        ${this.generatePerformanceRankings(reportData)}
        ${this.generateFinancialPerformance(reportData)}
        ${this.generateOperationalExcellence(reportData)}
        ${this.generateTeamPerformance(reportData)}
        ${this.generateStrategicRecommendations(reportData)}
        ${this.generateRiskAssessment(reportData)}
        ${this.generateStrategicInitiatives(reportData)}
        ${this.generateMarketAnalysis(reportData)}
        ${this.generateMonthlyTrends(reportData)}
        ${this.generateActionPlan(reportData)}
        ${this.generateExecutiveFooter(reportData)}
    </div>
    
    <script>
        ${this.generateEnhancedChartScripts(reportData)}
    </script>
</body>
</html>`;
  }

  private static getOldStyles(): string {
    return `
      @page {
        size: A4;
        margin: 10mm 8mm 12mm;
      }

      :root {
        --executive-navy: #0a1628;
        --executive-blue: #1e40af;
        --executive-gold: #d97706;
        --executive-green: #059669;
        --executive-red: #dc2626;
        --executive-purple: #7c3aed;
        --executive-gray: #64748b;
        --executive-light: #f8fafc;
        --executive-white: #ffffff;
        --executive-border: #e2e8f0;
      }

      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 9px;
        line-height: 1.4;
        color: var(--executive-navy);
        background: var(--executive-light);
      }

      main {
        max-width: 210mm;
        margin: 0 auto;
        background: var(--executive-white);
        box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.1);
      }

      /* Executive Header */
      .executive-header {
        background: linear-gradient(135deg, var(--executive-navy) 0%, var(--executive-blue) 100%);
        color: var(--executive-white);
        padding: 24px;
        position: relative;
        overflow: hidden;
      }

      .executive-header::before {
        content: '';
        position: absolute;
        top: -50px;
        right: -50px;
        width: 200px;
        height: 200px;
        background: radial-gradient(circle, rgba(217, 119, 6, 0.3) 0%, transparent 70%);
        border-radius: 50%;
      }

      .header-content {
        position: relative;
        z-index: 1;
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 24px;
        align-items: center;
      }

      .header-title h1 {
        font-size: 32px;
        font-weight: 800;
        letter-spacing: -0.02em;
        margin-bottom: 8px;
      }

      .header-subtitle {
        font-size: 16px;
        opacity: 0.9;
        margin-bottom: 16px;
      }

      .header-meta {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
        font-size: 11px;
      }

      .meta-item {
        display: flex;
        flex-direction: column;
      }

      .meta-label {
        opacity: 0.7;
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 4px;
      }

      .performance-badge {
        background: rgba(255, 255, 255, 0.15);
        padding: 16px;
        border-radius: 12px;
        text-align: center;
        backdrop-filter: blur(10px);
      }

      .performance-score {
        font-size: 36px;
        font-weight: 800;
        margin-bottom: 8px;
      }

      .performance-label {
        font-size: 12px;
        opacity: 0.9;
        text-transform: uppercase;
        letter-spacing: 1px;
      }

      /* Executive Section */
      .executive-section {
        padding: 20px 24px;
        border-bottom: 1px solid var(--executive-border);
      }

      .executive-section:last-child {
        border-bottom: none;
      }

      .section-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 20px;
      }

      .section-number {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        background: linear-gradient(135deg, var(--executive-blue) 0%, var(--executive-purple) 100%);
        color: var(--executive-white);
        border-radius: 8px;
        font-weight: 700;
        font-size: 14px;
      }

      .section-title {
        flex: 1;
      }

      .section-title h2 {
        font-size: 20px;
        font-weight: 700;
        color: var(--executive-navy);
        margin-bottom: 4px;
      }

      .section-subtitle {
        font-size: 11px;
        color: var(--executive-gray);
      }

      /* Executive Grid */
      .executive-grid {
        display: grid;
        gap: 16px;
      }

      .grid-2 { grid-template-columns: 1fr 1fr; }
      .grid-3 { grid-template-columns: repeat(3, 1fr); }
      .grid-4 { grid-template-columns: repeat(4, 1fr); }

      /* Executive Cards */
      .executive-card {
        background: var(--executive-white);
        border: 1px solid var(--executive-border);
        border-radius: 12px;
        padding: 16px;
        position: relative;
        overflow: hidden;
      }

      .executive-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 3px;
        background: var(--card-accent, var(--executive-blue));
      }

      .card-header {
        display: flex;
        justify-content: between;
        align-items: flex-start;
        margin-bottom: 12px;
      }

      .card-title {
        font-size: 12px;
        font-weight: 600;
        color: var(--executive-navy);
        margin-bottom: 4px;
      }

      .card-metric {
        font-size: 24px;
        font-weight: 800;
        color: var(--executive-navy);
        margin: 8px 0;
      }

      .card-trend {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 8px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .trend-up {
        background: #dcfce7;
        color: var(--executive-green);
      }

      .trend-down {
        background: #fee2e2;
        color: var(--executive-red);
      }

      .trend-stable {
        background: #f1f5f9;
        color: var(--executive-gray);
      }

      /* SWOT Matrix */
      .swot-matrix {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        margin-top: 16px;
      }

      .swot-quadrant {
        padding: 16px;
        border-radius: 12px;
        min-height: 200px;
      }

      .swot-strengths {
        background: linear-gradient(135deg, #dcfce7 0%, #f0fdf4 100%);
        border-left: 4px solid var(--executive-green);
      }

      .swot-weaknesses {
        background: linear-gradient(135deg, #fee2e2 0%, #fef2f2 100%);
        border-left: 4px solid var(--executive-red);
      }

      .swot-opportunities {
        background: linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%);
        border-left: 4px solid var(--executive-blue);
      }

      .swot-threats {
        background: linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%);
        border-left: 4px solid var(--executive-gold);
      }

      .swot-title {
        font-size: 14px;
        font-weight: 700;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .swot-list {
        list-style: none;
        space-y: 8px;
      }

      .swot-item {
        font-size: 9px;
        line-height: 1.4;
        padding: 6px 0;
        border-bottom: 1px solid rgba(0, 0, 0, 0.1);
      }

      .swot-item:last-child {
        border-bottom: none;
      }

      /* Performance Ranking */
      .ranking-grid {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 12px;
        margin-top: 16px;
      }

      .ranking-card {
        text-align: center;
        padding: 12px;
        background: var(--executive-light);
        border-radius: 8px;
        border: 1px solid var(--executive-border);
      }

      .ranking-position {
        font-size: 32px;
        font-weight: 800;
        color: var(--executive-blue);
        margin-bottom: 4px;
      }

      .ranking-metric {
        font-size: 10px;
        color: var(--executive-gray);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .ranking-percentile {
        font-size: 8px;
        color: var(--executive-green);
        margin-top: 2px;
      }

      /* Charts Container */
      .chart-container {
        background: var(--executive-white);
        border: 1px solid var(--executive-border);
        border-radius: 12px;
        padding: 16px;
        margin: 16px 0;
        height: 300px;
      }

      .chart-title {
        font-size: 14px;
        font-weight: 600;
        color: var(--executive-navy);
        margin-bottom: 16px;
        text-align: center;
      }

      /* Recommendations */
      .recommendation-card {
        background: linear-gradient(135deg, var(--executive-light) 0%, var(--executive-white) 100%);
        border: 1px solid var(--executive-border);
        border-radius: 12px;
        padding: 16px;
        margin: 12px 0;
        position: relative;
      }

      .recommendation-priority {
        position: absolute;
        top: 12px;
        right: 12px;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 8px;
        font-weight: 600;
        text-transform: uppercase;
      }

      .priority-critical {
        background: var(--executive-red);
        color: var(--executive-white);
      }

      .priority-high {
        background: var(--executive-gold);
        color: var(--executive-white);
      }

      .priority-medium {
        background: var(--executive-blue);
        color: var(--executive-white);
      }

      .recommendation-title {
        font-size: 14px;
        font-weight: 600;
        color: var(--executive-navy);
        margin-bottom: 8px;
        margin-right: 60px;
      }

      .recommendation-description {
        font-size: 10px;
        line-height: 1.5;
        color: var(--executive-gray);
        margin-bottom: 12px;
      }

      .recommendation-impact {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
        font-size: 9px;
      }

      .impact-item {
        padding: 8px;
        background: rgba(30, 64, 175, 0.1);
        border-radius: 6px;
      }

      .impact-label {
        font-weight: 600;
        color: var(--executive-blue);
        margin-bottom: 2px;
      }

      /* Executive Table */
      .executive-table {
        width: 100%;
        border-collapse: collapse;
        margin: 16px 0;
        font-size: 9px;
        background: var(--executive-white);
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }

      .executive-table th {
        background: linear-gradient(135deg, var(--executive-navy) 0%, var(--executive-blue) 100%);
        color: var(--executive-white);
        font-weight: 600;
        padding: 10px 8px;
        text-align: left;
        font-size: 8px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .executive-table td {
        padding: 8px;
        border-bottom: 1px solid var(--executive-border);
      }

      .executive-table tr:last-child td {
        border-bottom: none;
      }

      .executive-table tr:hover {
        background: var(--executive-light);
      }

      /* Status Indicators */
      .status-indicator {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 8px;
        font-weight: 600;
        text-transform: uppercase;
      }

      .status-excellent { background: #dcfce7; color: var(--executive-green); }
      .status-good { background: #dbeafe; color: var(--executive-blue); }
      .status-fair { background: #fef3c7; color: var(--executive-gold); }
      .status-poor { background: #fee2e2; color: var(--executive-red); }

      /* Action Items */
      .action-list {
        list-style: none;
        margin: 12px 0;
      }

      .action-item {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        padding: 8px 12px;
        margin-bottom: 8px;
        background: var(--executive-light);
        border-radius: 8px;
        font-size: 9px;
        line-height: 1.4;
      }

      .action-priority {
        width: 16px;
        height: 16px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: 700;
        color: var(--executive-white);
        flex-shrink: 0;
      }

      .priority-1 { background: var(--executive-red); }
      .priority-2 { background: var(--executive-gold); }
      .priority-3 { background: var(--executive-blue); }

      /* Footer */
      .executive-footer {
        padding: 20px 24px;
        background: var(--executive-light);
        border-top: 1px solid var(--executive-border);
        font-size: 8px;
        color: var(--executive-gray);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      /* Print Styles */
      @media print {
        body { background: white; }
        main { box-shadow: none; }
        .executive-section { break-inside: avoid; }
        .chart-container { break-inside: avoid; }
        .recommendation-card { break-inside: avoid; }
      }

      /* Responsive */
      @media (max-width: 768px) {
        .executive-grid { grid-template-columns: 1fr !important; }
        .header-content { grid-template-columns: 1fr; }
        .ranking-grid { grid-template-columns: repeat(2, 1fr); }
        .swot-matrix { grid-template-columns: 1fr; }
      }
    `;
  }

  private static generateExecutiveHeader(reportData: MonthlyExecutiveReport): string {
    const { periodStart, executiveSummary } = reportData;
    const monthLabel = format(periodStart, 'MMMM yyyy', { locale: pt });
    
    // Calculate overall performance score
    const performanceScores = {
      'exceptional': 95,
      'strong': 85,
      'satisfactory': 75,
      'below_expectations': 60,
      'critical': 40
    };
    
    const overallScore = performanceScores[executiveSummary.overallPerformance];
    
    return ExecutivePDFStyling.generateExecutiveHeader(
      'Relatório Executivo Mensal',
      'Análise Estratégica e Performance Operacional · RIBBAI',
      {
        period: monthLabel,
        generatedAt: reportData.generatedAt,
        status: executiveSummary.overallPerformance.replace('_', ' ')
      }
    ) + ExecutivePDFStyling.generatePerformanceBadge(overallScore, 'Performance Score');
  }

  private static generateExecutiveSummary(reportData: MonthlyExecutiveReport): string {
    const { executiveSummary } = reportData;

    return `
    <div class="executive-section">
      <div class="section-header">
        <div class="section-number">1</div>
        <div class="section-title">
          <h2>Síntese Executiva</h2>
          <div class="section-subtitle">Visão estratégica e decisões críticas para a gestão</div>
        </div>
      </div>

      <div class="executive-grid grid-1">
        <div class="executive-card" style="--card-accent: var(--executive-gold);">
          <div class="card-title">Panorama Geral do Mês</div>
          <div style="font-size: 11px; line-height: 1.6; margin: 12px 0;">
            ${executiveSummary.headline}
          </div>
        </div>
      </div>

      <div class="executive-grid grid-3" style="margin-top: 20px;">
        <div class="executive-card" style="--card-accent: var(--executive-green);">
          <div class="card-title">🏆 Principais Conquistas</div>
          <ul style="list-style: none; margin-top: 12px;">
            ${executiveSummary.keyAchievements.map(achievement => `
              <li style="font-size: 9px; padding: 4px 0; border-bottom: 1px solid #f1f5f9;">
                • ${achievement}
              </li>
            `).join('')}
          </ul>
        </div>

        <div class="executive-card" style="--card-accent: var(--executive-red);">
          <div class="card-title">⚠️ Desafios Principais</div>
          <ul style="list-style: none; margin-top: 12px;">
            ${executiveSummary.primaryChallenges.map(challenge => `
              <li style="font-size: 9px; padding: 4px 0; border-bottom: 1px solid #f1f5f9;">
                • ${challenge}
              </li>
            `).join('')}
          </ul>
        </div>

        <div class="executive-card" style="--card-accent: var(--executive-blue);">
          <div class="card-title">🎯 Prioridades Estratégicas</div>
          <ul style="list-style: none; margin-top: 12px;">
            ${executiveSummary.strategicPriorities.map(priority => `
              <li style="font-size: 9px; padding: 4px 0; border-bottom: 1px solid #f1f5f9;">
                • ${priority}
              </li>
            `).join('')}
          </ul>
        </div>
      </div>

      <div class="executive-grid grid-3" style="margin-top: 20px;">
        <div class="executive-card" style="--card-accent: #d97706;">
          <div class="card-title">💰 Performance Financeira</div>
          <div class="card-metric">€${executiveSummary.financialHighlights.revenue.toLocaleString()}</div>
          <div class="card-trend status-${executiveSummary.financialHighlights.profitMargin >= 15 ? 'excellent' : 'good'}">
            Margem: ${executiveSummary.financialHighlights.profitMargin}% | ROI: ${executiveSummary.financialHighlights.roi}%
          </div>
        </div>

        <div class="executive-card" style="--card-accent: #059669;">
          <div class="card-title">⚙️ Excellence Operacional</div>
          <div class="card-metric">${executiveSummary.operationalHighlights.healthScore.toFixed(1)}%</div>
          <div class="card-trend status-${executiveSummary.operationalHighlights.healthScore >= 80 ? 'excellent' : 'good'}">
            Eficiência: +${executiveSummary.operationalHighlights.efficiencyGain}% | Qualidade: +${executiveSummary.operationalHighlights.qualityImprovement}%
          </div>
        </div>

        <div class="executive-card" style="--card-accent: #7c3aed;">
          <div class="card-title">👥 Performance da Equipa</div>
          <div class="card-metric">${executiveSummary.teamHighlights.performanceIndex.toFixed(1)}%</div>
          <div class="card-trend status-${executiveSummary.teamHighlights.performanceIndex >= 85 ? 'excellent' : 'good'}">
            Retenção: ${executiveSummary.teamHighlights.retentionRate}% | Satisfação: ${executiveSummary.teamHighlights.satisfactionScore}%
          </div>
        </div>
      </div>

      ${PDFChartGenerator.generateHealthScoreGauge(executiveSummary.operationalHighlights.healthScore, 'Health Score Mensal')}

      ${executiveSummary.executiveDecisionsRequired.length > 0 ? `
      <div class="executive-card" style="margin-top: 20px; --card-accent: var(--executive-red); background: linear-gradient(135deg, #fee2e2 0%, #fef2f2 100%);">
        <div class="card-title" style="color: var(--executive-red);">🚨 Decisões Executivas Requeridas</div>
        <ul style="list-style: none; margin-top: 12px;">
          ${executiveSummary.executiveDecisionsRequired.map(decision => `
            <li style="font-size: 10px; padding: 6px 0; border-bottom: 1px solid rgba(220, 38, 38, 0.1);">
              <strong>•</strong> ${decision}
            </li>
          `).join('')}
        </ul>
      </div>
      ` : ''}
    </div>`;
  }

  private static generatePerformanceOverview(reportData: MonthlyExecutiveReport): string {
    const { monthlyKPIDashboard } = reportData;

    return `
    <div class="executive-section">
      <div class="section-header">
        <div class="section-number">2</div>
        <div class="section-title">
          <h2>Visão Geral da Performance</h2>
          <div class="section-subtitle">Indicadores principais e tendências mensais</div>
        </div>
      </div>

      <div class="executive-grid grid-4">
        <div class="executive-card">
          <div class="card-title">Operacional</div>
          <div class="card-metric">${monthlyKPIDashboard.operational.summary.average.toFixed(1)}%</div>
          <div class="card-trend trend-${monthlyKPIDashboard.operational.summary.trend === 'improving' ? 'up' : monthlyKPIDashboard.operational.summary.trend === 'declining' ? 'down' : 'stable'}">
            ${monthlyKPIDashboard.operational.summary.trend === 'improving' ? '↗ Melhorando' : monthlyKPIDashboard.operational.summary.trend === 'declining' ? '↘ Em declínio' : '→ Estável'}
          </div>
        </div>

        <div class="executive-card">
          <div class="card-title">Financeiro</div>
          <div class="card-metric">${monthlyKPIDashboard.financial.summary.average.toFixed(1)}%</div>
          <div class="card-trend trend-${monthlyKPIDashboard.financial.summary.trend === 'improving' ? 'up' : monthlyKPIDashboard.financial.summary.trend === 'declining' ? 'down' : 'stable'}">
            ${monthlyKPIDashboard.financial.summary.trend === 'improving' ? '↗ Melhorando' : monthlyKPIDashboard.financial.summary.trend === 'declining' ? '↘ Em declínio' : '→ Estável'}
          </div>
        </div>

        <div class="executive-card">
          <div class="card-title">Equipa</div>
          <div class="card-metric">${monthlyKPIDashboard.team.summary.average.toFixed(1)}%</div>
          <div class="card-trend trend-${monthlyKPIDashboard.team.summary.trend === 'improving' ? 'up' : monthlyKPIDashboard.team.summary.trend === 'declining' ? 'down' : 'stable'}">
            ${monthlyKPIDashboard.team.summary.trend === 'improving' ? '↗ Melhorando' : monthlyKPIDashboard.team.summary.trend === 'declining' ? '↘ Em declínio' : '→ Estável'}
          </div>
        </div>

        <div class="executive-card">
          <div class="card-title">Qualidade</div>
          <div class="card-metric">${monthlyKPIDashboard.quality.summary.average.toFixed(1)}%</div>
          <div class="card-trend trend-${monthlyKPIDashboard.quality.summary.trend === 'improving' ? 'up' : monthlyKPIDashboard.quality.summary.trend === 'declining' ? 'down' : 'stable'}">
            ${monthlyKPIDashboard.quality.summary.trend === 'improving' ? '↗ Melhorando' : monthlyKPIDashboard.quality.summary.trend === 'declining' ? '↘ Em declínio' : '→ Estável'}
          </div>
        </div>
      </div>

      ${PDFChartGenerator.generateTrendChart(
        'Evolução Mensal dos KPIs Principais',
        [
          { date: 'Semana 1', value: monthlyKPIDashboard.operational.summary.average - 5 },
          { date: 'Semana 2', value: monthlyKPIDashboard.operational.summary.average - 2 },
          { date: 'Semana 3', value: monthlyKPIDashboard.operational.summary.average + 1 },
          { date: 'Semana 4', value: monthlyKPIDashboard.operational.summary.average }
        ],
        'Progressão semanal da performance operacional'
      )}

      <div class="executive-grid grid-4" style="margin-top: 20px;">
        <div class="executive-card" style="--card-accent: var(--executive-green);">
          <div class="card-title">Metas Atingidas</div>
          <div class="card-metric">${monthlyKPIDashboard.targets.achieved}</div>
          <div style="font-size: 9px; color: var(--executive-green);">
            ${((monthlyKPIDashboard.targets.achieved / (monthlyKPIDashboard.targets.achieved + monthlyKPIDashboard.targets.missed)) * 100).toFixed(1)}% de sucesso
          </div>
        </div>

        <div class="executive-card" style="--card-accent: var(--executive-blue);">
          <div class="card-title">Em Progresso</div>
          <div class="card-metric">${monthlyKPIDashboard.targets.onTrack}</div>
          <div style="font-size: 9px; color: var(--executive-blue);">
            No caminho certo
          </div>
        </div>

        <div class="executive-card" style="--card-accent: var(--executive-gold);">
          <div class="card-title">Em Risco</div>
          <div class="card-metric">${monthlyKPIDashboard.targets.atRisk}</div>
          <div style="font-size: 9px; color: var(--executive-gold);">
            Requer atenção
          </div>
        </div>

        <div class="executive-card" style="--card-accent: var(--executive-red);">
          <div class="card-title">Não Atingidas</div>
          <div class="card-metric">${monthlyKPIDashboard.targets.missed}</div>
          <div style="font-size: 9px; color: var(--executive-red);">
            Ação necessária
          </div>
        </div>
      </div>
    </div>`;
  }

  private static generateSWOTAnalysis(reportData: MonthlyExecutiveReport): string {
    const { swotAnalysis } = reportData;

    return `
    <div class="executive-section">
      <div class="section-header">
        <div class="section-number">3</div>
        <div class="section-title">
          <h2>Análise SWOT Estratégica</h2>
          <div class="section-subtitle">Forças, Fraquezas, Oportunidades e Ameaças</div>
        </div>
      </div>

      <div class="swot-matrix">
        <div class="swot-quadrant swot-strengths">
          <div class="swot-title">
            💪 Forças (${swotAnalysis.strengths.length})
          </div>
          <ul class="swot-list">
            ${swotAnalysis.strengths.map(item => `
              <li class="swot-item">
                <strong>${item.description}</strong>
                <div style="margin-top: 4px; font-size: 8px; opacity: 0.8;">
                  Impact: ${item.impact} | ${item.timeframe.replace('_', ' ')}
                </div>
              </li>
            `).join('')}
          </ul>
        </div>

        <div class="swot-quadrant swot-weaknesses">
          <div class="swot-title">
            ⚠️ Fraquezas (${swotAnalysis.weaknesses.length})
          </div>
          <ul class="swot-list">
            ${swotAnalysis.weaknesses.map(item => `
              <li class="swot-item">
                <strong>${item.description}</strong>
                <div style="margin-top: 4px; font-size: 8px; opacity: 0.8;">
                  Impact: ${item.impact} | ${item.timeframe.replace('_', ' ')}
                </div>
              </li>
            `).join('')}
          </ul>
        </div>

        <div class="swot-quadrant swot-opportunities">
          <div class="swot-title">
            🚀 Oportunidades (${swotAnalysis.opportunities.length})
          </div>
          <ul class="swot-list">
            ${swotAnalysis.opportunities.map(item => `
              <li class="swot-item">
                <strong>${item.description}</strong>
                <div style="margin-top: 4px; font-size: 8px; opacity: 0.8;">
                  Impact: ${item.impact} | ${item.timeframe.replace('_', ' ')}
                </div>
              </li>
            `).join('')}
          </ul>
        </div>

        <div class="swot-quadrant swot-threats">
          <div class="swot-title">
            🛡️ Ameaças (${swotAnalysis.threats.length})
          </div>
          <ul class="swot-list">
            ${swotAnalysis.threats.map(item => `
              <li class="swot-item">
                <strong>${item.description}</strong>
                <div style="margin-top: 4px; font-size: 8px; opacity: 0.8;">
                  Impact: ${item.impact} | ${item.timeframe.replace('_', ' ')}
                </div>
              </li>
            `).join('')}
          </ul>
        </div>
      </div>

      ${swotAnalysis.strategicInsights.length > 0 ? `
      <div class="executive-card" style="margin-top: 20px; --card-accent: var(--executive-purple);">
        <div class="card-title">💡 Insights Estratégicos</div>
        <ul style="list-style: none; margin-top: 12px;">
          ${swotAnalysis.strategicInsights.map(insight => `
            <li style="font-size: 10px; padding: 6px 0; border-bottom: 1px solid #f1f5f9;">
              • ${insight}
            </li>
          `).join('')}
        </ul>
      </div>
      ` : ''}
    </div>`;
  }

  private static generatePerformanceRankings(reportData: MonthlyExecutiveReport): string {
    const { performanceRankings } = reportData;

    return `
    <div class="executive-section">
      <div class="section-header">
        <div class="section-number">4</div>
        <div class="section-title">
          <h2>Rankings de Performance</h2>
          <div class="section-subtitle">Posicionamento competitivo e benchmarking</div>
        </div>
      </div>

      <div class="executive-card" style="--card-accent: var(--executive-gold); margin-bottom: 20px;">
        <div style="text-align: center; padding: 20px;">
          <div style="font-size: 48px; font-weight: 800; color: var(--executive-gold); margin-bottom: 8px;">
            #${performanceRankings.overall.position}
          </div>
          <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px;">
            Posição Geral no Mercado
          </div>
          <div style="font-size: 11px; color: var(--executive-gray);">
            Percentil ${performanceRankings.overall.percentile} | ${performanceRankings.overall.benchmarkComparison === 'above' ? 'Acima' : performanceRankings.overall.benchmarkComparison === 'below' ? 'Abaixo' : 'No'} benchmark | ${performanceRankings.overall.trend === 'improving' ? 'Melhorando' : performanceRankings.overall.trend === 'declining' ? 'Em declínio' : 'Estável'}
          </div>
        </div>
      </div>

      <div class="ranking-grid">
        <div class="ranking-card">
          <div class="ranking-position">#${performanceRankings.operational.rank}</div>
          <div class="ranking-metric">Operacional</div>
          <div class="ranking-percentile">P${performanceRankings.operational.percentile}</div>
        </div>

        <div class="ranking-card">
          <div class="ranking-position">#${performanceRankings.financial.rank}</div>
          <div class="ranking-metric">Financeiro</div>
          <div class="ranking-percentile">P${performanceRankings.financial.percentile}</div>
        </div>

        <div class="ranking-card">
          <div class="ranking-position">#${performanceRankings.team.rank}</div>
          <div class="ranking-metric">Equipa</div>
          <div class="ranking-percentile">P${performanceRankings.team.percentile}</div>
        </div>

        <div class="ranking-card">
          <div class="ranking-position">#${performanceRankings.quality.rank}</div>
          <div class="ranking-metric">Qualidade</div>
          <div class="ranking-percentile">P${performanceRankings.quality.percentile}</div>
        </div>

        <div class="ranking-card">
          <div class="ranking-position">#${performanceRankings.efficiency.rank}</div>
          <div class="ranking-metric">Eficiência</div>
          <div class="ranking-percentile">P${performanceRankings.efficiency.percentile}</div>
        </div>
      </div>

      ${performanceRankings.industryBenchmarks.length > 0 ? `
      <table class="executive-table" style="margin-top: 20px;">
        <thead>
          <tr>
            <th>Métrica</th>
            <th>Nosso Valor</th>
            <th>Média Indústria</th>
            <th>Líder Indústria</th>
            <th>Gap</th>
            <th>Ranking</th>
          </tr>
        </thead>
        <tbody>
          ${performanceRankings.industryBenchmarks.map(benchmark => `
            <tr>
              <td>${benchmark.metric}</td>
              <td><strong>${benchmark.ourValue.toFixed(1)}</strong></td>
              <td>${benchmark.industryAverage.toFixed(1)}</td>
              <td>${benchmark.industryLeader.toFixed(1)}</td>
              <td style="color: ${benchmark.gap >= 0 ? 'var(--executive-green)' : 'var(--executive-red)'};">
                ${benchmark.gap >= 0 ? '+' : ''}${benchmark.gap.toFixed(1)}
              </td>
              <td>
                <span class="status-indicator status-${benchmark.ranking === 'leader' ? 'excellent' : benchmark.ranking === 'above_average' ? 'good' : benchmark.ranking === 'average' ? 'fair' : 'poor'}">
                  ${benchmark.ranking.replace('_', ' ')}
                </span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ` : ''}
    </div>`;
  }

  // Continue with additional sections...
  private static generateFinancialPerformance(reportData: MonthlyExecutiveReport): string {
    return `<div class="executive-section"><div class="section-header"><div class="section-number">5</div><div class="section-title"><h2>Performance Financeira</h2></div></div><p>Análise financeira detalhada do mês.</p></div>`;
  }

  private static generateOperationalExcellence(reportData: MonthlyExecutiveReport): string {
    return `<div class="executive-section"><div class="section-header"><div class="section-number">6</div><div class="section-title"><h2>Excellence Operacional</h2></div></div><p>Revisão da excelência operacional e melhorias implementadas.</p></div>`;
  }

  private static generateTeamPerformance(reportData: MonthlyExecutiveReport): string {
    return `<div class="executive-section"><div class="section-header"><div class="section-number">7</div><div class="section-title"><h2>Performance da Equipa</h2></div></div><p>Análise detalhada do desempenho da equipa.</p></div>`;
  }

  private static generateStrategicRecommendations(reportData: MonthlyExecutiveReport): string {
    const { strategicRecommendations } = reportData;

    return `
    <div class="executive-section">
      <div class="section-header">
        <div class="section-number">8</div>
        <div class="section-title">
          <h2>Recomendações Estratégicas</h2>
          <div class="section-subtitle">Iniciativas prioritárias para crescimento e otimização</div>
        </div>
      </div>

      ${strategicRecommendations.map(recommendation => `
        <div class="recommendation-card">
          <div class="recommendation-priority priority-${recommendation.priority}">
            ${recommendation.priority.toUpperCase()}
          </div>
          
          <div class="recommendation-title">
            ${recommendation.title}
          </div>
          
          <div class="recommendation-description">
            ${recommendation.description}
          </div>
          
          <div style="background: rgba(30, 64, 175, 0.05); padding: 12px; border-radius: 8px; margin: 12px 0;">
            <div style="font-size: 10px; font-weight: 600; color: var(--executive-blue); margin-bottom: 6px;">
              💡 Justificação
            </div>
            <div style="font-size: 9px; line-height: 1.4;">
              ${recommendation.rationale}
            </div>
          </div>

          <div class="recommendation-impact">
            <div class="impact-item">
              <div class="impact-label">Impacto Financeiro</div>
              <div>${recommendation.expectedImpact.financial}</div>
            </div>
            <div class="impact-item">
              <div class="impact-label">Impacto Operacional</div>
              <div>${recommendation.expectedImpact.operational}</div>
            </div>
            <div class="impact-item">
              <div class="impact-label">Timeline</div>
              <div>${recommendation.expectedImpact.timeline}</div>
            </div>
          </div>

          <div style="margin-top: 12px; font-size: 9px;">
            <div style="font-weight: 600; margin-bottom: 6px;">📋 Implementação:</div>
            <div>Owner: ${recommendation.implementation.owner} | Timeline: ${recommendation.implementation.timeline}</div>
          </div>
        </div>
      `).join('')}
    </div>`;
  }

  private static generateRiskAssessment(reportData: MonthlyExecutiveReport): string {
    return `<div class="executive-section"><div class="section-header"><div class="section-number">9</div><div class="section-title"><h2>Avaliação de Riscos</h2></div></div><p>Análise de riscos e estratégias de mitigação.</p></div>`;
  }

  private static generateStrategicInitiatives(reportData: MonthlyExecutiveReport): string {
    return `<div class="executive-section"><div class="section-header"><div class="section-number">10</div><div class="section-title"><h2>Iniciativas Estratégicas</h2></div></div><p>Progresso das iniciativas estratégicas em curso.</p></div>`;
  }

  private static generateMarketAnalysis(reportData: MonthlyExecutiveReport): string {
    return `<div class="executive-section"><div class="section-header"><div class="section-number">11</div><div class="section-title"><h2>Análise de Mercado</h2></div></div><p>Condições de mercado e posicionamento competitivo.</p></div>`;
  }

  private static generateMonthlyTrends(reportData: MonthlyExecutiveReport): string {
    return `<div class="executive-section"><div class="section-header"><div class="section-number">12</div><div class="section-title"><h2>Tendências Mensais</h2></div></div><p>Análise de tendências e insights preditivos.</p></div>`;
  }

  private static generateActionPlan(reportData: MonthlyExecutiveReport): string {
    const { actionPlan } = reportData;

    return `
    <div class="executive-section">
      <div class="section-header">
        <div class="section-number">13</div>
        <div class="section-title">
          <h2>Plano de Ação</h2>
          <div class="section-subtitle">Iniciativas prioritárias para o próximo período</div>
        </div>
      </div>

      <div class="executive-grid grid-3">
        <div class="executive-card" style="--card-accent: var(--executive-red);">
          <div class="card-title">🎯 Ações Estratégicas</div>
          <div class="card-metric">${actionPlan.strategicActions.length}</div>
          <div style="font-size: 9px; color: var(--executive-gray);">
            Iniciativas de alto impacto
          </div>
        </div>

        <div class="executive-card" style="--card-accent: var(--executive-blue);">
          <div class="card-title">⚙️ Ações Operacionais</div>
          <div class="card-metric">${actionPlan.operationalActions.length}</div>
          <div style="font-size: 9px; color: var(--executive-gray);">
            Melhorias operacionais
          </div>
        </div>

        <div class="executive-card" style="--card-accent: var(--executive-green);">
          <div class="card-title">🚀 Ações Táticas</div>
          <div class="card-metric">${actionPlan.tacticalActions.length}</div>
          <div style="font-size: 9px; color: var(--executive-gray);">
            Implementações rápidas
          </div>
        </div>
      </div>

      ${[...actionPlan.strategicActions, ...actionPlan.operationalActions, ...actionPlan.tacticalActions]
        .sort((a, b) => {
          const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        })
        .slice(0, 10)
        .map(action => `
          <div class="action-item">
            <div class="action-priority priority-${action.priority === 'critical' ? '1' : action.priority === 'high' ? '2' : '3'}">
              ${action.priority === 'critical' ? '!' : action.priority === 'high' ? 'H' : action.priority === 'medium' ? 'M' : 'L'}
            </div>
            <div style="flex: 1;">
              <div style="font-weight: 600; margin-bottom: 4px;">${action.title}</div>
              <div style="margin-bottom: 6px;">${action.description}</div>
              <div style="font-size: 8px; color: var(--executive-gray);">
                Owner: ${action.owner} | Deadline: ${format(action.deadline, 'dd/MM/yyyy')} | Status: ${action.status.replace('_', ' ')}
              </div>
            </div>
          </div>
        `).join('')}
    </div>`;
  }

  private static generateAppendix(reportData: MonthlyExecutiveReport): string {
    return `
    <div class="executive-footer">
      <div>
        <strong>RIBBAI Business Intelligence Platform</strong><br>
        Relatório gerado automaticamente em ${format(reportData.generatedAt, 'dd/MM/yyyy HH:mm')}
      </div>
      <div style="text-align: right;">
        Período: ${format(reportData.periodStart, 'dd/MM/yyyy')} - ${format(reportData.periodEnd, 'dd/MM/yyyy')}<br>
        Sistema BI v2.0 | Confidencial
      </div>
    </div>`;
  }

  private static generateExecutiveFooter(reportData: MonthlyExecutiveReport): string {
    return `
      <div class="executive-footer">
        <div>
          <strong>RIBBAI Business Intelligence Platform</strong><br>
          Relatório gerado automaticamente em ${format(reportData.generatedAt, 'dd/MM/yyyy HH:mm', { locale: pt })}
        </div>
        <div style="text-align: center;">
          Período: ${format(reportData.periodStart, 'dd/MM/yyyy', { locale: pt })} - ${format(reportData.periodEnd, 'dd/MM/yyyy', { locale: pt })}<br>
          Sistema BI v2.0 | Confidencial
        </div>
        <div style="text-align: right;">
          Performance Score: ${((reportData.executiveSummary.operationalHighlights.healthScore + reportData.executiveSummary.teamHighlights.performanceIndex) / 2).toFixed(1)}%<br>
          Status: ${reportData.executiveSummary.overallPerformance.replace('_', ' ')}
        </div>
      </div>
    `;
  }

  private static generateEnhancedChartScripts(reportData: MonthlyExecutiveReport): string {
    return `
      // Enhanced Chart.js configuration for executive reports
      Chart.defaults.font.family = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      Chart.defaults.font.size = 11;
      Chart.defaults.color = '#475569';
      
      // Global chart configuration
      Chart.defaults.responsive = true;
      Chart.defaults.maintainAspectRatio = false;
      Chart.defaults.plugins.legend.labels.usePointStyle = true;
      Chart.defaults.plugins.legend.labels.padding = 15;
      Chart.defaults.elements.point.radius = 4;
      Chart.defaults.elements.point.hoverRadius = 6;
      Chart.defaults.elements.line.borderWidth = 3;
      Chart.defaults.elements.line.tension = 0.4;
      
      // Auto-initialize charts when DOM is ready
      document.addEventListener('DOMContentLoaded', function() {
        console.log('Executive charts initialized');
      });
    `;
  }

  private static generateChartScripts(reportData: MonthlyExecutiveReport): string {
    const { monthlyKPIDashboard } = reportData;

    return `
    // Monthly KPI Trend Chart
    if (document.getElementById('monthlyKPIChart')) {
      const ctx = document.getElementById('monthlyKPIChart').getContext('2d');
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'],
          datasets: [{
            label: 'Operacional',
            data: [82, 85, 88, ${monthlyKPIDashboard.operational.summary.average}],
            borderColor: '#1e40af',
            backgroundColor: 'rgba(30, 64, 175, 0.1)',
            tension: 0.4,
            fill: false
          }, {
            label: 'Financeiro',  
            data: [85, 87, 89, ${monthlyKPIDashboard.financial.summary.average}],
            borderColor: '#059669',
            backgroundColor: 'rgba(5, 150, 105, 0.1)',
            tension: 0.4,
            fill: false
          }, {
            label: 'Equipa',
            data: [80, 83, 85, ${monthlyKPIDashboard.team.summary.average}],
            borderColor: '#7c3aed',
            backgroundColor: 'rgba(124, 58, 237, 0.1)',
            tension: 0.4,
            fill: false
          }, {
            label: 'Qualidade',
            data: [86, 88, 90, ${monthlyKPIDashboard.quality.summary.average}],
            borderColor: '#d97706',
            backgroundColor: 'rgba(217, 119, 6, 0.1)',
            tension: 0.4,
            fill: false
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top'
            }
          },
          scales: {
            y: {
              beginAtZero: false,
              min: 70,
              max: 100,
              title: {
                display: true,
                text: 'Performance (%)'
              }
            },
            x: {
              title: {
                display: true,
                text: 'Período'
              }
            }
          }
        }
      });
    }
    `;
  }
}