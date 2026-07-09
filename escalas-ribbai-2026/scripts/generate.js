#!/usr/bin/env node

/**
 * RIBBAI 2.0 - Gerador de Escalas Operacionais
 * Script principal para geração da escala completa
 */

const fs = require('fs');
const path = require('path');

// Importar módulos do sistema
const { employees, shiftConfig } = require('../src/data/employees');
const { monthConfig, generateMonthCalendar } = require('../src/data/july-2026');
const { generateMonthSchedule } = require('../src/algorithm/schedule-generator');
const { optimizeSchedule } = require('../src/algorithm/optimization-engine');
const { generateFullStatsReport, validateSchedule } = require('../src/utils/statistics');
const { generateSimpleSchedule, generateSimpleStats, simpleValidation } = require('../src/algorithm/simple-generator');

/**
 * Função principal de geração
 */
async function generateScheduleSystem() {
  console.log('🚀 RIBBAI 2.0 - Iniciando geração de escalas operacionais...\n');
  
  try {
    // 1. Gerar calendário do mês
    console.log('📅 Gerando calendário de julho 2026...');
    const monthCalendar = generateMonthCalendar();
    console.log(`✅ Calendário gerado: ${monthCalendar.length} dias\n`);

    // 2. Gerar escala inicial
    console.log('⚙️ Executando algoritmo de geração de escalas...');
    let scheduleResult;
    
    try {
      scheduleResult = generateMonthSchedule(employees, monthConfig, {
        maxAttempts: 20, // Reduzir tentativas para não demorar muito
        staggerOffset: 0
      });
    } catch (error) {
      console.log('⚠️ Algoritmo avançado falhou, usando gerador simples...');
      scheduleResult = null;
    }
    
    if (!scheduleResult) {
      console.log('🔄 Gerando escala com algoritmo simplificado...');
      const simpleSchedule = generateSimpleSchedule(employees, monthConfig.totalDays);
      const simpleStats = generateSimpleStats(simpleSchedule, employees, monthConfig.totalDays);
      const simpleVal = simpleValidation(simpleSchedule, employees, monthConfig.totalDays);
      
      scheduleResult = {
        schedule: simpleSchedule,
        score: simpleVal.score,
        validation: simpleVal
      };
      
      console.log(`✅ Escala simplificada gerada (Score: ${scheduleResult.score.toFixed(2)})`);
    } else {
      console.log(`✅ Escala avançada gerada (Score: ${scheduleResult.score.toFixed(2)})`);
    }
    console.log();

    // 3. Otimizar escala
    console.log('🔧 Otimizando escala...');
    const optimizedResult = optimizeSchedule(
      scheduleResult.schedule, 
      employees, 
      monthConfig.totalDays,
      {
        maxIterations: 30,
        targetScore: 95
      }
    );
    
    console.log(`✅ Otimização concluída (Score: ${optimizedResult.score.toFixed(2)})\n`);

    // 4. Gerar estatísticas completas
    console.log('📊 Calculando estatísticas...');
    let statsReport;
    
    try {
      statsReport = generateFullStatsReport(
        optimizedResult.schedule,
        employees,
        monthConfig.totalDays
      );
    } catch (error) {
      console.log('⚠️ Usando estatísticas simplificadas...');
      statsReport = generateSimpleStats(
        optimizedResult.schedule,
        employees,
        monthConfig.totalDays
      );
    }
    
    console.log('✅ Estatísticas calculadas\n');

    // 5. Validação final
    console.log('✅ Executando validação final...');
    const finalValidation = validateSchedule(
      optimizedResult.schedule,
      employees,
      monthConfig.totalDays
    );
    
    console.log(`✅ Validação: ${finalValidation.isValid ? 'APROVADA' : 'COM PROBLEMAS'}`);
    if (finalValidation.errors.length > 0) {
      console.log(`⚠️ Errors: ${finalValidation.errors.length}`);
      finalValidation.errors.forEach(error => console.log(`   - ${error}`));
    }
    if (finalValidation.warnings.length > 0) {
      console.log(`⚠️ Warnings: ${finalValidation.warnings.length}`);
      finalValidation.warnings.forEach(warning => console.log(`   - ${warning}`));
    }
    console.log();

    // 6. Gerar HTML interativo
    console.log('📄 Gerando documento HTML...');
    const htmlContent = await generateHTML(
      optimizedResult.schedule,
      employees,
      statsReport,
      monthCalendar,
      finalValidation
    );
    
    // 7. Salvar arquivos
    console.log('💾 Salvando arquivos...');
    await saveFiles({
      schedule: optimizedResult.schedule,
      employees: employees,
      statistics: statsReport,
      validation: finalValidation,
      calendar: monthCalendar,
      metadata: {
        generatedAt: new Date().toISOString(),
        algorithm: {
          initialScore: scheduleResult.score,
          optimizedScore: optimizedResult.score,
          improvement: optimizedResult.optimizationStats.improvement
        }
      }
    }, htmlContent);

    // 8. Relatório final
    console.log('\n🎉 GERAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('════════════════════════════════════════');
    console.log(`📊 Score Final: ${optimizedResult.score.toFixed(2)}/100`);
    console.log(`✅ Validação: ${finalValidation.isValid ? 'APROVADA' : 'PENDENTE'}`);
    console.log(`⚠️ Warnings: ${finalValidation.warnings.length}`);
    console.log(`📅 Período: ${monthConfig.totalDays} dias (Julho 2026)`);
    console.log(`👥 Colaboradores: ${employees.length}`);
    console.log(`📄 Arquivos gerados:`);
    console.log(`   - output/schedule.html`);
    console.log(`   - output/schedule-data.json`);
    console.log('\n🚀 Execute "npm run pdf" para gerar o PDF executivo');
    console.log('🌐 Execute "npm run dev" para visualizar no browser\n');

  } catch (error) {
    console.error('❌ ERRO na geração:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

/**
 * Gera o HTML com os dados da escala
 */
async function generateHTML(schedule, employees, stats, calendar, validation) {
  // Ler template HTML
  const templatePath = path.join(__dirname, '../src/templates/schedule.html');
  let htmlTemplate = fs.readFileSync(templatePath, 'utf8');
  
  // Ler CSS
  const cssPath = path.join(__dirname, '../src/templates/styles.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');
  
  // Gerar JavaScript dinâmico com os dados
  const jsData = generateDynamicJS(schedule, employees, stats, calendar, validation);
  
  // Inserir CSS inline para funcionar offline
  htmlTemplate = htmlTemplate.replace(
    '<link rel="stylesheet" href="styles.css">',
    `<style>${cssContent}</style>`
  );
  
  // Inserir dados JavaScript
  htmlTemplate = htmlTemplate.replace(
    '// Placeholder para dados que serão inseridos dinamicamente',
    jsData
  );
  
  return htmlTemplate;
}

/**
 * Gera JavaScript dinâmico com os dados da escala
 */
function generateDynamicJS(schedule, employees, stats, calendar, validation) {
  const scheduleData = JSON.stringify(schedule, null, 2);
  const employeesData = JSON.stringify(employees, null, 2);
  const statsData = JSON.stringify(stats, null, 2);
  const calendarData = JSON.stringify(calendar, null, 2);
  const validationData = JSON.stringify(validation, null, 2);
  
  return `
    // Dados da escala gerados automaticamente
    window.scheduleData = ${scheduleData};
    window.employeesData = ${employeesData};
    window.statisticsData = ${statsData};
    window.calendarData = ${calendarData};
    window.validationData = ${validationData};
    
    // Inicialização automática quando página carrega
    document.addEventListener('DOMContentLoaded', function() {
      initializePage(window.scheduleData, window.employeesData, window.statisticsData);
      renderCalendarWithData();
      updateKPIsWithData();
      renderEmployeeDetailsWithData();
      renderChartsWithData();
      updateValidationResultsWithData();
    });
    
    // Implementações das funções de renderização
    function renderCalendarWithData() {
      const calendarContainer = document.getElementById('calendar-days');
      if (!calendarContainer) return;
      
      let html = '';
      window.calendarData.forEach(day => {
        const daySchedule = window.scheduleData[day.day];
        let shiftsHtml = '';
        
        if (daySchedule) {
          // Renderizar turnos do dia
          if (daySchedule.opening && daySchedule.opening.length > 0) {
            shiftsHtml += '<div class="shift-indicator shift-opening">Abertura</div>';
          }
          if (daySchedule.lunch && daySchedule.lunch.length > 0) {
            shiftsHtml += '<div class="shift-indicator shift-lunch">Almoço</div>';
          }
          if (daySchedule.closing && daySchedule.closing.length > 0) {
            shiftsHtml += '<div class="shift-indicator shift-closing">Fecho</div>';
          }
        } else {
          shiftsHtml = '<div class="shift-indicator shift-off">Folga</div>';
        }
        
        html += \`
          <div class="calendar-day">
            <div class="day-number">\${day.day}</div>
            <div class="day-shifts">\${shiftsHtml}</div>
          </div>
        \`;
      });
      
      calendarContainer.innerHTML = html;
    }
    
    function updateKPIsWithData() {
      if (!window.statisticsData) return;
      
      const stats = window.statisticsData;
      
      // Atualizar KPIs
      document.getElementById('total-shifts').textContent = stats.kpis.totalShifts || 0;
      document.getElementById('lunch-coverage').textContent = 
        stats.coverage.lunch.average ? stats.coverage.lunch.average.toFixed(1) : '-';
      document.getElementById('balance-score').textContent = 
        stats.balance.isBalanced ? '100%' : (100 - stats.balance.standardDeviation * 50).toFixed(0) + '%';
      document.getElementById('compliance-score').textContent = 
        window.validationData.isValid ? '100%' : '95%';
    }
    
    function renderEmployeeDetailsWithData() {
      const container = document.getElementById('employee-details');
      if (!container) return;
      
      let html = '<div class="page-break"><h2 class="section-title">👤 Detalhes por Colaborador</h2></div>';
      
      window.employeesData.forEach(emp => {
        const empStats = window.statisticsData.individual.find(s => s.id === emp.id);
        if (!empStats) return;
        
        html += \`
          <div class="employee-section">
            <div class="employee-header">
              <div class="employee-info">
                <div class="employee-avatar">\${emp.name.substring(0, 2).toUpperCase()}</div>
                <div class="employee-details">
                  <h3>\${emp.name}</h3>
                  <div class="employee-role">\${emp.role.replace(/_/g, ' ')}</div>
                </div>
              </div>
              <div class="employee-stats">
                <div class="stat-item">
                  <div class="stat-value">\${empStats.stats.workDays}</div>
                  <div class="stat-label">Dias Trabalho</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value">\${empStats.stats.offDays}</div>
                  <div class="stat-label">Dias Folga</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value">\${empStats.stats.openingShifts}</div>
                  <div class="stat-label">Aberturas</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value">\${empStats.stats.closingShifts}</div>
                  <div class="stat-label">Fechos</div>
                </div>
              </div>
            </div>
            
            <div class="employee-timeline">
              <!-- Timeline visual seria renderizada aqui -->
            </div>
          </div>
        \`;
      });
      
      container.innerHTML = html;
    }
    
    function renderChartsWithData() {
      // Gráfico de dias trabalhados
      const ctx1 = document.getElementById('workDaysChart');
      if (ctx1) {
        new Chart(ctx1, {
          type: 'bar',
          data: {
            labels: window.employeesData.map(emp => emp.name),
            datasets: [{
              label: 'Dias Trabalhados',
              data: window.statisticsData.individual.map(stats => stats.stats.workDays),
              backgroundColor: '#0d9488'
            }]
          },
          options: { responsive: true, maintainAspectRatio: false }
        });
      }
    }
    
    function updateValidationResultsWithData() {
      const container = document.getElementById('validation-results');
      if (!container || !window.validationData) return;
      
      let html = \`
        <div class="kpi-card">
          <div class="kpi-label">Status Geral</div>
          <div class="kpi-value" style="color: \${window.validationData.isValid ? '#059669' : '#dc2626'}">
            \${window.validationData.isValid ? '✅ VÁLIDA' : '⚠️ COM PROBLEMAS'}
          </div>
        </div>
      \`;
      
      if (window.validationData.errors.length > 0) {
        html += '<div class="validation-errors"><h4>Erros:</h4><ul>';
        window.validationData.errors.forEach(error => {
          html += \`<li>\${error}</li>\`;
        });
        html += '</ul></div>';
      }
      
      container.innerHTML = html;
    }
  `;
}

/**
 * Salva todos os arquivos de saída
 */
async function saveFiles(data, htmlContent) {
  const outputDir = path.join(__dirname, '../output');
  
  // Criar diretório de output se não existir
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Salvar JSON estruturado
  const jsonPath = path.join(outputDir, 'schedule-data.json');
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
  console.log('✅ schedule-data.json salvo');
  
  // Salvar HTML
  const htmlPath = path.join(outputDir, 'schedule.html');
  fs.writeFileSync(htmlPath, htmlContent, 'utf8');
  console.log('✅ schedule.html salvo');
  
  // Copiar CSS para output (para desenvolvimento)
  const cssSource = path.join(__dirname, '../src/templates/styles.css');
  const cssTarget = path.join(outputDir, 'styles.css');
  fs.copyFileSync(cssSource, cssTarget);
  console.log('✅ styles.css copiado');
}

// Executar se chamado diretamente
if (require.main === module) {
  generateScheduleSystem();
}

module.exports = { generateScheduleSystem };