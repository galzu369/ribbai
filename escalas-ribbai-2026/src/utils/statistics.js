/**
 * Cálculo de estatísticas e KPIs do sistema de escalas
 */

const { calculateEmployeeStats } = require('./calendar-utils');

/**
 * Calcula KPIs gerais da escala
 */
function calculateScheduleKPIs(schedule, employees, totalDays) {
  const stats = employees.map(emp => 
    calculateEmployeeStats(schedule, emp.id, totalDays)
  );
  
  const totalWorkDays = stats.reduce((sum, s) => sum + s.workDays, 0);
  const totalShifts = stats.reduce((sum, s) => sum + s.openingShifts + s.lunchShifts + s.closingShifts, 0);
  
  return {
    totalEmployees: employees.length,
    monthDays: totalDays,
    totalWorkDays,
    totalShifts,
    averageWorkDays: totalWorkDays / employees.length,
    averageWorkPercentage: (totalWorkDays / (employees.length * totalDays)) * 100
  };
}

/**
 * Calcula cobertura por turno
 */
function calculateShiftCoverage(schedule, totalDays) {
  let openingCoverage = [];
  let lunchCoverage = [];
  let closingCoverage = [];
  
  for (let day = 1; day <= totalDays; day++) {
    const daySchedule = schedule[day];
    if (daySchedule) {
      openingCoverage.push(daySchedule.opening ? daySchedule.opening.length : 0);
      lunchCoverage.push(daySchedule.lunch ? daySchedule.lunch.length : 0);
      closingCoverage.push(daySchedule.closing ? daySchedule.closing.length : 0);
    }
  }
  
  return {
    opening: {
      average: average(openingCoverage),
      minimum: Math.min(...openingCoverage),
      maximum: Math.max(...openingCoverage),
      compliance: openingCoverage.filter(c => c >= 2).length / totalDays * 100
    },
    lunch: {
      average: average(lunchCoverage),
      minimum: Math.min(...lunchCoverage),
      maximum: Math.max(...lunchCoverage),
      compliance: lunchCoverage.filter(c => c >= 5).length / totalDays * 100
    },
    closing: {
      average: average(closingCoverage),
      minimum: Math.min(...closingCoverage),
      maximum: Math.max(...closingCoverage),
      compliance: closingCoverage.filter(c => c >= 3).length / totalDays * 100
    }
  };
}

/**
 * Calcula distribuição por tipo de turno
 */
function calculateShiftDistribution(schedule, employees, totalDays) {
  const distribution = {};
  
  employees.forEach(emp => {
    const stats = calculateEmployeeStats(schedule, emp.id, totalDays);
    distribution[emp.id] = {
      name: emp.name,
      opening: stats.openingShifts,
      lunch: stats.lunchShifts,
      closing: stats.closingShifts,
      total: stats.workDays,
      openingPercentage: (stats.openingShifts / stats.workDays) * 100 || 0,
      closingPercentage: (stats.closingShifts / stats.workDays) * 100 || 0
    };
  });
  
  return distribution;
}

/**
 * Calcula métricas de equilíbrio
 */
function calculateBalanceMetrics(schedule, employees, totalDays) {
  const workDays = employees.map(emp => 
    calculateEmployeeStats(schedule, emp.id, totalDays).workDays
  );
  
  const mean = average(workDays);
  const variance = workDays.reduce((sum, days) => sum + Math.pow(days - mean, 2), 0) / workDays.length;
  const standardDeviation = Math.sqrt(variance);
  
  // Coeficiente de Gini para medir desigualdade
  const giniCoefficient = calculateGiniCoefficient(workDays);
  
  return {
    mean: mean,
    standardDeviation: standardDeviation,
    variance: variance,
    giniCoefficient: giniCoefficient,
    range: Math.max(...workDays) - Math.min(...workDays),
    isBalanced: standardDeviation < 0.5 && giniCoefficient < 0.1
  };
}

/**
 * Calcula métricas de experiência
 */
function calculateExperienceMetrics(schedule, employees, totalDays) {
  let seniorInLunch = 0;
  let mentoringDays = 0;
  let totalLunchDays = 0;
  
  for (let day = 1; day <= totalDays; day++) {
    const daySchedule = schedule[day];
    if (daySchedule && daySchedule.lunch) {
      totalLunchDays++;
      
      const lunchEmployees = daySchedule.lunch.map(id => 
        employees.find(emp => emp.id === id)
      );
      
      // Contar seniores no almoço
      const seniorCount = lunchEmployees.filter(emp => 
        emp && emp.experienceLevel === 'senior'
      ).length;
      
      if (seniorCount > 0) {
        seniorInLunch++;
      }
      
      // Verificar mentoria (junior com senior/experienced)
      const juniorPresent = lunchEmployees.some(emp => 
        emp && emp.experienceLevel === 'junior'
      );
      const mentorPresent = lunchEmployees.some(emp => 
        emp && (emp.experienceLevel === 'senior' || emp.experienceLevel === 'experienced')
      );
      
      if (juniorPresent && mentorPresent) {
        mentoringDays++;
      }
    }
  }
  
  return {
    seniorLunchCoverage: (seniorInLunch / totalLunchDays) * 100,
    mentoringCompliance: (mentoringDays / totalLunchDays) * 100,
    totalLunchDays
  };
}

/**
 * Gera relatório completo de estatísticas
 */
function generateFullStatsReport(schedule, employees, totalDays) {
  return {
    kpis: calculateScheduleKPIs(schedule, employees, totalDays),
    coverage: calculateShiftCoverage(schedule, totalDays),
    distribution: calculateShiftDistribution(schedule, employees, totalDays),
    balance: calculateBalanceMetrics(schedule, employees, totalDays),
    experience: calculateExperienceMetrics(schedule, employees, totalDays),
    individual: employees.map(emp => ({
      id: emp.id,
      name: emp.name,
      stats: calculateEmployeeStats(schedule, emp.id, totalDays)
    }))
  };
}

/**
 * Funções auxiliares matemáticas
 */
function average(arr) {
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

function calculateGiniCoefficient(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  const n = sorted.length;
  const mean = average(sorted);
  
  if (mean === 0) return 0;
  
  let gini = 0;
  for (let i = 0; i < n; i++) {
    gini += (2 * (i + 1) - n - 1) * sorted[i];
  }
  
  return gini / (n * n * mean);
}

/**
 * Valida se a escala cumpre todos os requisitos
 */
function validateSchedule(schedule, employees, totalDays) {
  const errors = [];
  const warnings = [];
  
  // Validar cobertura mínima
  const coverage = calculateShiftCoverage(schedule, totalDays);
  if (coverage.opening.compliance < 100) {
    errors.push(`Abertura: ${coverage.opening.compliance.toFixed(1)}% dos dias com cobertura mínima`);
  }
  if (coverage.lunch.compliance < 100) {
    errors.push(`Almoço: ${coverage.lunch.compliance.toFixed(1)}% dos dias com cobertura mínima`);
  }
  if (coverage.closing.compliance < 100) {
    errors.push(`Fecho: ${coverage.closing.compliance.toFixed(1)}% dos dias com cobertura mínima`);
  }
  
  // Validar equilíbrio
  const balance = calculateBalanceMetrics(schedule, employees, totalDays);
  if (!balance.isBalanced) {
    warnings.push(`Escala não perfeitamente equilibrada (desvio: ${balance.standardDeviation.toFixed(2)})`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    score: calculateScheduleScore(schedule, employees, totalDays)
  };
}

/**
 * Calcula score geral da qualidade da escala (0-100)
 */
function calculateScheduleScore(schedule, employees, totalDays) {
  const coverage = calculateShiftCoverage(schedule, totalDays);
  const balance = calculateBalanceMetrics(schedule, employees, totalDays);
  const experience = calculateExperienceMetrics(schedule, employees, totalDays);
  
  // Componentes do score
  const coverageScore = (coverage.opening.compliance + coverage.lunch.compliance + coverage.closing.compliance) / 3;
  const balanceScore = balance.isBalanced ? 100 : Math.max(0, 100 - balance.standardDeviation * 50);
  const experienceScore = experience.mentoringCompliance;
  
  // Peso dos componentes
  return (coverageScore * 0.4 + balanceScore * 0.3 + experienceScore * 0.3);
}

module.exports = {
  calculateScheduleKPIs,
  calculateShiftCoverage,
  calculateShiftDistribution,
  calculateBalanceMetrics,
  calculateExperienceMetrics,
  generateFullStatsReport,
  validateSchedule,
  calculateScheduleScore
};