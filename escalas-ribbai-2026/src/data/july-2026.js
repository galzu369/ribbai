/**
 * Calendário de Julho 2026
 * Dados temporais e configuração do mês
 */

const { format, getDay, getDaysInMonth } = require('date-fns');

/**
 * Configuração do mês de Julho 2026
 */
const monthConfig = {
  year: 2026,
  month: 7, // Julho (1-based)
  totalDays: 31,
  startDate: new Date(2026, 6, 1), // 1 de julho de 2026
  endDate: new Date(2026, 6, 31)   // 31 de julho de 2026
};

/**
 * Gera array completo dos dias do mês com metadata
 */
function generateMonthCalendar() {
  const days = [];
  
  for (let day = 1; day <= monthConfig.totalDays; day++) {
    const date = new Date(2026, 6, day); // Mês 6 = Julho (0-based)
    const dayOfWeek = getDay(date); // 0 = Domingo, 1 = Segunda, etc.
    
    days.push({
      day: day,
      date: date,
      dateString: format(date, 'yyyy-MM-dd'),
      dayOfWeek: dayOfWeek,
      dayName: getDayName(dayOfWeek),
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      week: Math.ceil((day + getDay(new Date(2026, 6, 1)) - 1) / 7)
    });
  }
  
  return days;
}

/**
 * Nomes dos dias da semana
 */
function getDayName(dayOfWeek) {
  const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  return days[dayOfWeek];
}

/**
 * Feriados e dias especiais em Julho 2026
 */
const specialDays = {
  // Sem feriados nacionais em julho em Portugal
  // Mas pode haver dias com maior/menor movimento previsto
  highTrafficDays: [
    5,  // Sábado
    6,  // Domingo  
    12, // Sábado
    13, // Domingo
    19, // Sábado
    20, // Domingo
    26, // Sábado
    27  // Domingo
  ],
  lowTrafficDays: [
    // Segundas podem ter menos movimento
    7, 14, 21, 28
  ]
};

/**
 * Configuração de demanda por dia da semana
 */
const demandConfig = {
  0: { // Domingo
    opening: 2,
    lunch: 6,    // Mais pessoal no domingo
    closing: 3
  },
  1: { // Segunda
    opening: 2,
    lunch: 5,
    closing: 3
  },
  2: { // Terça
    opening: 2,
    lunch: 5,
    closing: 3
  },
  3: { // Quarta
    opening: 2,
    lunch: 5,
    closing: 3
  },
  4: { // Quinta
    opening: 2,
    lunch: 5,
    closing: 3
  },
  5: { // Sexta
    opening: 2,
    lunch: 6,    // Mais pessoal na sexta
    closing: 3
  },
  6: { // Sábado
    opening: 2,
    lunch: 6,    // Mais pessoal no sábado
    closing: 3
  }
};

/**
 * Padrão de ciclos de trabalho (4 dias ON + 2 dias OFF)
 */
const workCycleConfig = {
  patternLength: 6,  // 4 trabalho + 2 folga
  workDays: 4,
  offDays: 2,
  // Distribuição escalonada dos pontos de início para evitar todos começarem no mesmo dia
  staggeredStartDays: [1, 2, 3, 4, 5, 6, 1, 2] // Para 8 colaboradores
};

module.exports = {
  monthConfig,
  specialDays,
  demandConfig,
  workCycleConfig,
  generateMonthCalendar,
  getDayName
};