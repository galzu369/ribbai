/**
 * Gerador de Escalas RIBBAI 2.0
 * Algoritmo principal CSP (Constraint Satisfaction Problem) com otimização heurística
 */

const { isSafeAssignment, validateCompleteSchedule } = require('./constraints-validator');
const { canWorkOnDay, getConsecutiveWorkDays } = require('../utils/calendar-utils');
const { calculateScheduleScore } = require('../utils/statistics');

/**
 * Gera escala completa para o mês
 */
function generateMonthSchedule(employees, monthConfig, options = {}) {
  const { totalDays } = monthConfig;
  const maxAttempts = options.maxAttempts || 100;
  const bestSchedules = [];
  
  console.log(`Gerando escala para ${totalDays} dias com ${employees.length} colaboradores...`);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`Tentativa ${attempt}/${maxAttempts}`);
    
    const schedule = generateSingleSchedule(employees, monthConfig, options);
    
    if (schedule) {
      const validation = validateCompleteSchedule(schedule, employees, totalDays);
      const score = calculateScheduleScore(schedule, employees, totalDays);
      
      bestSchedules.push({
        schedule,
        validation,
        score,
        attempt
      });
      
      console.log(`Tentativa ${attempt}: Score ${score.toFixed(2)}, Válida: ${validation.valid}`);
      
      // Se encontrou uma escala perfeita, para
      if (validation.valid && score > 95) {
        console.log(`Escala perfeita encontrada na tentativa ${attempt}!`);
        break;
      }
    }
  }

  if (bestSchedules.length === 0) {
    throw new Error('Não foi possível gerar nenhuma escala válida');
  }

  // Ordena por score e retorna a melhor
  bestSchedules.sort((a, b) => b.score - a.score);
  const best = bestSchedules[0];
  
  console.log(`Melhor escala: Score ${best.score.toFixed(2)} (tentativa ${best.attempt})`);
  console.log(`Errors: ${best.validation.errors.length}, Warnings: ${best.validation.warnings.length}`);
  
  return {
    schedule: best.schedule,
    validation: best.validation,
    score: best.score,
    metadata: {
      totalAttempts: maxAttempts,
      bestAttempt: best.attempt,
      alternativeSchedules: bestSchedules.slice(1, 5) // Top 5 alternativas
    }
  };
}

/**
 * Gera uma única tentativa de escala
 */
function generateSingleSchedule(employees, monthConfig, options = {}) {
  const { totalDays } = monthConfig;
  const schedule = {};
  
  // Inicializar ciclos escalonados para cada colaborador
  const employeeCycles = initializeStaggeredCycles(employees, options.staggerOffset || 0);
  
  // Gerar escala dia a dia
  for (let day = 1; day <= totalDays; day++) {
    const daySchedule = generateDaySchedule(day, employees, employeeCycles, schedule, options);
    
    if (!daySchedule) {
      console.log(`Falhou ao gerar dia ${day}. Tentando abordagem alternativa...`);
      
      // Tentativa alternativa: ignorar ciclos nos primeiros dias
      const altSchedule = generateDayScheduleAlternative(day, employees, schedule, options);
      if (altSchedule) {
        schedule[day] = altSchedule;
        continue;
      }
      
      return null; // Falhou
    }
    
    schedule[day] = daySchedule;
  }
  
  return schedule;
}

/**
 * Inicializa ciclos escalonados para evitar conflitos
 */
function initializeStaggeredCycles(employees, offset = 0) {
  const cycles = {};
  
  employees.forEach((emp, index) => {
    // Distribui pontos de partida escalonados
    const startDay = ((index + offset) % 6) + 1;
    cycles[emp.id] = {
      startDay: startDay,
      currentCycle: 0,
      workDaysInCycle: 0
    };
  });
  
  return cycles;
}

/**
 * Gera escala para um dia específico
 */
function generateDaySchedule(day, employees, employeeCycles, schedule, options = {}) {
  const daySchedule = {
    day: day,
    employees: [],
    opening: [],
    lunch: [],
    closing: []
  };

  // Determinar quem pode trabalhar hoje baseado nos ciclos
  const availableEmployees = employees.filter(emp => 
    isEmployeeAvailableForDay(emp, day, employeeCycles, schedule)
  );

  if (availableEmployees.length < 5) {
    // Não há colaboradores suficientes
    return null;
  }

  // Atribuir turnos por prioridade
  if (!assignOpeningShift(daySchedule, availableEmployees, employees, schedule, day)) {
    return null;
  }

  if (!assignLunchShift(daySchedule, availableEmployees, employees, schedule, day)) {
    return null;
  }

  if (!assignClosingShift(daySchedule, availableEmployees, employees, schedule, day)) {
    return null;
  }

  // Consolidar lista de colaboradores únicos
  const allEmployees = new Set([...daySchedule.opening, ...daySchedule.lunch, ...daySchedule.closing]);
  daySchedule.employees = Array.from(allEmployees);

  return daySchedule;
}

/**
 * Verifica se um colaborador está disponível para trabalhar num dia
 */
function isEmployeeAvailableForDay(employee, day, employeeCycles, schedule) {
  const cycle = employeeCycles[employee.id];
  
  // Para os primeiros dias, ser mais flexível
  if (day <= 6) {
    // Nos primeiros 6 dias, permitir que qualquer colaborador trabalhe
    // desde que respeite os constraints básicos
    return canWorkOnDay(schedule, employee.id, day, { workDays: 4, offDays: 2 });
  }
  
  const cycleDay = ((day - cycle.startDay) % 6 + 6) % 6;
  const shouldWork = cycleDay < 4;
  
  if (shouldWork) {
    return canWorkOnDay(schedule, employee.id, day, { workDays: 4, offDays: 2 });
  }
  
  return false;
}

/**
 * Atribui turno de abertura (09h00)
 */
function assignOpeningShift(daySchedule, availableEmployees, allEmployees, schedule, day) {
  // Priorizar chefias operacionais para abertura
  const priority = [
    ...availableEmployees.filter(emp => emp.role === 'chefia_operacional'),
    ...availableEmployees.filter(emp => emp.experienceLevel === 'senior'),
    ...availableEmployees.filter(emp => emp.skills.includes('abertura'))
  ];

  let uniquePriority = [...new Set(priority)];
  
  // Se não há colaboradores suficientes na prioridade, usar todos disponíveis
  if (uniquePriority.length < 2) {
    uniquePriority = availableEmployees.slice(0, Math.min(2, availableEmployees.length));
  }
  
  if (uniquePriority.length < 2) {
    // Última tentativa: relaxar constraints
    const allPossible = allEmployees.filter(emp => 
      isSafeAssignment(schedule, emp.id, day, 'abertura', allEmployees)
    );
    
    if (allPossible.length >= 2) {
      daySchedule.opening = allPossible.slice(0, 2).map(emp => emp.id);
      return true;
    }
    
    return false;
  }

  // Selecionar 2 colaboradores para abertura
  const selected = selectBestCombination(uniquePriority, 2, 'abertura', schedule, day);
  
  if (selected.length < 2) {
    return false;
  }

  daySchedule.opening = selected.map(emp => emp.id);
  return true;
}

/**
 * Atribui turno de almoço (12h00-16h30)
 */
function assignLunchShift(daySchedule, availableEmployees, allEmployees, schedule, day) {
  // Já atribuídos na abertura também trabalham no almoço
  const openingEmployees = daySchedule.opening.map(id => 
    availableEmployees.find(emp => emp.id === id)
  ).filter(emp => emp);

  // Adicionar mais 3+ colaboradores para completar mínimo 5
  const additionalNeeded = 5 - openingEmployees.length;
  const remainingEmployees = availableEmployees.filter(emp => 
    !daySchedule.opening.includes(emp.id)
  );

  // Priorizar experiência e garantir mentoria
  const juniorsAvailable = remainingEmployees.filter(emp => emp.experienceLevel === 'junior');
  const seniorsAvailable = remainingEmployees.filter(emp => 
    emp.experienceLevel === 'senior' || emp.experienceLevel === 'experienced'
  );

  let selected = [...openingEmployees];

  // Se há júniores disponíveis, garantir pelo menos um sénior adicional
  if (juniorsAvailable.length > 0) {
    const seniorForMentorship = seniorsAvailable[0];
    if (seniorForMentorship && selected.length < 5) {
      selected.push(seniorForMentorship);
    }
  }

  // Completar com os melhores disponíveis
  const remaining = remainingEmployees.filter(emp => 
    !selected.some(s => s.id === emp.id)
  );

  while (selected.length < 5 && remaining.length > 0) {
    // Priorizar por experiência
    const next = remaining.shift();
    if (isSafeAssignment(schedule, next.id, day, 'almoço', allEmployees)) {
      selected.push(next);
    }
  }

  if (selected.length < 5) {
    return false; // Não conseguiu reunir 5 colaboradores
  }

  daySchedule.lunch = selected.map(emp => emp.id);
  return true;
}

/**
 * Atribui turno de fecho (23h00)
 */
function assignClosingShift(daySchedule, availableEmployees, allEmployees, schedule, day) {
  // Selecionar 3 colaboradores para fecho
  // Pode incluir alguns do almoço mas rotativamente
  
  const lunchEmployees = daySchedule.lunch;
  const availableForClosing = availableEmployees.filter(emp => 
    lunchEmployees.includes(emp.id) && emp.skills.includes('fecho')
  );

  // Verificar fechos consecutivos para evitar sobrecarga
  const suitableForClosing = availableForClosing.filter(emp => {
    const maxCloses = emp.preferences?.maxConsecutiveCloses || 3;
    const consecutiveCloses = getConsecutiveCloses(schedule, emp.id, day - 1);
    return consecutiveCloses < maxCloses;
  });

  if (suitableForClosing.length < 3) {
    // Relaxar critérios se necessário
    const backup = availableEmployees.filter(emp => 
      emp.skills.includes('fecho') && 
      isSafeAssignment(schedule, emp.id, day, 'fecho', allEmployees)
    );
    
    if (backup.length < 3) {
      return false;
    }
    
    daySchedule.closing = backup.slice(0, 3).map(emp => emp.id);
  } else {
    daySchedule.closing = suitableForClosing.slice(0, 3).map(emp => emp.id);
  }

  return true;
}

/**
 * Seleciona melhor combinação de colaboradores
 */
function selectBestCombination(candidates, needed, shiftType, schedule, day) {
  // Algoritmo guloso: selecionar baseado em prioridades
  const scored = candidates.map(emp => ({
    employee: emp,
    score: calculateEmployeeScore(emp, shiftType, schedule, day)
  }));

  scored.sort((a, b) => b.score - a.score);
  
  return scored.slice(0, needed).map(s => s.employee);
}

/**
 * Calcula score de um colaborador para um turno específico
 */
function calculateEmployeeScore(employee, shiftType, schedule, day) {
  let score = 0;

  // Experiência
  if (employee.experienceLevel === 'senior') score += 30;
  else if (employee.experienceLevel === 'experienced') score += 20;
  else score += 10;

  // Skills apropriadas
  if (employee.skills.includes(shiftType)) score += 25;

  // Preferências
  if (employee.preferences.preferredShifts?.includes(shiftType)) score += 15;

  // Evitar sobrecarga de fechos
  if (shiftType === 'fecho') {
    const consecutiveCloses = getConsecutiveCloses(schedule, employee.id, day - 1);
    score -= consecutiveCloses * 10;
  }

  // Distribuição equilibrada
  const workDaysThisMonth = getEmployeeWorkDays(schedule, employee.id, day - 1);
  if (workDaysThisMonth < (day / 6) * 4) { // Abaixo do esperado
    score += 10;
  }

  return score;
}

/**
 * Conta fechos consecutivos
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
 * Conta dias de trabalho até uma data
 */
function getEmployeeWorkDays(schedule, employeeId, upToDay) {
  let workDays = 0;
  
  for (let day = 1; day <= upToDay; day++) {
    if (schedule[day] && schedule[day].employees.includes(employeeId)) {
      workDays++;
    }
  }
  
  return workDays;
}

/**
 * Geração alternativa de horário sem ciclos rígidos
 */
function generateDayScheduleAlternative(day, employees, schedule, options) {
  console.log(`Tentando geração alternativa para dia ${day}...`);
  
  const daySchedule = {
    day: day,
    employees: [],
    opening: [],
    lunch: [],
    closing: []
  };

  // Usar todos os colaboradores que podem trabalhar (ignorando ciclos)
  const availableEmployees = employees.filter(emp => 
    canWorkOnDay(schedule, emp.id, day, { workDays: 4, offDays: 2 })
  );

  console.log(`Dia ${day}: ${availableEmployees.length} colaboradores disponíveis de ${employees.length}`);

  if (availableEmployees.length < 5) {
    console.log(`Não há colaboradores suficientes (${availableEmployees.length}/5 mínimo)`);
    return null;
  }

  // Atribuir turnos de forma mais simples
  try {
    // Abertura: primeiros 2 com mais experiência
    const forOpening = availableEmployees
      .sort((a, b) => (b.experienceLevel === 'senior' ? 3 : b.experienceLevel === 'experienced' ? 2 : 1) - 
                     (a.experienceLevel === 'senior' ? 3 : a.experienceLevel === 'experienced' ? 2 : 1))
      .slice(0, 2);
    
    if (forOpening.length < 2) {
      return null;
    }
    
    daySchedule.opening = forOpening.map(emp => emp.id);
    
    // Almoço: os 2 da abertura + mais 3
    const remainingForLunch = availableEmployees
      .filter(emp => !daySchedule.opening.includes(emp.id))
      .slice(0, 3);
    
    daySchedule.lunch = [...daySchedule.opening, ...remainingForLunch.map(emp => emp.id)];
    
    // Fecho: 3 do almoço
    daySchedule.closing = daySchedule.lunch.slice(0, 3);
    
    // Lista consolidada
    daySchedule.employees = [...new Set([...daySchedule.opening, ...daySchedule.lunch, ...daySchedule.closing])];
    
    console.log(`Dia ${day} gerado com sucesso: ${daySchedule.employees.length} colaboradores`);
    return daySchedule;
    
  } catch (error) {
    console.log(`Erro na geração alternativa do dia ${day}:`, error.message);
    return null;
  }
}

module.exports = {
  generateMonthSchedule,
  generateSingleSchedule,
  initializeStaggeredCycles,
  generateDayScheduleAlternative
};