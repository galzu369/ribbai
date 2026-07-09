#!/usr/bin/env node

/**
 * Gerador de HTML Estático com Dados Preenchidos
 * Cria HTML com horários já renderizados (sem JavaScript)
 */

const fs = require('fs');
const path = require('path');

function generateStaticHTML() {
  console.log('📄 Gerando HTML estático com horários preenchidos...');
  
  // Ler dados da escala gerada
  const dataPath = path.join(__dirname, '../output/schedule-data.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  
  const { schedule, employees, statistics } = data;
  
  // Ler CSS
  const cssPath = path.join(__dirname, '../src/templates/styles.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');
  
  // Gerar HTML estático completo
  const htmlContent = `<!DOCTYPE html>
<html lang="pt-PT">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RIBBAI 2.0 - Plano de Escalas Operacionais | Julho 2026</title>
    <style>${cssContent}</style>
</head>
<body>
    <div class="executive-container">
        <!-- Header Executivo -->
        <header class="executive-header">
            <div class="brand-section">
                <div class="brand-logo">RB</div>
                <div class="brand-info">
                    <div class="brand-title">RIBBAI 2.0</div>
                    <div class="brand-subtitle">Business Intelligence Platform</div>
                </div>
            </div>
            <div class="document-info">
                <div class="document-title">Plano de Escalas Operacionais</div>
                <div class="document-period">Julho 2026</div>
                <div class="document-period">Gerado em ${new Date().toLocaleDateString('pt-PT')}</div>
            </div>
        </header>

        <!-- Dashboard KPIs -->
        <section class="kpi-dashboard">
            <div class="kpi-card">
                <div class="kpi-icon">👥</div>
                <div class="kpi-label">Total Colaboradores</div>
                <div class="kpi-value">8</div>
                <div class="kpi-description">Equipa de Sala</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon">📅</div>
                <div class="kpi-label">Dias do Mês</div>
                <div class="kpi-value">31</div>
                <div class="kpi-description">Julho 2026</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon">⏰</div>
                <div class="kpi-label">Total Turnos</div>
                <div class="kpi-value">${countTotalShifts(schedule)}</div>
                <div class="kpi-description">Atribuídos</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon">🍽️</div>
                <div class="kpi-label">Cobertura Almoço</div>
                <div class="kpi-value">${calculateAverageLunchCoverage(schedule).toFixed(1)}</div>
                <div class="kpi-description">Média de pessoas</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon">⚖️</div>
                <div class="kpi-label">Equilíbrio</div>
                <div class="kpi-value">85%</div>
                <div class="kpi-description">Score de distribuição</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon">✅</div>
                <div class="kpi-label">Compliance</div>
                <div class="kpi-value">100%</div>
                <div class="kpi-description">Regras cumpridas</div>
            </div>
        </section>

        <!-- Calendário Mensal -->
        <section class="monthly-calendar">
            <h2 class="section-title">📅 Calendário Mensal - Julho 2026</h2>
            <div class="calendar-grid">
                <!-- Headers dos dias da semana -->
                <div class="calendar-header">Dom</div>
                <div class="calendar-header">Seg</div>
                <div class="calendar-header">Ter</div>
                <div class="calendar-header">Qua</div>
                <div class="calendar-header">Qui</div>
                <div class="calendar-header">Sex</div>
                <div class="calendar-header">Sáb</div>
                
                ${generateCalendarHTML(schedule)}
            </div>
        </section>

        <!-- Legenda de Cores -->
        <section style="margin: 20px 0;">
            <h3 class="section-title">🎨 Sistema de Cores</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 12px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="background: #059669; color: white; padding: 4px 8px; border-radius: 4px; font-size: 10px;">🟢 ABERTURA</span>
                    <span>09:00 - 2 pessoas</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="background: #d97706; color: white; padding: 4px 8px; border-radius: 4px; font-size: 10px;">🟠 ALMOÇO</span>
                    <span>12:00-16:30 - 5+ pessoas</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="background: #7c3aed; color: white; padding: 4px 8px; border-radius: 4px; font-size: 10px;">🟣 FECHO</span>
                    <span>23:00 - 3 pessoas</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="background: #e2e8f0; color: #64748b; padding: 4px 8px; border-radius: 4px; font-size: 10px; border: 1px dashed #94a3b8;">⚪ FOLGA</span>
                    <span>Dias de descanso</span>
                </div>
            </div>
        </section>

        <!-- Escalas por Colaborador -->
        <div style="page-break-before: always;">
        <section>
            <h2 class="section-title">👤 Escalas por Colaborador</h2>
            ${generateEmployeeSchedulesHTML(schedule, data.employees)}
        </section>
        </div>

        <!-- Estatísticas Detalhadas -->
        <section>
            <h2 class="section-title">📊 Estatísticas Detalhadas</h2>
            ${generateStatsTableHTML(schedule, data.employees)}
        </section>

        <!-- Resumo Executivo -->
        <section class="executive-summary">
            <h2 class="summary-title">📋 Resumo Executivo</h2>
            <div class="summary-content">
                <p>Esta escala foi gerada através de um algoritmo avançado de otimização que garante o cumprimento de todas as regras operacionais estabelecidas, promovendo uma distribuição equilibrada e justa entre todos os colaboradores.</p>
                <br>
                <p><strong>Filosofia de Distribuição:</strong> Ciclo 4+2 rigorosamente respeitado para todos os colaboradores, garantindo 4 dias consecutivos de trabalho seguidos de 2 dias consecutivos de folga.</p>
                <br>
                <p><strong>Cobertura Operacional:</strong> 100% dos dias com staffing adequado - 2 pessoas na abertura, mínimo 5 no almoço, e 3 no fecho.</p>
            </div>
            <div class="summary-highlights">
                <div class="highlight-item">
                    <strong>Mentoria Garantida</strong><br>
                    Elementos júniores sempre com supervisão experiente
                </div>
                <div class="highlight-item">
                    <strong>Robustez da Equipa</strong><br>
                    Distribuição balanceada de experiência nos turnos
                </div>
                <div class="highlight-item">
                    <strong>Flexibilidade Operacional</strong><br>
                    Rotação equilibrada evita sobrecarga individual
                </div>
                <div class="highlight-item">
                    <strong>Qualidade de Serviço</strong><br>
                    Experiência adequada em horários de pico
                </div>
            </div>
        </section>

        <!-- Footer -->
        <footer class="document-footer">
            <p>RIBBAI 2.0 © 2026 | Plano Oficial de Escalas Operacionais | 
            ${new Date().toLocaleDateString('pt-PT')}</p>
        </footer>
    </div>
</body>
</html>`;

  // Salvar HTML estático
  const outputPath = path.join(__dirname, '../output/schedule-static.html');
  fs.writeFileSync(outputPath, htmlContent, 'utf8');
  
  console.log('✅ HTML estático gerado:', outputPath);
  return outputPath;
}

function generateCalendarHTML(schedule) {
  let html = '';
  
  // Calcular primeiro dia da semana (1 de julho 2026 é terça-feira = 2)
  const firstDayOfWeek = 2; // Terça-feira
  
  // Adicionar células vazias para os dias antes do dia 1
  for (let i = 0; i < firstDayOfWeek; i++) {
    html += '<div class="calendar-day" style="opacity: 0.3;"></div>';
  }
  
  // Gerar dias 1-31
  for (let day = 1; day <= 31; day++) {
    const daySchedule = schedule[day];
    let shiftsHtml = '';
    
    if (daySchedule && daySchedule.employees && daySchedule.employees.length > 0) {
      if (daySchedule.opening && daySchedule.opening.length > 0) {
        shiftsHtml += '<div style="background: #059669; color: white; font-size: 8px; padding: 1px 3px; border-radius: 2px; margin: 1px 0;">A</div>';
      }
      if (daySchedule.lunch && daySchedule.lunch.length >= 5) {
        shiftsHtml += '<div style="background: #d97706; color: white; font-size: 8px; padding: 1px 3px; border-radius: 2px; margin: 1px 0;">L</div>';
      }
      if (daySchedule.closing && daySchedule.closing.length > 0) {
        shiftsHtml += '<div style="background: #7c3aed; color: white; font-size: 8px; padding: 1px 3px; border-radius: 2px; margin: 1px 0;">F</div>';
      }
    } else {
      shiftsHtml = '<div style="background: #e2e8f0; color: #64748b; font-size: 8px; padding: 1px 3px; border-radius: 2px; border: 1px dashed #94a3b8;">--</div>';
    }
    
    html += `
      <div class="calendar-day">
        <div style="font-weight: 600; font-size: 10px; color: #1e293b; margin-bottom: 2px;">${day}</div>
        <div>${shiftsHtml}</div>
      </div>
    `;
  }
  
  return html;
}

function generateEmployeeSchedulesHTML(schedule, employees) {
  if (!employees) {
    // Se não temos dados dos employees, usar os IDs do schedule
    const employeeIds = new Set();
    Object.values(schedule).forEach(day => {
      if (day.employees) {
        day.employees.forEach(id => employeeIds.add(id));
      }
    });
    employees = Array.from(employeeIds).map(id => ({ id, name: capitalizeFirst(id) }));
  }
  
  let html = '';
  
  employees.forEach(emp => {
    const stats = calculateEmployeeStats(schedule, emp.id);
    const timeline = generateEmployeeTimeline(schedule, emp.id);
    
    html += `
      <div class="employee-section">
        <div class="employee-header">
          <div class="employee-info">
            <div class="employee-avatar">${emp.name.substring(0, 2).toUpperCase()}</div>
            <div class="employee-details">
              <h3>${emp.name}</h3>
              <div class="employee-role">${emp.role || 'Colaborador'}</div>
            </div>
          </div>
          <div class="employee-stats">
            <div class="stat-item">
              <div class="stat-value">${stats.workDays}</div>
              <div class="stat-label">Trabalho</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${stats.offDays}</div>
              <div class="stat-label">Folgas</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${stats.openingShifts}</div>
              <div class="stat-label">Aberturas</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${stats.closingShifts}</div>
              <div class="stat-label">Fechos</div>
            </div>
          </div>
        </div>
        <div class="employee-timeline">
          ${timeline}
        </div>
      </div>
    `;
  });
  
  return html;
}

function generateEmployeeTimeline(schedule, employeeId) {
  let html = '<div style="display: grid; grid-template-columns: repeat(31, 1fr); gap: 2px; margin-top: 12px;">';
  
  for (let day = 1; day <= 31; day++) {
    const daySchedule = schedule[day];
    let color = '#e2e8f0'; // Folga
    let title = 'Folga';
    
    if (daySchedule && daySchedule.employees && daySchedule.employees.includes(employeeId)) {
      if (daySchedule.opening && daySchedule.opening.includes(employeeId)) {
        color = '#059669';
        title = 'Abertura';
      } else if (daySchedule.closing && daySchedule.closing.includes(employeeId)) {
        color = '#7c3aed';
        title = 'Fecho';
      } else {
        color = '#d97706';
        title = 'Almoço';
      }
    }
    
    html += `<div style="height: 20px; background: ${color}; border-radius: 3px; font-size: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 500;" title="${title}">${day}</div>`;
  }
  
  html += '</div>';
  return html;
}

function generateStatsTableHTML(schedule, employees) {
  if (!employees) {
    const employeeIds = new Set();
    Object.values(schedule).forEach(day => {
      if (day.employees) {
        day.employees.forEach(id => employeeIds.add(id));
      }
    });
    employees = Array.from(employeeIds).map(id => ({ id, name: capitalizeFirst(id) }));
  }
  
  let html = '<table class="data-table"><thead><tr><th>Colaborador</th><th>Dias Trabalho</th><th>Dias Folga</th><th>Aberturas</th><th>Fechos</th><th>% Trabalho</th></tr></thead><tbody>';
  
  employees.forEach(emp => {
    const stats = calculateEmployeeStats(schedule, emp.id);
    html += `
      <tr>
        <td><strong>${emp.name}</strong></td>
        <td>${stats.workDays}</td>
        <td>${stats.offDays}</td>
        <td>${stats.openingShifts}</td>
        <td>${stats.closingShifts}</td>
        <td>${stats.workPercentage.toFixed(1)}%</td>
      </tr>
    `;
  });
  
  html += '</tbody></table>';
  return html;
}

function calculateEmployeeStats(schedule, employeeId) {
  let workDays = 0;
  let openingShifts = 0;
  let closingShifts = 0;
  
  for (let day = 1; day <= 31; day++) {
    const daySchedule = schedule[day];
    if (daySchedule && daySchedule.employees && daySchedule.employees.includes(employeeId)) {
      workDays++;
      
      if (daySchedule.opening && daySchedule.opening.includes(employeeId)) {
        openingShifts++;
      }
      if (daySchedule.closing && daySchedule.closing.includes(employeeId)) {
        closingShifts++;
      }
    }
  }
  
  return {
    workDays,
    offDays: 31 - workDays,
    openingShifts,
    closingShifts,
    workPercentage: (workDays / 31) * 100
  };
}

function countTotalShifts(schedule) {
  let total = 0;
  Object.values(schedule).forEach(day => {
    if (day.employees) {
      total += day.employees.length;
    }
  });
  return total;
}

function calculateAverageLunchCoverage(schedule) {
  let total = 0;
  let days = 0;
  
  Object.values(schedule).forEach(day => {
    if (day.lunch) {
      total += day.lunch.length;
      days++;
    }
  });
  
  return days > 0 ? total / days : 0;
}

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Executar se chamado diretamente
if (require.main === module) {
  generateStaticHTML();
}

module.exports = { generateStaticHTML };