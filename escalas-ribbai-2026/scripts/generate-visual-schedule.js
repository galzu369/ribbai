#!/usr/bin/env node

/**
 * Gerador de Horário Visual Detalhado
 * Tabela estilo Excel com horários específicos por colaborador
 */

const fs = require('fs');
const path = require('path');

function generateVisualSchedule() {
  console.log('📊 Gerando horário visual detalhado...');
  
  // Ler dados da escala
  const dataPath = path.join(__dirname, '../output/schedule-data.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  
  // Analisar problemas no padrão atual
  console.log('🔍 Analisando padrões de trabalho...');
  analyzeWorkPatterns(data.schedule);
  
  // Gerar escala corrigida com padrão 4+2 rigoroso
  console.log('🔧 Corrigindo padrão 4+2...');
  const correctedSchedule = generateCorrected42Pattern();
  
  // Ler CSS
  const cssPath = path.join(__dirname, '../src/templates/styles.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');
  
  // Gerar HTML com tabela visual
  const htmlContent = generateVisualHTML(correctedSchedule, cssContent);
  
  // Salvar HTML
  const outputPath = path.join(__dirname, '../output/schedule-visual.html');
  fs.writeFileSync(outputPath, htmlContent, 'utf8');
  
  console.log('✅ Horário visual gerado:', outputPath);
  
  // Salvar dados corrigidos
  const correctedDataPath = path.join(__dirname, '../output/schedule-corrected.json');
  fs.writeFileSync(correctedDataPath, JSON.stringify({
    schedule: correctedSchedule,
    metadata: {
      generatedAt: new Date().toISOString(),
      pattern: '4 dias trabalho + 2 dias folga',
      corrected: true
    }
  }, null, 2), 'utf8');
  
  console.log('✅ Dados corrigidos salvos:', correctedDataPath);
  
  return outputPath;
}

function analyzeWorkPatterns(schedule) {
  const employees = ['bruno', 'filipe', 'carolina', 'pablo', 'lil', 'matilde', 'lee', 'diogo'];
  
  console.log('\n📋 ANÁLISE DE PADRÕES ATUAIS:');
  console.log('═══════════════════════════════');
  
  employees.forEach(emp => {
    const pattern = getWorkPattern(schedule, emp);
    const stats = analyzePattern(pattern);
    
    console.log(`\n👤 ${emp.toUpperCase()}:`);
    console.log(`   Trabalho: ${stats.workDays} dias | Folgas: ${stats.offDays} dias`);
    console.log(`   Maior sequência trabalho: ${stats.maxWork} dias`);
    console.log(`   Maior sequência folga: ${stats.maxOff} dias`);
    console.log(`   Padrão 4+2: ${stats.follows42 ? '✅ SIM' : '❌ NÃO'}`);
    
    if (!stats.follows42) {
      console.log(`   ⚠️ PROBLEMAS: ${stats.issues.join(', ')}`);
    }
  });
}

function getWorkPattern(schedule, employeeId) {
  const pattern = [];
  for (let day = 1; day <= 31; day++) {
    const daySchedule = schedule[day];
    const isWorking = daySchedule && daySchedule.employees && daySchedule.employees.includes(employeeId);
    pattern.push(isWorking ? 'W' : 'O');
  }
  return pattern;
}

function analyzePattern(pattern) {
  let workDays = 0;
  let offDays = 0;
  let currentWorkStreak = 0;
  let currentOffStreak = 0;
  let maxWork = 0;
  let maxOff = 0;
  let issues = [];
  
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === 'W') {
      workDays++;
      currentWorkStreak++;
      currentOffStreak = 0;
      maxWork = Math.max(maxWork, currentWorkStreak);
    } else {
      offDays++;
      currentOffStreak++;
      currentWorkStreak = 0;
      maxOff = Math.max(maxOff, currentOffStreak);
    }
    
    // Verificar violações
    if (currentWorkStreak > 4) {
      issues.push(`Mais de 4 dias consecutivos (dia ${i+1})`);
    }
    if (currentOffStreak === 1 && i < pattern.length - 1 && pattern[i+1] === 'W') {
      issues.push(`Folga isolada (dia ${i+1})`);
    }
  }
  
  const follows42 = maxWork <= 4 && issues.length === 0;
  
  return {
    workDays,
    offDays,
    maxWork,
    maxOff,
    follows42,
    issues: [...new Set(issues)]
  };
}

function generateCorrected42Pattern() {
  const employees = [
    { id: 'bruno', name: 'Bruno', startOffset: 0 },
    { id: 'filipe', name: 'Filipe', startOffset: 1 },
    { id: 'carolina', name: 'Carolina', startOffset: 2 },
    { id: 'pablo', name: 'Pablo', startOffset: 3 },
    { id: 'lil', name: 'Lil', startOffset: 4 },
    { id: 'matilde', name: 'Matilde', startOffset: 5 },
    { id: 'lee', name: 'Lee', startOffset: 0 },
    { id: 'diogo', name: 'Diogo', startOffset: 1 }
  ];
  
  const schedule = {};
  
  console.log('\n🔧 GERANDO PADRÃO 4+2 CORRIGIDO:');
  console.log('═══════════════════════════════════');
  
  // Gerar padrão 4+2 para cada colaborador
  employees.forEach(emp => {
    console.log(`\n👤 ${emp.name}: Offset ${emp.startOffset}`);
    const pattern = [];
    
    for (let day = 1; day <= 31; day++) {
      const cycleDay = (day - 1 + emp.startOffset) % 6;
      const isWorking = cycleDay < 4; // 0,1,2,3 = trabalho, 4,5 = folga
      pattern.push(isWorking ? 'W' : 'O');
    }
    
    console.log(`   Padrão: ${pattern.join('')}`);
    
    // Aplicar ao schedule
    for (let day = 1; day <= 31; day++) {
      if (!schedule[day]) {
        schedule[day] = {
          day: day,
          employees: [],
          opening: [],
          lunch: [],
          closing: []
        };
      }
      
      if (pattern[day - 1] === 'W') {
        schedule[day].employees.push(emp.id);
      }
    }
  });
  
  // Atribuir turnos específicos com base na experiência
  for (let day = 1; day <= 31; day++) {
    const daySchedule = schedule[day];
    const workingEmployees = daySchedule.employees;
    
    if (workingEmployees.length >= 2) {
      // Abertura: Priorizar Bruno e Filipe (chefias)
      const chefias = workingEmployees.filter(id => ['bruno', 'filipe'].includes(id));
      const experienced = workingEmployees.filter(id => ['carolina', 'pablo', 'lil', 'matilde'].includes(id));
      
      if (chefias.length >= 2) {
        daySchedule.opening = chefias.slice(0, 2);
      } else if (chefias.length === 1) {
        daySchedule.opening = [chefias[0], experienced[0] || workingEmployees[1]];
      } else {
        daySchedule.opening = workingEmployees.slice(0, 2);
      }
    }
    
    // Almoço: Todos os que trabalham (garantir mínimo 5)
    daySchedule.lunch = workingEmployees;
    
    // Se menos de 5, não é dia válido operacionalmente
    if (workingEmployees.length < 5) {
      console.log(`⚠️ Dia ${day}: Apenas ${workingEmployees.length} colaboradores (mínimo 5 para almoço)`);
    }
    
    // Fecho: 3 colaboradores, evitar sempre os mesmos
    if (workingEmployees.length >= 3) {
      // Rotacionar fechos para não sobrecarregar
      const closingRotation = (day - 1) % workingEmployees.length;
      daySchedule.closing = [
        workingEmployees[closingRotation],
        workingEmployees[(closingRotation + 1) % workingEmployees.length],
        workingEmployees[(closingRotation + 2) % workingEmployees.length]
      ];
    }
  }
  
  return schedule;
}

function generateVisualHTML(schedule, cssContent) {
  const employees = [
    { id: 'bruno', name: 'Bruno', role: 'Chefia' },
    { id: 'filipe', name: 'Filipe', role: 'Chefia' },
    { id: 'carolina', name: 'Carolina', role: 'Experiente' },
    { id: 'pablo', name: 'Pablo', role: 'Zona 60s' },
    { id: 'lil', name: 'Lil', role: 'Polivalente' },
    { id: 'matilde', name: 'Matilde', role: 'Sala Interior' },
    { id: 'lee', name: 'Lee', role: 'Desenvolvimento' },
    { id: 'diogo', name: 'Diogo', role: 'Desenvolvimento' }
  ];
  
  return `<!DOCTYPE html>
<html lang="pt-PT">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RIBBAI 2.0 - Horário Visual Detalhado | Julho 2026</title>
    <style>
    ${cssContent}
    
    /* Estilos específicos para tabela visual */
    .visual-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8px;
      margin: 20px 0;
    }
    
    .visual-table th,
    .visual-table td {
      border: 1px solid #e2e8f0;
      padding: 4px 2px;
      text-align: center;
      vertical-align: middle;
    }
    
    .visual-table th {
      background: var(--navy-primary);
      color: white;
      font-weight: 600;
      font-size: 9px;
    }
    
    .employee-header {
      background: var(--surface-light);
      font-weight: 600;
      font-size: 9px;
      text-align: left;
      padding: 4px 6px;
      width: 80px;
    }
    
    .day-header {
      writing-mode: vertical-rl;
      text-orientation: mixed;
      width: 16px;
      font-size: 8px;
    }
    
    .shift-cell {
      font-size: 7px;
      font-weight: 600;
      color: white;
      padding: 2px;
      line-height: 1;
    }
    
    .opening { background: #059669; }
    .lunch { background: #d97706; }
    .closing { background: #7c3aed; }
    .off { background: #e2e8f0; color: #64748b; }
    .multiple { background: linear-gradient(45deg, #059669 25%, #d97706 25%, #d97706 50%, #7c3aed 50%, #7c3aed 75%, #059669 75%); }
    
    .week-break {
      page-break-before: always;
    }
    
    .summary-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 10px;
      margin: 20px 0;
    }
    
    .stat-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px;
      text-align: center;
    }
    
    @media print {
      .week-break { page-break-before: always; }
      .visual-table { font-size: 7px; }
      .shift-cell { font-size: 6px; }
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
                    <div class="brand-subtitle">Horário Visual Detalhado</div>
                </div>
            </div>
            <div class="document-info">
                <div class="document-title">Escalas Operacionais</div>
                <div class="document-period">Julho 2026 - Padrão 4+2 Corrigido</div>
            </div>
        </header>

        <!-- Legenda -->
        <section style="margin: 20px 0;">
            <h3 class="section-title">📋 Legenda de Horários</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="shift-cell opening">A</span>
                    <span><strong>Abertura:</strong> 09:00 (2 pessoas)</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="shift-cell lunch">L</span>
                    <span><strong>Almoço:</strong> 12:00-16:30 (5+ pessoas)</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="shift-cell closing">F</span>
                    <span><strong>Fecho:</strong> 23:00 (3 pessoas)</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="shift-cell off">-</span>
                    <span><strong>Folga:</strong> Dia de descanso</span>
                </div>
            </div>
        </section>

        <!-- Primeira Quinzena: 1-15 Julho -->
        <section>
            <h2 class="section-title">📅 Primeira Quinzena (1-15 Julho 2026)</h2>
            ${generateWeeklyTable(schedule, employees, 1, 15)}
        </section>

        <!-- Segunda Quinzena: 16-31 Julho -->
        <section class="week-break">
            <h2 class="section-title">📅 Segunda Quinzena (16-31 Julho 2026)</h2>
            ${generateWeeklyTable(schedule, employees, 16, 31)}
        </section>

        <!-- Estatísticas Resumo -->
        <section class="week-break">
            <h2 class="section-title">📊 Estatísticas do Padrão 4+2</h2>
            ${generateStatsHTML(schedule, employees)}
        </section>

        <!-- Footer -->
        <footer class="document-footer">
            <p>RIBBAI 2.0 © 2026 | Horário Visual Detalhado - Padrão 4+2 Rigoroso | 
            ${new Date().toLocaleDateString('pt-PT')}</p>
        </footer>
    </div>
</body>
</html>`;
}

function generateWeeklyTable(schedule, employees, startDay, endDay) {
  const days = [];
  for (let day = startDay; day <= endDay; day++) {
    days.push(day);
  }
  
  // Headers dos dias
  let headerHTML = '<tr><th class="employee-header">Colaborador</th>';
  days.forEach(day => {
    const date = new Date(2026, 6, day); // Julho = mês 6
    const dayName = date.toLocaleDateString('pt-PT', { weekday: 'short' });
    headerHTML += `<th class="day-header">${day}<br>${dayName}</th>`;
  });
  headerHTML += '</tr>';
  
  // Linhas dos colaboradores
  let rowsHTML = '';
  employees.forEach(emp => {
    rowsHTML += `<tr><td class="employee-header">${emp.name}<br><small style="color: #64748b;">${emp.role}</small></td>`;
    
    days.forEach(day => {
      const daySchedule = schedule[day];
      const cell = getEmployeeShiftCell(daySchedule, emp.id);
      rowsHTML += cell;
    });
    
    rowsHTML += '</tr>';
  });
  
  return `<table class="visual-table">${headerHTML}${rowsHTML}</table>`;
}

function getEmployeeShiftCell(daySchedule, employeeId) {
  if (!daySchedule || !daySchedule.employees.includes(employeeId)) {
    return '<td class="shift-cell off">-</td>';
  }
  
  const shifts = [];
  if (daySchedule.opening && daySchedule.opening.includes(employeeId)) {
    shifts.push('A');
  }
  if (daySchedule.lunch && daySchedule.lunch.includes(employeeId)) {
    shifts.push('L');
  }
  if (daySchedule.closing && daySchedule.closing.includes(employeeId)) {
    shifts.push('F');
  }
  
  if (shifts.length === 0) {
    return '<td class="shift-cell lunch">L</td>'; // Default para almoço se trabalha
  }
  
  if (shifts.length === 1) {
    const shiftClass = shifts[0] === 'A' ? 'opening' : shifts[0] === 'L' ? 'lunch' : 'closing';
    return `<td class="shift-cell ${shiftClass}">${shifts[0]}</td>`;
  }
  
  // Múltiplos turnos
  return `<td class="shift-cell multiple">${shifts.join('')}</td>`;
}

function generateStatsHTML(schedule, employees) {
  let html = '<div class="summary-stats">';
  
  employees.forEach(emp => {
    const stats = calculateEmployeeStats42(schedule, emp.id);
    html += `
      <div class="stat-card">
        <h4>${emp.name}</h4>
        <div style="font-size: 12px; color: #64748b; margin: 4px 0;">${emp.role}</div>
        <div style="font-size: 14px; font-weight: 600; color: #1e293b;">
          ${stats.workDays} trabalho / ${stats.offDays} folga
        </div>
        <div style="font-size: 10px; margin-top: 4px;">
          Max. consecutivo: ${stats.maxConsecutiveWork} dias
        </div>
        <div style="font-size: 10px; color: ${stats.follows42 ? '#059669' : '#dc2626'};">
          ${stats.follows42 ? '✅ Padrão 4+2 OK' : '❌ Não conforme'}
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  return html;
}

function calculateEmployeeStats42(schedule, employeeId) {
  let workDays = 0;
  let maxConsecutiveWork = 0;
  let currentConsecutive = 0;
  
  for (let day = 1; day <= 31; day++) {
    const daySchedule = schedule[day];
    const isWorking = daySchedule && daySchedule.employees.includes(employeeId);
    
    if (isWorking) {
      workDays++;
      currentConsecutive++;
      maxConsecutiveWork = Math.max(maxConsecutiveWork, currentConsecutive);
    } else {
      currentConsecutive = 0;
    }
  }
  
  return {
    workDays,
    offDays: 31 - workDays,
    maxConsecutiveWork,
    follows42: maxConsecutiveWork <= 4
  };
}

// Executar se chamado diretamente
if (require.main === module) {
  generateVisualSchedule();
}

module.exports = { generateVisualSchedule };