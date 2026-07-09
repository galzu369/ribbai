/**
 * Motor de Otimização para Escalas RIBBAI 2.0
 * Melhora escalas geradas através de heurísticas avançadas
 */

const { validateCompleteSchedule, isSafeAssignment } = require('./constraints-validator');
const { calculateScheduleScore, generateFullStatsReport } = require('../utils/statistics');
const { getConsecutiveWorkDays } = require('../utils/calendar-utils');

/**
 * Otimiza uma escala existente
 */
function optimizeSchedule(schedule, employees, totalDays, options = {}) {
  const maxIterations = options.maxIterations || 50;
  const targetScore = options.targetScore || 95;
  
  console.log('Iniciando otimização da escala...');
  
  let currentSchedule = JSON.parse(JSON.stringify(schedule)); // Deep copy
  let currentScore = calculateScheduleScore(currentSchedule, employees, totalDays);
  let bestSchedule = currentSchedule;
  let bestScore = currentScore;
  
  console.log(`Score inicial: ${currentScore.toFixed(2)}`);

  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    const optimizedSchedule = performOptimizationPass(currentSchedule, employees, totalDays);
    
    if (optimizedSchedule) {
      const newScore = calculateScheduleScore(optimizedSchedule, employees, totalDays);
      
      if (newScore > bestScore) {
        bestSchedule = optimizedSchedule;
        bestScore = newScore;
        currentSchedule = optimizedSchedule;
        console.log(`Iteração ${iteration}: Novo melhor score ${newScore.toFixed(2)}`);
        
        if (newScore >= targetScore) {
          console.log(`Score alvo atingido na iteração ${iteration}!`);
          break;
        }
      }
    }
    
    // Simulated annealing: aceita piores soluções ocasionalmente no início
    if (iteration < maxIterations * 0.3 && optimizedSchedule) {
      const newScore = calculateScheduleScore(optimizedSchedule, employees, totalDays);
      const acceptanceProbability = Math.exp((newScore - currentScore) / (10 * (maxIterations - iteration) / maxIterations));
      
      if (Math.random() < acceptanceProbability) {
        currentSchedule = optimizedSchedule;
        currentScore = newScore;
      }
    }
  }

  const finalValidation = validateCompleteSchedule(bestSchedule, employees, totalDays);
  
  console.log(`Otimização concluída. Score final: ${bestScore.toFixed(2)}`);
  console.log(`Errors: ${finalValidation.errors.length}, Warnings: ${finalValidation.warnings.length}`);

  return {
    schedule: bestSchedule,
    score: bestScore,
    validation: finalValidation,
    optimizationStats: {
      initialScore: calculateScheduleScore(schedule, employees, totalDays),
      finalScore: bestScore,
      improvement: bestScore - calculateScheduleScore(schedule, employees, totalDays),
      iterations: maxIterations
    }
  };
}

/**
 * Executa um passe de otimização
 */
function performOptimizationPass(schedule, employees, totalDays) {
  const strategies = [
    () => balanceWorkDistribution(schedule, employees, totalDays),
    () => optimizeShiftAssignments(schedule, employees, totalDays),
    () => improveExperienceDistribution(schedule, employees, totalDays),
    () => reduceConsecutiveCloses(schedule, employees, totalDays)
  ];

  // Executar estratégias aleatoriamente
  const strategy = strategies[Math.floor(Math.random() * strategies.length)];
  return strategy();
}

/**
 * Balanceamento de distribuição de trabalho
 */
function balanceWorkDistribution(schedule, employees, totalDays) {
  const workStats = employees.map(emp => {
    let workDays = 0;
    for (let day = 1; day <= totalDays; day++) {
      if (schedule[day] && schedule[day].employees.includes(emp.id)) {
        workDays++;
      }
    }
    return { employee: emp, workDays };
  });

  // Encontrar colaborador com mais dias e outro com menos dias
  workStats.sort((a, b) => b.workDays - a.workDays);
  const mostWorked = workStats[0];
  const leastWorked = workStats[workStats.length - 1];

  if (mostWorked.workDays - leastWorked.workDays <= 1) {
    return null; // Já está balanceado
  }

  // Tentar transferir um dia do mais trabalhado para o menos trabalhado
  return transferWorkDay(schedule, mostWorked.employee, leastWorked.employee, employees, totalDays);
}

/**
 * Transfer um dia de trabalho entre colaboradores
 */
function transferWorkDay(schedule, fromEmployee, toEmployee, allEmployees, totalDays) {
  const newSchedule = JSON.parse(JSON.stringify(schedule));

  // Encontrar dia onde fromEmployee trabalha e toEmployee está de folga
  for (let day = 1; day <= totalDays; day++) {
    const daySchedule = newSchedule[day];
    
    if (daySchedule && daySchedule.employees.includes(fromEmployee.id) && 
        !daySchedule.employees.includes(toEmployee.id)) {
      
      // Verificar se toEmployee pode trabalhar neste dia
      if (isSafeAssignment(newSchedule, toEmployee.id, day, 'almoço', allEmployees)) {
        
        // Tentar substituição
        if (attemptSubstitution(newSchedule, day, fromEmployee.id, toEmployee.id)) {
          return newSchedule;
        }
      }
    }
  }

  return null;
}

/**
 * Tenta substituir um colaborador por outro num dia específico
 */
function attemptSubstitution(schedule, day, fromEmployeeId, toEmployeeId) {
  const daySchedule = schedule[day];
  
  // Substituir em todos os turnos onde aparece
  if (daySchedule.opening.includes(fromEmployeeId)) {
    daySchedule.opening = daySchedule.opening.map(id => 
      id === fromEmployeeId ? toEmployeeId : id
    );
  }
  
  if (daySchedule.lunch.includes(fromEmployeeId)) {
    daySchedule.lunch = daySchedule.lunch.map(id => 
      id === fromEmployeeId ? toEmployeeId : id
    );
  }
  
  if (daySchedule.closing.includes(fromEmployeeId)) {
    daySchedule.closing = daySchedule.closing.map(id => 
      id === fromEmployeeId ? toEmployeeId : id
    );
  }

  // Atualizar lista de colaboradores
  daySchedule.employees = daySchedule.employees.map(id => 
    id === fromEmployeeId ? toEmployeeId : id
  );

  return true;
}

/**
 * Otimiza atribuições de turnos específicos
 */
function optimizeShiftAssignments(schedule, employees, totalDays) {
  const newSchedule = JSON.parse(JSON.stringify(schedule));
  
  // Focar em melhorar turnos com problemas de experiência
  for (let day = 1; day <= totalDays; day++) {
    const daySchedule = newSchedule[day];
    if (!daySchedule) continue;

    // Verificar se almoço tem mentoria adequada
    if (daySchedule.lunch) {
      const lunchEmployees = daySchedule.lunch.map(id => 
        employees.find(emp => emp.id === id)
      ).filter(emp => emp);

      const juniorsInLunch = lunchEmployees.filter(emp => emp.experienceLevel === 'junior');
      const seniorsInLunch = lunchEmployees.filter(emp => 
        emp.experienceLevel === 'senior' || emp.experienceLevel === 'experienced'
      );

      // Se há júniores sem mentores, tentar melhorar
      if (juniorsInLunch.length > 0 && seniorsInLunch.length === 0) {
        if (improveLunchMentorship(newSchedule, day, employees)) {
          return newSchedule;
        }
      }
    }
  }

  return null;
}

/**
 * Melhora mentoria no turno de almoço
 */
function improveLunchMentorship(schedule, day, employees) {
  const daySchedule = schedule[day];
  
  // Procurar um sénior disponível que possa ser adicionado
  const availableSeniors = employees.filter(emp => 
    (emp.experienceLevel === 'senior' || emp.experienceLevel === 'experienced') &&
    !daySchedule.employees.includes(emp.id) &&
    isSafeAssignment(schedule, emp.id, day, 'almoço', employees)
  );

  if (availableSeniors.length === 0) {
    return false;
  }

  // Se há espaço, adicionar sénior
  if (daySchedule.lunch.length < 6) {
    const senior = availableSeniors[0];
    daySchedule.lunch.push(senior.id);
    daySchedule.employees.push(senior.id);
    return true;
  }

  // Se não há espaço, tentar substituir um júnior por um sénior
  const juniorsInLunch = daySchedule.lunch.filter(id => {
    const emp = employees.find(e => e.id === id);
    return emp && emp.experienceLevel === 'junior';
  });

  if (juniorsInLunch.length > 0) {
    const juniorToReplace = juniorsInLunch[0];
    const senior = availableSeniors[0];
    
    return attemptSubstitution(schedule, day, juniorToReplace, senior.id);
  }

  return false;
}

/**
 * Melhora distribuição de experiência
 */
function improveExperienceDistribution(schedule, employees, totalDays) {
  // Garantir que não há dias sem seniores no almoço
  return optimizeShiftAssignments(schedule, employees, totalDays);
}

/**
 * Reduz fechos consecutivos excessivos
 */
function reduceConsecutiveCloses(schedule, employees, totalDays) {
  const newSchedule = JSON.parse(JSON.stringify(schedule));

  for (let day = 1; day <= totalDays; day++) {
    const daySchedule = newSchedule[day];
    if (!daySchedule || !daySchedule.closing) continue;

    // Verificar fechos consecutivos
    for (const employeeId of daySchedule.closing) {
      const employee = employees.find(emp => emp.id === employeeId);
      const maxCloses = employee?.preferences?.maxConsecutiveCloses || 3;
      
      const consecutiveCloses = getConsecutiveCloses(newSchedule, employeeId, day);
      
      if (consecutiveCloses >= maxCloses) {
        // Tentar substituir por outro colaborador
        const alternatives = employees.filter(emp => 
          emp.skills.includes('fecho') &&
          newSchedule[day].employees.includes(emp.id) &&
          emp.id !== employeeId &&
          getConsecutiveCloses(newSchedule, emp.id, day) < maxCloses
        );

        if (alternatives.length > 0) {
          const replacement = alternatives[0];
          daySchedule.closing = daySchedule.closing.map(id => 
            id === employeeId ? replacement.id : id
          );
          return newSchedule;
        }
      }
    }
  }

  return null;
}

/**
 * Conta fechos consecutivos até um dia
 */
function getConsecutiveCloses(schedule, employeeId, upToDay) {
  let consecutive = 0;
  
  for (let day = upToDay; day >= 1; day--) {
    if (schedule[day] && schedule[day].closing && schedule[day].closing.includes(employeeId)) {
      consecutive++;
    } else {
      break;
    }
  }
  
  return consecutive;
}

/**
 * Aplica melhorias finais à escala
 */
function applyFinalImprovements(schedule, employees, totalDays) {
  let improved = JSON.parse(JSON.stringify(schedule));

  // 1. Garantir distribuição equilibrada de aberturas
  improved = balanceOpeningShifts(improved, employees, totalDays);

  // 2. Otimizar para preferências dos colaboradores
  improved = applyEmployeePreferences(improved, employees, totalDays);

  // 3. Verificação final de qualidade
  const validation = validateCompleteSchedule(improved, employees, totalDays);
  
  if (validation.valid) {
    return improved;
  }

  return schedule; // Retornar original se melhorias causaram problemas
}

/**
 * Balanceia turnos de abertura entre chefias
 */
function balanceOpeningShifts(schedule, employees, totalDays) {
  const chefias = employees.filter(emp => emp.role === 'chefia_operacional');
  const openingStats = {};

  // Contar aberturas atuais
  chefias.forEach(emp => {
    openingStats[emp.id] = 0;
    for (let day = 1; day <= totalDays; day++) {
      if (schedule[day] && schedule[day].opening && schedule[day].opening.includes(emp.id)) {
        openingStats[emp.id]++;
      }
    }
  });

  // Se desbalanceado, tentar equilibrar
  const counts = Object.values(openingStats);
  if (Math.max(...counts) - Math.min(...counts) > 2) {
    // Lógica de rebalanceamento seria implementada aqui
  }

  return schedule;
}

/**
 * Aplica preferências dos colaboradores quando possível
 */
function applyEmployeePreferences(schedule, employees, totalDays) {
  // Implementar lógica de preferências
  // Por exemplo: Pablo preferir zona 60s, Matilde sala interior, etc.
  return schedule;
}

module.exports = {
  optimizeSchedule,
  applyFinalImprovements,
  balanceWorkDistribution,
  reduceConsecutiveCloses
};