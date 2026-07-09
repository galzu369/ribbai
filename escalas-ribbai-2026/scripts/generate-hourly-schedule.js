#!/usr/bin/env node

/**
 * Gerador de Horário por Horas - Estilo Grid Visual
 * Formato similar às imagens fornecidas pelo utilizador
 */

const fs = require('fs');
const path = require('path');

function generateHourlySchedule() {
  console.log('🕐 Gerando horário detalhado por horas...');
  
  // Definir horários de trabalho e colaboradores
  const workingHours = generateHourlySlots();
  const employees = [
    { id: 'bruno', name: 'Bruno', color: '#059669', role: 'Chefia' },
    { id: 'filipe', name: 'Filipe', color: '#0d9488', role: 'Chefia' },
    { id: 'carolina', name: 'Carolina', color: '#d97706', role: 'Experiente' },
    { id: 'pablo', name: 'Pablo', color: '#7c3aed', role: 'Zona 60s' },
    { id: 'lil', name: 'Lil', color: '#dc2626', role: 'Polivalente' },
    { id: 'matilde', name: 'Matilde', color: '#2563eb', role: 'Sala Interior' },
    { id: 'lee', name: 'Lee', color: '#16a34a', role: 'Desenvolvimento' },
    { id: 'diogo', name: 'Diogo', color: '#ca8a04', role: 'Desenvolvimento' }
  ];
  
  // Gerar padrão 4+2 corrigido com horários específicos
  const schedule = generateDetailedSchedule(employees);
  
  // Ler CSS base
  const cssPath = path.join(__dirname, '../src/templates/styles.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');
  
  // Gerar HTML com grid horário
  const htmlContent = generateHourlyHTML(schedule, employees, workingHours, cssContent);
  
  // Salvar HTML
  const outputPath = path.join(__dirname, '../output/schedule-hourly.html');
  fs.writeFileSync(outputPath, htmlContent, 'utf8');
  
  console.log('✅ Horário por horas gerado:', outputPath);
  return outputPath;
}

function generateHourlySlots() {
  const slots = [];
  
  // Gerar slots de 30 em 30 minutos das 8:30 às 24:00
  for (let hour = 8; hour <= 23; hour++) {
    if (hour === 8) {
      slots.push('8h30');
    } else {
      slots.push(`${hour}h`);
      if (hour < 23) {
        slots.push(`${hour}h30`);
      }
    }
  }
  
  // Adicionar meia-noite
  slots.push('0h00');
  
  return slots;
}

function generateDetailedSchedule(employees) {
  const schedule = {};
  
  console.log('📋 Gerando horários detalhados por colaborador...');
  
  for (let day = 1; day <= 31; day++) {
    schedule[day] = {
      day: day,
      employees: {}
    };
    
    employees.forEach((emp, index) => {
      const cycleDay = (day - 1 + index) % 6;
      const isWorking = cycleDay < 4; // Padrão 4+2
      
      if (isWorking) {
        const shifts = assignShiftsToEmployee(emp, day, employees, index);
        schedule[day].employees[emp.id] = {
          name: emp.name,
          shifts: shifts,
          totalHours: calculateTotalHours(shifts),
          color: emp.color
        };
      }
    });
  }
  
  return schedule;
}

function assignShiftsToEmployee(employee, day, allEmployees, empIndex) {
  const shifts = [];
  
  // Lógica baseada na experiência e rotação
  const isWeekend = getWeekday(day) === 0 || getWeekday(day) === 6; // Dom/Sáb
  const dayRotation = (day - 1) % allEmployees.length;
  
  // Chefias (Bruno/Filipe) - prioridade para abertura
  if (['bruno', 'filipe'].includes(employee.id)) {
    if (empIndex % 2 === dayRotation % 2) {
      shifts.push({ start: '9h00', end: '17h00', type: 'abertura_almoço' });
    } else {
      shifts.push({ start: '12h00', end: '24h00', type: 'almoço_fecho' });
    }
  }
  
  // Colaboradores experientes (Carolina, Pablo, Lil, Matilde)
  else if (['carolina', 'pablo', 'lil', 'matilde'].includes(employee.id)) {
    const rotation = (day + empIndex) % 3;
    
    if (rotation === 0) {
      shifts.push({ start: '9h00', end: '17h00', type: 'abertura_almoço' });
    } else if (rotation === 1) {
      shifts.push({ start: '11h00', end: '19h00', type: 'almoço' });
    } else {
      shifts.push({ start: '14h00', end: '24h00', type: 'almoço_fecho' });
    }
  }
  
  // Júniores (Lee, Diogo) - sempre com supervisão
  else if (['lee', 'diogo'].includes(employee.id)) {
    const rotation = (day + empIndex) % 2;
    
    if (rotation === 0) {
      shifts.push({ start: '11h00', end: '19h00', type: 'almoço_supervisão' });
    } else {
      shifts.push({ start: '13h00', end: '21h00', type: 'almoço_tarde' });
    }
  }
  
  return shifts;
}

function calculateTotalHours(shifts) {
  let total = 0;
  
  shifts.forEach(shift => {
    const start = parseTime(shift.start);
    const end = parseTime(shift.end);
    
    let duration = end - start;
    if (duration < 0) duration += 24; // Handle overnight shifts
    
    // Subtrair pausas (1h para turnos > 6h)
    if (duration > 6) {
      duration -= 1;
    }
    
    total += duration;
  });
  
  return total;
}

function parseTime(timeStr) {
  const match = timeStr.match(/(\d+)h(\d+)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1]);
  const minutes = match[2] ? parseInt(match[2]) : 0;
  
  return hours + (minutes / 60);
}

function getWeekday(day) {
  // 1 de julho 2026 é terça-feira (2)
  const firstDayWeekday = 2;
  return (firstDayWeekday + day - 1) % 7;
}

function generateHourlyHTML(schedule, employees, workingHours, cssContent) {
  return `<!DOCTYPE html>
<html lang="pt-PT">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RIBBAI 2.0 - Horário Detalhado por Horas | Julho 2026</title>
    <style>
    ${cssContent}
    
    /* Estilos específicos para grid horário */
    .hourly-container {
      overflow-x: auto;
      margin: 20px 0;
    }
    
    .hourly-grid {
      display: grid;
      grid-template-columns: 60px repeat(31, 1fr);
      gap: 1px;
      background: #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
      min-width: 1400px;
    }
    
    .hour-label {
      background: var(--navy-primary);
      color: white;
      padding: 4px 2px;
      font-size: 8px;
      font-weight: 600;
      text-align: center;
      writing-mode: vertical-rl;
      text-orientation: mixed;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .day-header {
      background: var(--teal-secondary);
      color: white;
      padding: 8px 2px;
      font-size: 9px;
      font-weight: 600;
      text-align: center;
      grid-row: 1;
    }
    
    .hour-cell {
      background: white;
      min-height: 16px;
      position: relative;
      border: 1px solid #f1f5f9;
    }
    
    .employee-block {
      position: absolute;
      left: 2px;
      right: 2px;
      height: 12px;
      border-radius: 2px;
      font-size: 6px;
      color: white;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      white-space: nowrap;
    }
    
    .employee-legend {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 8px;
      margin: 20px 0;
    }
    
    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px;
      background: white;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
    }
    
    .legend-color {
      width: 16px;
      height: 16px;
      border-radius: 3px;
    }
    
    .daily-summary {
      margin: 20px 0;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
    }
    
    .summary-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px;
    }
    
    .week-section {
      margin: 30px 0;
      page-break-inside: avoid;
    }
    
    .week-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--navy-primary);
      margin-bottom: 16px;
      padding: 8px 0;
      border-bottom: 2px solid var(--teal-secondary);
    }
    
    @media print {
      .week-section:nth-child(odd) { page-break-before: always; }
      .hourly-grid { font-size: 6px; }
      .employee-block { height: 10px; font-size: 5px; }
    }
    </style>
</head>
<body>
    <div class="executive-container">
        <!-- Header -->
        <header class="executive-header">
            <div class="brand-section">
                <div class="brand-logo">RB</div>
                <div class="brand-info">
                    <div class="brand-title">RIBBAI 2.0</div>
                    <div class="brand-subtitle">Horário Detalhado por Horas</div>
                </div>
            </div>
            <div class="document-info">
                <div class="document-title">Escalas Operacionais</div>
                <div class="document-period">Julho 2026 - Padrão 4+2</div>
                <div class="document-period">Gerado: ${new Date().toLocaleDateString('pt-PT')}</div>
            </div>
        </header>

        <!-- Legenda de Colaboradores -->
        <section>
            <h3 class="section-title">👥 Colaboradores e Cores</h3>
            <div class="employee-legend">
                ${employees.map(emp => `
                    <div class="legend-item">
                        <div class="legend-color" style="background: ${emp.color};"></div>
                        <div>
                            <strong>${emp.name}</strong><br>
                            <small style="color: #64748b;">${emp.role}</small>
                        </div>
                    </div>
                `).join('')}
            </div>
        </section>

        <!-- Primeira Quinzena -->
        <section class="week-section">
            <h2 class="week-title">📅 Primeira Quinzena (1-15 Julho 2026)</h2>
            ${generateWeeklyGrid(schedule, employees, workingHours, 1, 15)}
        </section>

        <!-- Segunda Quinzena -->
        <section class="week-section">
            <h2 class="week-title">📅 Segunda Quinzena (16-31 Julho 2026)</h2>
            ${generateWeeklyGrid(schedule, employees, workingHours, 16, 31)}
        </section>

        <!-- Resumo de Horas -->
        <section class="week-section">
            <h2 class="week-title">📊 Resumo Mensal de Horas</h2>
            ${generateMonthlySummary(schedule, employees)}
        </section>

        <!-- Footer -->
        <footer class="document-footer">
            <p>RIBBAI 2.0 © 2026 | Horário Detalhado por Horas - Julho 2026 | 
            ${new Date().toLocaleDateString('pt-PT')}</p>
        </footer>
    </div>
</body>
</html>`;
}

function generateWeeklyGrid(schedule, employees, workingHours, startDay, endDay) {
  const days = [];
  for (let day = startDay; day <= endDay; day++) {
    days.push(day);
  }
  
  let gridHTML = '<div class="hourly-container"><div class="hourly-grid">';
  
  // Header vazio para primeira coluna
  gridHTML += '<div></div>';
  
  // Headers dos dias
  days.forEach(day => {
    const date = new Date(2026, 6, day);
    const dayName = date.toLocaleDateString('pt-PT', { weekday: 'short' });
    gridHTML += `<div class="day-header">${day}<br>${dayName}</div>`;
  });
  
  // Grid de horas
  workingHours.forEach((hour, hourIndex) => {
    // Label da hora
    gridHTML += `<div class="hour-label">${hour}</div>`;
    
    // Células para cada dia
    days.forEach(day => {
      gridHTML += `<div class="hour-cell">${generateHourCell(schedule, day, hourIndex, workingHours[hourIndex])}</div>`;
    });
  });
  
  gridHTML += '</div></div>';
  
  // Adicionar resumo diário
  gridHTML += '<div class="daily-summary">';
  days.forEach(day => {
    const dayData = schedule[day];
    const totalEmployees = Object.keys(dayData.employees).length;
    const totalHours = Object.values(dayData.employees).reduce((sum, emp) => sum + emp.totalHours, 0);
    
    gridHTML += `
      <div class="summary-card">
        <h4>Dia ${day}</h4>
        <div style="font-size: 12px; color: #64748b;">
          ${totalEmployees} colaboradores<br>
          ${totalHours.toFixed(1)}h total
        </div>
      </div>
    `;
  });
  gridHTML += '</div>';
  
  return gridHTML;
}

function generateHourCell(schedule, day, hourIndex, hourStr) {
  const dayData = schedule[day];
  if (!dayData) return '';
  
  const currentHour = parseTime(hourStr);
  let cellHTML = '';
  let employeeCount = 0;
  
  Object.entries(dayData.employees).forEach(([empId, empData]) => {
    empData.shifts.forEach(shift => {
      const shiftStart = parseTime(shift.start);
      let shiftEnd = parseTime(shift.end);
      
      // Handle overnight shifts
      if (shiftEnd < shiftStart) shiftEnd += 24;
      
      // Check if current hour is within shift
      let checkHour = currentHour;
      if (currentHour < shiftStart && shiftEnd > 12) checkHour += 24;
      
      if (checkHour >= shiftStart && checkHour < shiftEnd) {
        const topOffset = employeeCount * 13;
        cellHTML += `
          <div class="employee-block" 
               style="background: ${empData.color}; top: ${topOffset}px;">
            ${empData.name.substring(0, 3)}
          </div>
        `;
        employeeCount++;
      }
    });
  });
  
  return cellHTML;
}

function generateMonthlySummary(schedule, employees) {
  let summaryHTML = '<div class="daily-summary">';
  
  employees.forEach(emp => {
    let totalHours = 0;
    let workDays = 0;
    
    for (let day = 1; day <= 31; day++) {
      const dayData = schedule[day];
      if (dayData && dayData.employees[emp.id]) {
        totalHours += dayData.employees[emp.id].totalHours;
        workDays++;
      }
    }
    
    const avgHours = workDays > 0 ? totalHours / workDays : 0;
    
    summaryHTML += `
      <div class="summary-card">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <div class="legend-color" style="background: ${emp.color}; width: 12px; height: 12px;"></div>
          <strong>${emp.name}</strong>
        </div>
        <div style="font-size: 11px; color: #64748b;">
          <div>${workDays} dias de trabalho</div>
          <div>${totalHours.toFixed(1)}h total</div>
          <div>${avgHours.toFixed(1)}h média/dia</div>
          <div style="margin-top: 4px; color: #059669;">
            <strong>${(totalHours/40).toFixed(1)} semanas</strong>
          </div>
        </div>
      </div>
    `;
  });
  
  summaryHTML += '</div>';
  return summaryHTML;
}

// Executar se chamado diretamente
if (require.main === module) {
  generateHourlySchedule();
}

module.exports = { generateHourlySchedule };