/**
 * Utilidades para manipulação de calendário e datas
 */

const { format, addDays, differenceInDays, getDay } = require('date-fns');

/**
 * Calcula se um colaborador está em período de trabalho ou folga
 */
function isWorkingDay(startDay, currentDay, workCycle = { workDays: 4, offDays: 2 }) {
  const cycleLength = workCycle.workDays + workCycle.offDays;
  const dayInCycle = (currentDay - startDay) % cycleLength;
  
  if (dayInCycle < 0) {
    // Handle negative modulo
    return (dayInCycle + cycleLength) < workCycle.workDays;
  }
  
  return dayInCycle < workCycle.workDays;
}

/**
 * Calcula quantos dias consecutivos de trabalho um colaborador teve
 */
function getConsecutiveWorkDays(schedule, employeeId, upToDay) {
  let consecutiveDays = 0;
  
  for (let day = upToDay; day >= 1; day--) {
    if (schedule[day] && schedule[day].employees.includes(employeeId)) {
      consecutiveDays++;
    } else {
      break;
    }
  }
  
  return consecutiveDays;
}

/**
 * Calcula quantos dias consecutivos de folga um colaborador teve
 */
function getConsecutiveOffDays(schedule, employeeId, upToDay) {
  let consecutiveDays = 0;
  
  for (let day = upToDay; day >= 1; day--) {
    if (!schedule[day] || !schedule[day].employees.includes(employeeId)) {
      consecutiveDays++;
    } else {
      break;
    }
  }
  
  return consecutiveDays;
}

/**
 * Verifica se um colaborador pode trabalhar num determinado dia
 */
function canWorkOnDay(schedule, employeeId, day, workCycle = { workDays: 4, offDays: 2 }) {
  // Para o primeiro dia, todos podem trabalhar
  if (day === 1) {
    return true;
  }
  
  // Verificar se não excede 4 dias consecutivos
  const consecutiveWorkDays = getConsecutiveWorkDays(schedule, employeeId, day - 1);
  if (consecutiveWorkDays >= workCycle.workDays) {
    return false;
  }
  
  // Verificar se está em período de folga obrigatória
  const consecutiveOffDays = getConsecutiveOffDays(schedule, employeeId, day - 1);
  if (consecutiveOffDays > 0 && consecutiveOffDays < workCycle.offDays) {
    // Se começou período de folga, tem de completar 2 dias
    return false;
  }
  
  return true;
}

/**
 * Calcula estatísticas de trabalho para um colaborador
 */
function calculateEmployeeStats(schedule, employeeId, totalDays) {
  let workDays = 0;
  let openingShifts = 0;
  let closingShifts = 0;
  let lunchShifts = 0;
  
  for (let day = 1; day <= totalDays; day++) {
    const daySchedule = schedule[day];
    if (daySchedule && daySchedule.employees.includes(employeeId)) {
      workDays++;
      
      if (daySchedule.opening && daySchedule.opening.includes(employeeId)) {
        openingShifts++;
      }
      if (daySchedule.lunch && daySchedule.lunch.includes(employeeId)) {
        lunchShifts++;
      }
      if (daySchedule.closing && daySchedule.closing.includes(employeeId)) {
        closingShifts++;
      }
    }
  }
  
  return {
    workDays,
    offDays: totalDays - workDays,
    openingShifts,
    lunchShifts,
    closingShifts,
    workPercentage: (workDays / totalDays) * 100
  };
}

/**
 * Verifica se a escala está balanceada entre colaboradores
 */
function isScheduleBalanced(schedule, employees, totalDays, tolerance = 1) {
  const stats = employees.map(emp => 
    calculateEmployeeStats(schedule, emp.id, totalDays)
  );
  
  const workDays = stats.map(s => s.workDays);
  const minDays = Math.min(...workDays);
  const maxDays = Math.max(...workDays);
  
  return (maxDays - minDays) <= tolerance;
}

/**
 * Gera um resumo visual de um período
 */
function generateVisualSummary(schedule, employeeId, startDay, endDay) {
  let summary = '';
  
  for (let day = startDay; day <= endDay; day++) {
    const daySchedule = schedule[day];
    if (daySchedule && daySchedule.employees.includes(employeeId)) {
      if (daySchedule.opening && daySchedule.opening.includes(employeeId)) {
        summary += '🟢'; // Abertura
      } else if (daySchedule.closing && daySchedule.closing.includes(employeeId)) {
        summary += '🟣'; // Fecho
      } else {
        summary += '🔵'; // Normal/Almoço
      }
    } else {
      summary += '⚪'; // Folga
    }
  }
  
  return summary;
}

/**
 * Encontra o próximo período de folgas para um colaborador
 */
function getNextOffPeriod(schedule, employeeId, fromDay, workCycle = { workDays: 4, offDays: 2 }) {
  let workDaysCount = 0;
  
  // Contar dias de trabalho consecutivos a partir do dia especificado
  for (let day = fromDay; day <= 31; day++) {
    const daySchedule = schedule[day];
    if (daySchedule && daySchedule.employees.includes(employeeId)) {
      workDaysCount++;
      if (workDaysCount >= workCycle.workDays) {
        // Próximas folgas começam no dia seguinte
        return {
          startDay: day + 1,
          endDay: day + workCycle.offDays,
          duration: workCycle.offDays
        };
      }
    } else {
      // Reset contador se encontrar folga
      workDaysCount = 0;
    }
  }
  
  return null;
}

module.exports = {
  isWorkingDay,
  getConsecutiveWorkDays,
  getConsecutiveOffDays,
  canWorkOnDay,
  calculateEmployeeStats,
  isScheduleBalanced,
  generateVisualSummary,
  getNextOffPeriod
};