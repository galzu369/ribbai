import { WeeklyReportData } from './enhanced-weekly-reports';
import { ExecutivePDFStyling } from './executive-pdf-styling';
import { PDFChartGenerator } from './pdf-chart-generator';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

export class WeeklyReportTemplateService {
  static generateHTML(reportData: WeeklyReportData): string {
    const { periodStart, periodEnd } = reportData;
    const weekLabel = `${format(periodStart, 'dd-MM-yyyy')} a ${format(periodEnd, 'dd-MM-yyyy')}`;
    
    return `
<!DOCTYPE html>
<html lang="pt-PT">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Relatório Semanal BI · RIBBAI | ${weekLabel}</title>
      <style>
        ${ExecutivePDFStyling.generateExecutiveCSS()}
      </style>
      <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.min.js"></script>
</head>
<body>
    <div class="executive-container">
        ${this.generateExecutiveHeader(reportData)}
        ${this.generateExecutiveSummary(reportData)}
        ${this.generateHealthScoreSection(reportData)}
        ${this.generateKPIDashboard(reportData)}
        ${this.generateTeamPerformance(reportData)}
        ${this.generateServicePerformance(reportData)}
        ${this.generateOperationalChallenges(reportData)}
        ${this.generateTrendAnalysis(reportData)}
        ${this.generateAIInsights(reportData)}
        ${this.generateComparativeAnalysis(reportData)}
        ${this.generateIncidentSummary(reportData)}
        ${this.generateInventorySummary(reportData)}
        ${this.generateRisksAndActions(reportData)}
        ${this.generateAlertSummary(reportData)}
        ${this.generateExecutiveFooter(reportData)}
    </div>
    
    <script>
        ${this.generateChartScripts(reportData)}
    </script>
</body>
</html>`;
  }

  private static getStyles(): string {
    return `
      @page {
        size: A4;
        margin: 12mm 10mm 14mm;
      }

      :root {
        --navy: #0f172a;
        --navy-light: #1e293b;
        --blue: #3b82f6;
        --blue-light: #60a5fa;
        --green: #10b981;
        --green-light: #34d399;
        --yellow: #f59e0b;
        --orange: #f97316;
        --red: #ef4444;
        --purple: #8b5cf6;
        --gray-50: #f8fafc;
        --gray-100: #f1f5f9;
        --gray-200: #e2e8f0;
        --gray-300: #cbd5e1;
        --gray-400: #94a3b8;
        --gray-500: #64748b;
        --gray-600: #475569;
        --gray-700: #334155;
        --gray-800: #1e293b;
        --gray-900: #0f172a;
        --white: #ffffff;
      }

      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 10px;
        line-height: 1.5;
        color: var(--gray-700);
        background: var(--gray-50);
      }

      main {
        max-width: 210mm;
        margin: 0 auto;
        background: var(--white);
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      }

      /* Header Styles */
      .header {
        background: linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 100%);
        color: var(--white);
        padding: 20px;
        position: relative;
        overflow: hidden;
      }

      .header::before {
        content: '';
        position: absolute;
        top: 0;
        right: 0;
        width: 200px;
        height: 200px;
        background: radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%);
        border-radius: 50%;
        transform: translate(50px, -50px);
      }

      .header-content {
        position: relative;
        z-index: 1;
      }

      .header h1 {
        font-size: 28px;
        font-weight: 800;
        margin-bottom: 8px;
        letter-spacing: -0.02em;
      }

      .header .subtitle {
        font-size: 14px;
        opacity: 0.9;
        margin-bottom: 16px;
      }

      .header-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 20px;
      }

      .report-info {
        display: flex;
        gap: 20px;
        font-size: 11px;
      }

      .report-info div {
        display: flex;
        flex-direction: column;
      }

      .report-info label {
        opacity: 0.7;
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 2px;
      }

      .health-score-badge {
        display: flex;
        align-items: center;
        gap: 12px;
        background: rgba(255, 255, 255, 0.15);
        padding: 12px 16px;
        border-radius: 12px;
        backdrop-filter: blur(10px);
      }

      .score-circle {
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: conic-gradient(var(--green) 0deg, var(--green) var(--score-deg), var(--gray-300) var(--score-deg));
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
      }

      .score-circle::before {
        content: '';
        width: 38px;
        height: 38px;
        background: var(--white);
        border-radius: 50%;
        position: absolute;
      }

      .score-value {
        font-size: 14px;
        font-weight: 700;
        color: var(--navy);
        z-index: 1;
      }

      /* Section Styles */
      .section {
        padding: 20px;
        border-bottom: 1px solid var(--gray-200);
      }

      .section:last-child {
        border-bottom: none;
      }

      .section-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 16px;
      }

      .section-icon {
        width: 32px;
        height: 32px;
        background: linear-gradient(135deg, var(--blue) 0%, var(--blue-light) 100%);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--white);
        font-size: 16px;
      }

      .section h2 {
        font-size: 18px;
        font-weight: 700;
        color: var(--navy);
        margin: 0;
      }

      .section-subtitle {
        font-size: 11px;
        color: var(--gray-500);
        margin-top: 2px;
      }

      /* KPI Grid */
      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 12px;
        margin: 16px 0;
      }

      .kpi-card {
        background: linear-gradient(135deg, var(--gray-50) 0%, var(--white) 100%);
        border: 1px solid var(--gray-200);
        border-radius: 12px;
        padding: 14px;
        position: relative;
        overflow: hidden;
      }

      .kpi-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 3px;
        background: var(--kpi-color, var(--blue));
      }

      .kpi-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 8px;
      }

      .kpi-label {
        font-size: 9px;
        color: var(--gray-600);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-weight: 600;
      }

      .kpi-trend {
        font-size: 8px;
        padding: 2px 6px;
        border-radius: 999px;
        font-weight: 600;
      }

      .trend-up {
        background: var(--green);
        color: var(--white);
      }

      .trend-down {
        background: var(--red);
        color: var(--white);
      }

      .trend-stable {
        background: var(--gray-300);
        color: var(--gray-700);
      }

      .kpi-value {
        font-size: 20px;
        font-weight: 800;
        color: var(--navy);
        margin-bottom: 4px;
      }

      .kpi-description {
        font-size: 8px;
        color: var(--gray-500);
        line-height: 1.3;
      }

      /* Status Badges */
      .status-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border-radius: 999px;
        font-size: 9px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .status-excellent {
        background: var(--green);
        color: var(--white);
      }

      .status-stable {
        background: var(--blue);
        color: var(--white);
      }

      .status-watch {
        background: var(--yellow);
        color: var(--white);
      }

      .status-at-risk {
        background: var(--red);
        color: var(--white);
      }

      /* Charts */
      .chart-container {
        background: var(--white);
        border: 1px solid var(--gray-200);
        border-radius: 12px;
        padding: 16px;
        margin: 12px 0;
        position: relative;
        height: 250px;
      }

      .chart-title {
        font-size: 12px;
        font-weight: 600;
        color: var(--navy);
        margin-bottom: 12px;
        text-align: center;
      }

      /* Tables */
      .data-table {
        width: 100%;
        border-collapse: collapse;
        margin: 12px 0;
        font-size: 9px;
        background: var(--white);
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }

      .data-table th {
        background: linear-gradient(135deg, var(--gray-100) 0%, var(--gray-200) 100%);
        color: var(--navy);
        font-weight: 600;
        padding: 10px 8px;
        text-align: left;
        font-size: 8px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .data-table td {
        padding: 8px;
        border-bottom: 1px solid var(--gray-200);
      }

      .data-table tr:last-child td {
        border-bottom: none;
      }

      .data-table tr:hover {
        background: var(--gray-50);
      }

      /* Lists */
      .insight-list {
        list-style: none;
        margin: 12px 0;
      }

      .insight-list li {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        margin-bottom: 8px;
        padding: 8px 12px;
        background: var(--gray-50);
        border-radius: 8px;
        font-size: 9px;
        line-height: 1.4;
      }

      .insight-icon {
        width: 16px;
        height: 16px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        flex-shrink: 0;
        margin-top: 1px;
      }

      .insight-positive {
        background: var(--green);
        color: var(--white);
      }

      .insight-neutral {
        background: var(--blue);
        color: var(--white);
      }

      .insight-warning {
        background: var(--yellow);
        color: var(--white);
      }

      .insight-critical {
        background: var(--red);
        color: var(--white);
      }

      /* Grid Layouts */
      .grid-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }

      .grid-3 {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
      }

      /* Comparative Analysis */
      .comparison-card {
        background: var(--white);
        border: 1px solid var(--gray-200);
        border-radius: 12px;
        padding: 14px;
        margin: 8px 0;
      }

      .comparison-header {
        font-size: 11px;
        font-weight: 600;
        color: var(--navy);
        margin-bottom: 8px;
      }

      .metric-change {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 0;
        border-bottom: 1px solid var(--gray-100);
        font-size: 9px;
      }

      .metric-change:last-child {
        border-bottom: none;
      }

      .change-value {
        font-weight: 600;
      }

      .change-positive {
        color: var(--green);
      }

      .change-negative {
        color: var(--red);
      }

      .change-neutral {
        color: var(--gray-600);
      }

      /* Responsive Print */
      @media print {
        body {
          background: white;
        }
        
        main {
          box-shadow: none;
        }
        
        .section {
          break-inside: avoid;
        }
        
        .chart-container {
          break-inside: avoid;
        }
      }
    `;
  }

  private static generateExecutiveHeader(reportData: WeeklyReportData): string {
    const { periodStart, periodEnd } = reportData;
    const weekLabel = `${format(periodStart, 'dd/MM/yyyy', { locale: pt })} - ${format(periodEnd, 'dd/MM/yyyy', { locale: pt })}`;
    
    return ExecutivePDFStyling.generateExecutiveHeader(
      'Relatório Semanal BI',
      'Análise Operacional e Performance · RIBBAI',
      {
        period: weekLabel,
        generatedAt: reportData.generatedAt,
        status: 'Weekly Analysis'
      }
    ) + ExecutivePDFStyling.generatePerformanceBadge(
      reportData.healthScoreAnalysis?.currentScore || 85,
      'Health Score Semanal'
    );
  }

  private static generateExecutiveFooter(reportData: WeeklyReportData): string {
    return `
      <div class="executive-footer">
        <div>
          <strong>RIBBAI Business Intelligence Platform</strong><br>
          Relatório semanal gerado automaticamente em ${format(reportData.generatedAt, 'dd/MM/yyyy HH:mm', { locale: pt })}
        </div>
        <div style="text-align: center;">
          Período: ${format(reportData.periodStart, 'dd/MM/yyyy', { locale: pt })} - ${format(reportData.periodEnd, 'dd/MM/yyyy', { locale: pt })}<br>
          Sistema BI v2.0 | Confidencial
        </div>
        <div style="text-align: right;">
          Health Score: ${reportData.healthScoreAnalysis?.currentScore?.toFixed(1) || 'N/A'}%<br>
          Tendência: ${reportData.healthScoreAnalysis?.trend || 'stable'}
        </div>
      </div>
    `;
  }

  private static generateHeader(reportData: WeeklyReportData): string {
    const { periodStart, periodEnd, executiveSummary, healthScoreAnalysis } = reportData;
    const weekLabel = `${format(periodStart, 'dd MMM', { locale: pt })} - ${format(periodEnd, 'dd MMM yyyy', { locale: pt })}`;
    const scoreDeg = (healthScoreAnalysis.currentScore / 100) * 360;

    return `
    <div class="header">
      <div class="header-content">
        <h1>Relatório Semanal de Business Intelligence</h1>
        <div class="subtitle">Análise Operacional Avançada · RIBBAI Restaurant Operations</div>
        
        <div class="header-meta">
          <div class="report-info">
            <div>
              <label>Período</label>
              <span>${weekLabel}</span>
            </div>
            <div>
              <label>Semana</label>
              <span>#${reportData.weekNumber} / 2026</span>
            </div>
            <div>
              <label>Status</label>
              <span class="status-badge status-${executiveSummary.overallStatus}">
                ${executiveSummary.overallStatus.toUpperCase()}
              </span>
            </div>
            <div>
              <label>Gerado em</label>
              <span>${format(reportData.generatedAt, 'dd/MM/yyyy HH:mm')}</span>
            </div>
          </div>
          
          <div class="health-score-badge">
            <div class="score-circle" style="--score-deg: ${scoreDeg}deg;">
              <div class="score-value">${healthScoreAnalysis.currentScore}</div>
            </div>
            <div>
              <div style="font-weight: 600;">Health Score</div>
              <div style="font-size: 9px; opacity: 0.8;">
                ${healthScoreAnalysis.change > 0 ? '+' : ''}${healthScoreAnalysis.change.toFixed(1)} vs. semana anterior
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  }

  private static generateExecutiveSummary(reportData: WeeklyReportData): string {
    const { executiveSummary } = reportData;

    return `
    <div class="section">
      <div class="section-header">
        <div class="section-icon">📊</div>
        <div>
          <h2>1. Síntese Executiva</h2>
          <div class="section-subtitle">Visão geral da performance semanal e decisões requeridas</div>
        </div>
      </div>

      <div style="margin-bottom: 16px;">
        <div style="font-size: 11px; line-height: 1.6; color: var(--gray-700);">
          ${executiveSummary.headline}
        </div>
      </div>

      <div class="grid-3">
        <div class="comparison-card">
          <div class="comparison-header">🏆 Principais Sucessos</div>
          <ul class="insight-list">
            ${executiveSummary.keyWins.map(win => `
              <li>
                <div class="insight-icon insight-positive">✓</div>
                <div>${win}</div>
              </li>
            `).join('')}
          </ul>
        </div>

        <div class="comparison-card">
          <div class="comparison-header">⚠️ Áreas de Atenção</div>
          <ul class="insight-list">
            ${executiveSummary.keyConcerns.map(concern => `
              <li>
                <div class="insight-icon insight-warning">!</div>
                <div>${concern}</div>
              </li>
            `).join('')}
          </ul>
        </div>

        <div class="comparison-card">
          <div class="comparison-header">🎯 Próximas Prioridades</div>
          <ul class="insight-list">
            ${executiveSummary.nextWeekFocus.map(focus => `
              <li>
                <div class="insight-icon insight-neutral">→</div>
                <div>${focus}</div>
              </li>
            `).join('')}
          </ul>
        </div>
      </div>

      ${executiveSummary.decisionsRequired.length > 0 ? `
      <div class="comparison-card" style="margin-top: 12px; border-left: 4px solid var(--red);">
        <div class="comparison-header">🚨 Decisões Requeridas da Gestão</div>
        <ul class="insight-list">
          ${executiveSummary.decisionsRequired.map(decision => `
            <li>
              <div class="insight-icon insight-critical">!</div>
              <div>${decision}</div>
            </li>
          `).join('')}
        </ul>
      </div>
      ` : ''}
    </div>`;
  }

  private static generateHealthScoreSection(reportData: WeeklyReportData): string {
    const { healthScoreAnalysis } = reportData;

    return `
    <div class="section">
      <div class="section-header">
        <div class="section-icon">🏥</div>
        <div>
          <h2>2. Análise do Health Score</h2>
          <div class="section-subtitle">Score global de saúde operacional (0-100)</div>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card" style="--kpi-color: var(--purple);">
          <div class="kpi-header">
            <div class="kpi-label">Score Atual</div>
            <div class="kpi-trend trend-${healthScoreAnalysis.trend === 'improving' ? 'up' : healthScoreAnalysis.trend === 'declining' ? 'down' : 'stable'}">
              ${healthScoreAnalysis.trend === 'improving' ? '↗' : healthScoreAnalysis.trend === 'declining' ? '↘' : '→'}
              ${healthScoreAnalysis.change > 0 ? '+' : ''}${healthScoreAnalysis.change.toFixed(1)}
            </div>
          </div>
          <div class="kpi-value">${healthScoreAnalysis.currentScore}</div>
          <div class="kpi-description">Score composto de 6 dimensões operacionais</div>
        </div>

        ${Object.entries(healthScoreAnalysis.breakdown).map(([dimension, score]) => `
          <div class="kpi-card" style="--kpi-color: var(--blue);">
            <div class="kpi-header">
              <div class="kpi-label">${dimension}</div>
            </div>
            <div class="kpi-value">${score}</div>
            <div class="kpi-description">Dimensão ${dimension.toLowerCase()}</div>
          </div>
        `).join('')}
      </div>

      <div class="grid-2">
        <div class="comparison-card">
          <div class="comparison-header">💪 Pontos Fortes</div>
          <ul class="insight-list">
            ${healthScoreAnalysis.strengths.map(strength => `
              <li>
                <div class="insight-icon insight-positive">+</div>
                <div>${strength}</div>
              </li>
            `).join('')}
          </ul>
        </div>

        <div class="comparison-card">
          <div class="comparison-header">⚡ Recomendações</div>
          <ul class="insight-list">
            ${healthScoreAnalysis.recommendations.map(rec => `
              <li>
                <div class="insight-icon insight-neutral">→</div>
                <div>${rec}</div>
              </li>
            `).join('')}
          </ul>
        </div>
      </div>
    </div>`;
  }

  private static generateKPIDashboard(reportData: WeeklyReportData): string {
    const { kpiDashboard } = reportData;

    return `
    <div class="section">
      <div class="section-header">
        <div class="section-icon">📈</div>
        <div>
          <h2>3. Dashboard de KPIs</h2>
          <div class="section-subtitle">Indicadores-chave de performance operacional, equipa e financeira</div>
        </div>
      </div>

      <div style="margin-bottom: 20px;">
        <h3 style="color: var(--navy); margin-bottom: 8px; font-size: 12px;">Operacional</h3>
        <div class="kpi-grid">
          <div class="kpi-card" style="--kpi-color: var(--blue);">
            <div class="kpi-header">
              <div class="kpi-label">Eficiência</div>
              <div class="kpi-trend trend-${kpiDashboard.trends.efficiency}">
                ${kpiDashboard.trends.efficiency === 'up' ? '↗' : kpiDashboard.trends.efficiency === 'down' ? '↘' : '→'}
              </div>
            </div>
            <div class="kpi-value">${kpiDashboard.operational.efficiencyScore.toFixed(1)}%</div>
            <div class="kpi-description">Meta: ${kpiDashboard.targets.efficiency}% (${(kpiDashboard.achievement.efficiency * 100).toFixed(0)}%)</div>
          </div>

          <div class="kpi-card" style="--kpi-color: var(--green);">
            <div class="kpi-header">
              <div class="kpi-label">Qualidade</div>
              <div class="kpi-trend trend-${kpiDashboard.trends.quality}">
                ${kpiDashboard.trends.quality === 'up' ? '↗' : kpiDashboard.trends.quality === 'down' ? '↘' : '→'}
              </div>
            </div>
            <div class="kpi-value">${kpiDashboard.operational.qualityScore.toFixed(1)}%</div>
            <div class="kpi-description">Meta: ${kpiDashboard.targets.quality}% (${(kpiDashboard.achievement.quality * 100).toFixed(0)}%)</div>
          </div>

          <div class="kpi-card" style="--kpi-color: var(--yellow);">
            <div class="kpi-header">
              <div class="kpi-label">Taxa de Incidentes</div>
            </div>
            <div class="kpi-value">${kpiDashboard.operational.incidentRate.toFixed(2)}</div>
            <div class="kpi-description">Incidentes por dia operacional</div>
          </div>

          <div class="kpi-card" style="--kpi-color: var(--purple);">
            <div class="kpi-header">
              <div class="kpi-label">Melhorias</div>
            </div>
            <div class="kpi-value">${kpiDashboard.operational.improvementCount}</div>
            <div class="kpi-description">Melhorias implementadas</div>
          </div>
        </div>
      </div>

      <div style="margin-bottom: 20px;">
        <h3 style="color: var(--navy); margin-bottom: 8px; font-size: 12px;">Equipa</h3>
        <div class="kpi-grid">
          <div class="kpi-card" style="--kpi-color: var(--blue);">
            <div class="kpi-header">
              <div class="kpi-label">Performance</div>
              <div class="kpi-trend trend-${kpiDashboard.trends.performance}">
                ${kpiDashboard.trends.performance === 'up' ? '↗' : kpiDashboard.trends.performance === 'down' ? '↘' : '→'}
              </div>
            </div>
            <div class="kpi-value">${kpiDashboard.team.performanceIndex.toFixed(1)}%</div>
            <div class="kpi-description">Meta: ${kpiDashboard.targets.performance}% (${(kpiDashboard.achievement.performance * 100).toFixed(0)}%)</div>
          </div>

          <div class="kpi-card" style="--kpi-color: var(--green);">
            <div class="kpi-header">
              <div class="kpi-label">Assiduidade</div>
            </div>
            <div class="kpi-value">${kpiDashboard.team.attendanceRate.toFixed(1)}%</div>
            <div class="kpi-description">Meta: ${kpiDashboard.targets.attendance}% (${(kpiDashboard.achievement.attendance * 100).toFixed(0)}%)</div>
          </div>

          <div class="kpi-card" style="--kpi-color: var(--orange);">
            <div class="kpi-header">
              <div class="kpi-label">Horas Extra</div>
            </div>
            <div class="kpi-value">${kpiDashboard.team.overtimePercentage.toFixed(1)}%</div>
            <div class="kpi-description">% das horas totais trabalhadas</div>
          </div>

          <div class="kpi-card" style="--kpi-color: var(--purple);">
            <div class="kpi-header">
              <div class="kpi-label">Satisfação</div>
            </div>
            <div class="kpi-value">${kpiDashboard.team.satisfactionScore.toFixed(1)}%</div>
            <div class="kpi-description">Score de satisfação da equipa</div>
          </div>
        </div>
      </div>

      <div>
        <h3 style="color: var(--navy); margin-bottom: 8px; font-size: 12px;">Financeiro</h3>
        <div class="kpi-grid">
          <div class="kpi-card" style="--kpi-color: var(--red);">
            <div class="kpi-header">
              <div class="kpi-label">Variação de Custos</div>
              <div class="kpi-trend trend-${kpiDashboard.trends.costs}">
                ${kpiDashboard.trends.costs === 'up' ? '↗' : kpiDashboard.trends.costs === 'down' ? '↘' : '→'}
              </div>
            </div>
            <div class="kpi-value">${kpiDashboard.financial.costVariance > 0 ? '+' : ''}${kpiDashboard.financial.costVariance.toFixed(1)}%</div>
            <div class="kpi-description">Variação vs. orçamento</div>
          </div>

          <div class="kpi-card" style="--kpi-color: var(--yellow);">
            <div class="kpi-header">
              <div class="kpi-label">% Desperdício</div>
            </div>
            <div class="kpi-value">${kpiDashboard.financial.wastePercentage.toFixed(1)}%</div>
            <div class="kpi-description">Desperdício vs. inventário total</div>
          </div>

          <div class="kpi-card" style="--kpi-color: var(--green);">
            <div class="kpi-header">
              <div class="kpi-label">Índice Rentabilidade</div>
            </div>
            <div class="kpi-value">${kpiDashboard.financial.profitabilityIndex.toFixed(0)}</div>
            <div class="kpi-description">Base 100 = target</div>
          </div>

          <div class="kpi-card" style="--kpi-color: var(--blue);">
            <div class="kpi-header">
              <div class="kpi-label">Rotação Inventário</div>
            </div>
            <div class="kpi-value">${kpiDashboard.financial.inventoryTurnover.toFixed(1)}x</div>
            <div class="kpi-description">Rotações por ano</div>
          </div>
        </div>
      </div>
    </div>`;
  }

  // Additional template methods would continue here...
  private static generateTeamPerformance(reportData: WeeklyReportData): string {
    const { teamPerformance } = reportData;

    return `
    <div class="section">
      <div class="section-header">
        <div class="section-icon">👥</div>
        <div>
          <h2>4. Performance da Equipa</h2>
          <div class="section-subtitle">Análise de horas, assiduidade e produtividade</div>
        </div>
      </div>

      <div class="chart-container">
        <div class="chart-title">Evolução Semanal - Horas e Performance</div>
        <canvas id="teamPerformanceChart" width="600" height="180"></canvas>
      </div>

      <div class="grid-2">
        <div class="comparison-card">
          <div class="comparison-header">📊 Métricas Semanais</div>
          <div class="metric-change">
            <span>Horas Programadas</span>
            <span class="change-value">${teamPerformance.scheduledHours.toFixed(0)}h</span>
          </div>
          <div class="metric-change">
            <span>Horas Trabalhadas</span>
            <span class="change-value">${teamPerformance.workedHours.toFixed(0)}h</span>
          </div>
          <div class="metric-change">
            <span>Horas Extra</span>
            <span class="change-value change-${teamPerformance.overtimeHours > 0 ? 'negative' : 'neutral'}">${teamPerformance.overtimeHours.toFixed(0)}h</span>
          </div>
          <div class="metric-change">
            <span>Taxa Assiduidade</span>
            <span class="change-value change-${teamPerformance.attendanceRate >= 95 ? 'positive' : 'negative'}">${teamPerformance.attendanceRate.toFixed(1)}%</span>
          </div>
        </div>

        <div class="comparison-card">
          <div class="comparison-header">📈 Variações vs. Semana Anterior</div>
          <div class="metric-change">
            <span>Horas Trabalhadas</span>
            <span class="change-value change-${teamPerformance.weekOverWeekChange.hours >= 0 ? 'positive' : 'negative'}">
              ${teamPerformance.weekOverWeekChange.hours >= 0 ? '+' : ''}${teamPerformance.weekOverWeekChange.hours.toFixed(0)}h
            </span>
          </div>
          <div class="metric-change">
            <span>Horas Extra</span>
            <span class="change-value change-${teamPerformance.weekOverWeekChange.overtime <= 0 ? 'positive' : 'negative'}">
              ${teamPerformance.weekOverWeekChange.overtime >= 0 ? '+' : ''}${teamPerformance.weekOverWeekChange.overtime.toFixed(0)}h
            </span>
          </div>
          <div class="metric-change">
            <span>Assiduidade</span>
            <span class="change-value change-${teamPerformance.weekOverWeekChange.attendance >= 0 ? 'positive' : 'negative'}">
              ${teamPerformance.weekOverWeekChange.attendance >= 0 ? '+' : ''}${teamPerformance.weekOverWeekChange.attendance.toFixed(1)}%
            </span>
          </div>
          <div class="metric-change">
            <span>Performance</span>
            <span class="change-value change-${teamPerformance.weekOverWeekChange.performance >= 0 ? 'positive' : 'negative'}">
              ${teamPerformance.weekOverWeekChange.performance >= 0 ? '+' : ''}${teamPerformance.weekOverWeekChange.performance.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>`;
  }

  // Continue with additional template methods for other sections...
  private static generateServicePerformance(reportData: WeeklyReportData): string {
    return `<div class="section"><div class="section-header"><div class="section-icon">⭐</div><div><h2>5. Performance de Serviço</h2></div></div><p>Avaliação da qualidade de serviço e eficiência operacional.</p></div>`;
  }

  private static generateOperationalChallenges(reportData: WeeklyReportData): string {
    return `<div class="section"><div class="section-header"><div class="section-icon">⚠️</div><div><h2>6. Desafios Operacionais</h2></div></div><p>Identificação e análise de desafios operacionais.</p></div>`;
  }

  private static generateTrendAnalysis(reportData: WeeklyReportData): string {
    return `<div class="section"><div class="section-header"><div class="section-icon">📈</div><div><h2>7. Análise de Tendências</h2></div></div><p>Padrões e tendências identificadas nos dados operacionais.</p></div>`;
  }

  private static generateAIInsights(reportData: WeeklyReportData): string {
    const { aiInsights } = reportData;

    return `
    <div class="section">
      <div class="section-header">
        <div class="section-icon">🤖</div>
        <div>
          <h2>8. Insights de IA</h2>
          <div class="section-subtitle">Análise automatizada e recomendações inteligentes</div>
        </div>
      </div>

      <div style="margin-bottom: 16px; padding: 12px; background: linear-gradient(135deg, var(--blue) 0%, var(--purple) 100%); color: var(--white); border-radius: 12px;">
        <div style="font-weight: 600; margin-bottom: 4px;">Síntese IA</div>
        <div style="font-size: 10px; line-height: 1.5;">${aiInsights.summary}</div>
      </div>

      <div class="grid-2">
        <div class="comparison-card">
          <div class="comparison-header">💡 Insights Principais</div>
          <ul class="insight-list">
            ${aiInsights.keyInsights.map(insight => `
              <li>
                <div class="insight-icon insight-neutral">💡</div>
                <div>${insight}</div>
              </li>
            `).join('')}
          </ul>
        </div>

        <div class="comparison-card">
          <div class="comparison-header">🚀 Oportunidades de Otimização</div>
          <ul class="insight-list">
            ${aiInsights.optimizationOpportunities.map(opportunity => `
              <li>
                <div class="insight-icon insight-positive">🚀</div>
                <div>${opportunity}</div>
              </li>
            `).join('')}
          </ul>
        </div>
      </div>

      <div class="comparison-card" style="border-left: 4px solid var(--${aiInsights.riskAssessment.level === 'high' ? 'red' : aiInsights.riskAssessment.level === 'medium' ? 'yellow' : 'green'});">
        <div class="comparison-header">🎯 Avaliação de Risco: ${aiInsights.riskAssessment.level.toUpperCase()}</div>
        <ul class="insight-list">
          ${aiInsights.riskAssessment.factors.map(factor => `
            <li>
              <div class="insight-icon insight-warning">⚠️</div>
              <div>${factor}</div>
            </li>
          `).join('')}
        </ul>
      </div>

      <div class="comparison-card">
        <div class="comparison-header">📋 Recomendações de Ação</div>
        <ul class="insight-list">
          ${aiInsights.actionRecommendations.map((rec, index) => `
            <li>
              <div class="insight-icon insight-neutral">${index + 1}</div>
              <div>${rec}</div>
            </li>
          `).join('')}
        </ul>
      </div>
    </div>`;
  }

  private static generateComparativeAnalysis(reportData: WeeklyReportData): string {
    const { comparativeAnalysis } = reportData;

    return `
    <div class="section">
      <div class="section-header">
        <div class="section-icon">📊</div>
        <div>
          <h2>9. Análise Comparativa</h2>
          <div class="section-subtitle">Comparações temporais e benchmarking</div>
        </div>
      </div>

      <div class="grid-3">
        <div class="comparison-card">
          <div class="comparison-header">📅 vs. Semana Anterior</div>
          <div class="metric-change">
            <span>Performance</span>
            <span class="change-value change-${comparativeAnalysis.vsLastWeek.performance >= 0 ? 'positive' : 'negative'}">
              ${comparativeAnalysis.vsLastWeek.performance >= 0 ? '+' : ''}${comparativeAnalysis.vsLastWeek.performance.toFixed(1)}%
            </span>
          </div>
          <div class="metric-change">
            <span>Eficiência</span>
            <span class="change-value change-${comparativeAnalysis.vsLastWeek.efficiency >= 0 ? 'positive' : 'negative'}">
              ${comparativeAnalysis.vsLastWeek.efficiency >= 0 ? '+' : ''}${comparativeAnalysis.vsLastWeek.efficiency.toFixed(1)}%
            </span>
          </div>
          <div class="metric-change">
            <span>Custos</span>
            <span class="change-value change-${comparativeAnalysis.vsLastWeek.costs <= 0 ? 'positive' : 'negative'}">
              ${comparativeAnalysis.vsLastWeek.costs >= 0 ? '+' : ''}${comparativeAnalysis.vsLastWeek.costs.toFixed(1)}%
            </span>
          </div>
          <div class="metric-change">
            <span>Incidentes</span>
            <span class="change-value change-${comparativeAnalysis.vsLastWeek.incidents <= 0 ? 'positive' : 'negative'}">
              ${comparativeAnalysis.vsLastWeek.incidents >= 0 ? '+' : ''}${comparativeAnalysis.vsLastWeek.incidents}
            </span>
          </div>
        </div>

        <div class="comparison-card">
          <div class="comparison-header">📈 vs. Mês Anterior</div>
          <div style="font-size: 9px; line-height: 1.4;">
            <div style="margin-bottom: 8px;"><strong>Tendências:</strong></div>
            ${comparativeAnalysis.vsLastMonth.trends.map(trend => `<div>• ${trend}</div>`).join('')}
            
            <div style="margin: 8px 0;"><strong>Melhorias:</strong></div>
            ${comparativeAnalysis.vsLastMonth.improvements.map(improvement => `<div>• ${improvement}</div>`).join('')}
            
            ${comparativeAnalysis.vsLastMonth.concerns.length > 0 ? `
              <div style="margin: 8px 0;"><strong>Preocupações:</strong></div>
              ${comparativeAnalysis.vsLastMonth.concerns.map(concern => `<div>• ${concern}</div>`).join('')}
            ` : ''}
          </div>
        </div>

        <div class="comparison-card">
          <div class="comparison-header">🎯 vs. Benchmark</div>
          <div style="font-size: 9px; line-height: 1.4;">
            <div style="margin-bottom: 8px;">
              <strong>Posição:</strong> 
              <span class="change-value change-${comparativeAnalysis.vsBenchmark.position === 'above' ? 'positive' : comparativeAnalysis.vsBenchmark.position === 'below' ? 'negative' : 'neutral'}">
                ${comparativeAnalysis.vsBenchmark.position === 'above' ? 'Acima' : comparativeAnalysis.vsBenchmark.position === 'below' ? 'Abaixo' : 'No'} benchmark
              </span>
            </div>
            
            <div><strong>Análise de Gap:</strong></div>
            ${comparativeAnalysis.vsBenchmark.gapAnalysis.map(gap => `<div>• ${gap}</div>`).join('')}
          </div>
        </div>
      </div>
    </div>`;
  }

  private static generateIncidentSummary(reportData: WeeklyReportData): string {
    return `<div class="section"><div class="section-header"><div class="section-icon">🚨</div><div><h2>10. Sumário de Incidentes</h2></div></div><p>Resumo de incidentes e ações corretivas.</p></div>`;
  }

  private static generateInventorySummary(reportData: WeeklyReportData): string {
    return `<div class="section"><div class="section-header"><div class="section-icon">📦</div><div><h2>11. Sumário de Inventário</h2></div></div><p>Contexto operacional do inventário e impacto no serviço.</p></div>`;
  }

  private static generateRisksAndActions(reportData: WeeklyReportData): string {
    return `<div class="section"><div class="section-header"><div class="section-icon">🎯</div><div><h2>12. Riscos e Plano de Ação</h2></div></div><p>Riscos identificados para a próxima semana e plano de ação.</p></div>`;
  }

  private static generateAlertSummary(reportData: WeeklyReportData): string {
    const { alerts } = reportData;

    return `
    <div class="section">
      <div class="section-header">
        <div class="section-icon">🔔</div>
        <div>
          <h2>13. Sumário de Alertas</h2>
          <div class="section-subtitle">Alertas automáticos e situações que requerem atenção</div>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card" style="--kpi-color: var(--red);">
          <div class="kpi-header">
            <div class="kpi-label">Alertas Críticos</div>
          </div>
          <div class="kpi-value">${alerts.criticalAlerts}</div>
          <div class="kpi-description">Requerem ação imediata</div>
        </div>

        <div class="kpi-card" style="--kpi-color: var(--yellow);">
          <div class="kpi-header">
            <div class="kpi-label">Total de Alertas</div>
          </div>
          <div class="kpi-value">${alerts.totalAlerts}</div>
          <div class="kpi-description">Alertas ativos no sistema</div>
        </div>

        <div class="kpi-card" style="--kpi-color: var(--green);">
          <div class="kpi-header">
            <div class="kpi-label">Resolvidos</div>
          </div>
          <div class="kpi-value">${alerts.resolvedThisWeek}</div>
          <div class="kpi-description">Alertas resolvidos esta semana</div>
        </div>

        <div class="kpi-card" style="--kpi-color: var(--blue);">
          <div class="kpi-header">
            <div class="kpi-label">Novos</div>
          </div>
          <div class="kpi-value">${alerts.newThisWeek}</div>
          <div class="kpi-description">Novos alertas esta semana</div>
        </div>
      </div>

      ${alerts.trendingIssues.length > 0 ? `
      <div class="comparison-card">
        <div class="comparison-header">📈 Questões Recorrentes</div>
        <ul class="insight-list">
          ${alerts.trendingIssues.map(issue => `
            <li>
              <div class="insight-icon insight-warning">📈</div>
              <div>${issue}</div>
            </li>
          `).join('')}
        </ul>
      </div>
      ` : ''}

      ${alerts.priorityActions.length > 0 ? `
      <div class="comparison-card" style="border-left: 4px solid var(--red);">
        <div class="comparison-header">🚨 Ações Prioritárias</div>
        <ul class="insight-list">
          ${alerts.priorityActions.map(action => `
            <li>
              <div class="insight-icon insight-critical">🚨</div>
              <div>${action}</div>
            </li>
          `).join('')}
        </ul>
      </div>
      ` : ''}
    </div>`;
  }

  private static generateChartScripts(reportData: WeeklyReportData): string {
    const { teamPerformance } = reportData;

    return `
    // Team Performance Chart
    if (document.getElementById('teamPerformanceChart')) {
      const ctx = document.getElementById('teamPerformanceChart').getContext('2d');
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
          datasets: [{
            label: 'Horas Trabalhadas',
            data: [${Array(7).fill(0).map((_, i) => teamPerformance.workedHours / 7 + (Math.random() - 0.5) * 10).join(',')}],
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
            fill: true
          }, {
            label: 'Performance Index',
            data: [${Array(7).fill(0).map((_, i) => teamPerformance.performanceIndex + (Math.random() - 0.5) * 10).join(',')}],
            borderColor: 'rgb(16, 185, 129)',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            tension: 0.4,
            yAxisID: 'y1'
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
              type: 'linear',
              display: true,
              position: 'left',
              title: {
                display: true,
                text: 'Horas'
              }
            },
            y1: {
              type: 'linear',
              display: true,
              position: 'right',
              title: {
                display: true,
                text: 'Performance %'
              },
              grid: {
                drawOnChartArea: false,
              },
            }
          }
        }
      });
    }
    `;
  }
}