/**
 * Gerador Simplificado de Escalas RIBBAI 2.0
 * Versão básica que garante funcionamento
 */

/**
 * Gera uma escala simples baseada em rotação
 */
function generateSimpleSchedule(employees, totalDays) {
  console.log('Gerando escala simplificada...');
  
  const schedule = {};
  
  // Padrão rotativo simples: cada colaborador trabalha 4, folga 2
  const workPattern = [true, true, true, true, false, false]; // 4 trabalho, 2 folga
  
  for (let day = 1; day <= totalDays; day++) {
    const workingToday = [];
    
    // Determinar quem trabalha hoje baseado no padrão rotativo
    employees.forEach((emp, index) => {
      const cycleDay = (day - 1 + index * 1) % 6; // Offset diferente para cada colaborador
      if (workPattern[cycleDay]) {
        workingToday.push(emp);
      }
    });
    
    // Garantir mínimo de 5 colaboradores
    if (workingToday.length < 5) {
      // Adicionar colaboradores que estão "de folga" até ter 5
      const onBreak = employees.filter(emp => !workingToday.includes(emp));
      while (workingToday.length < 5 && onBreak.length > 0) {
        workingToday.push(onBreak.shift());
      }
    }
    
    // Limitar a máximo 6 para não sobrecarregar
    if (workingToday.length > 6) {
      workingToday.splice(6);
    }
    
    // Atribuir turnos
    const daySchedule = {
      day: day,
      employees: workingToday.map(emp => emp.id),
      opening: [],
      lunch: [],
      closing: []
    };
    
    // Abertura: 2 mais experientes
    const experienced = workingToday
      .sort((a, b) => getExperienceScore(b) - getExperienceScore(a))
      .slice(0, 2);
    daySchedule.opening = experienced.map(emp => emp.id);
    
    // Almoço: todos os 5+ que trabalham
    daySchedule.lunch = workingToday.map(emp => emp.id);
    
    // Fecho: 3 colaboradores (evitar sempre os mesmos)
    const forClosing = workingToday.slice(0, 3);
    daySchedule.closing = forClosing.map(emp => emp.id);
    
    schedule[day] = daySchedule;
    
    console.log(`Dia ${day}: ${workingToday.length} colaboradores (${workingToday.map(e => e.name).join(', ')})`);
  }
  
  return schedule;
}

/**
 * Calcula score de experiência
 */
function getExperienceScore(employee) {
  if (employee.experienceLevel === 'senior') return 3;
  if (employee.experienceLevel === 'experienced') return 2;
  return 1;
}

/**
 * Gera estatísticas básicas da escala simples
 */
function generateSimpleStats(schedule, employees, totalDays) {
  const stats = {
    individual: [],
    summary: {
      totalWorkDays: 0,
      averageWorkDays: 0
    }
  };
  
  employees.forEach(emp => {
    let workDays = 0;
    let openingShifts = 0;
    let closingShifts = 0;
    
    for (let day = 1; day <= totalDays; day++) {
      const daySchedule = schedule[day];
      if (daySchedule && daySchedule.employees.includes(emp.id)) {
        workDays++;
        
        if (daySchedule.opening.includes(emp.id)) {
          openingShifts++;
        }
        if (daySchedule.closing.includes(emp.id)) {
          closingShifts++;
        }
      }
    }
    
    stats.individual.push({
      id: emp.id,
      name: emp.name,
      stats: {
        workDays,
        offDays: totalDays - workDays,
        openingShifts,
        lunchShifts: workDays, // Todos no almoço quando trabalham
        closingShifts,
        workPercentage: (workDays / totalDays) * 100
      }
    });
    
    stats.summary.totalWorkDays += workDays;
  });
  
  stats.summary.averageWorkDays = stats.summary.totalWorkDays / employees.length;
  
  return stats;
}

/**
 * Validação simples
 */
function simpleValidation(schedule, employees, totalDays) {
  const errors = [];
  const warnings = [];
  
  // Verificar cobertura básica
  for (let day = 1; day <= totalDays; day++) {
    const daySchedule = schedule[day];
    if (!daySchedule) {
      errors.push(`Dia ${day}: Sem escala`);
      continue;
    }
    
    if (daySchedule.opening.length < 2) {
      errors.push(`Dia ${day}: Abertura insuficiente (${daySchedule.opening.length}/2)`);
    }
    
    if (daySchedule.lunch.length < 5) {
      errors.push(`Dia ${day}: Almoço insuficiente (${daySchedule.lunch.length}/5)`);
    }
    
    if (daySchedule.closing.length < 3) {
      errors.push(`Dia ${day}: Fecho insuficiente (${daySchedule.closing.length}/3)`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    score: errors.length === 0 ? 85 : Math.max(0, 85 - errors.length * 10)
  };
}

module.exports = {
  generateSimpleSchedule,
  generateSimpleStats,
  simpleValidation
};