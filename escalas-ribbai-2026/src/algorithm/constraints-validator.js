/**
 * Validador de Constraints para Escalas RIBBAI 2.0
 * Implementa todas as regras obrigatórias do sistema
 */

const { getConsecutiveWorkDays, getConsecutiveOffDays, canWorkOnDay } = require('../utils/calendar-utils');

/**
 * Valida se um colaborador pode ser atribuído a um turno específico
 */
function validateEmployeeAssignment(schedule, employeeId, day, shiftType, employees, config = {}) {
  const employee = employees.find(emp => emp.id === employeeId);
  if (!employee) {
    return { valid: false, reason: 'Colaborador não encontrado' };
  }

  // Regra 1: Máximo 4 dias consecutivos de trabalho
  if (!canWorkOnDay(schedule, employeeId, day, { workDays: 4, offDays: 2 })) {
    return { valid: false, reason: 'Excederia 4 dias consecutivos de trabalho' };
  }

  // Regra 2: Folgas devem ser consecutivas (mínimo 2 dias)
  const consecutiveOffDays = getConsecutiveOffDays(schedule, employeeId, day - 1);
  if (consecutiveOffDays > 0 && consecutiveOffDays < 2) {
    return { valid: false, reason: 'Interromperia período obrigatório de folgas' };
  }

  // Regra 3: Verificar skills do colaborador para o turno
  if (!employee.skills.includes(shiftType)) {
    return { valid: false, reason: `Colaborador não tem skills para ${shiftType}` };
  }

  // Regra 4: Verificar se já está atribuído neste dia
  if (schedule[day] && schedule[day].employees.includes(employeeId)) {
    return { valid: false, reason: 'Colaborador já atribuído neste dia' };
  }

  return { valid: true, reason: 'Atribuição válida' };
}

/**
 * Valida cobertura mínima de um dia específico
 */
function validateDayCoverage(daySchedule, requiredCoverage = { opening: 2, lunch: 5, closing: 3 }) {
  const errors = [];

  if (!daySchedule.opening || daySchedule.opening.length < requiredCoverage.opening) {
    errors.push(`Abertura: ${daySchedule.opening?.length || 0}/${requiredCoverage.opening} colaboradores`);
  }

  if (!daySchedule.lunch || daySchedule.lunch.length < requiredCoverage.lunch) {
    errors.push(`Almoço: ${daySchedule.lunch?.length || 0}/${requiredCoverage.lunch} colaboradores`);
  }

  if (!daySchedule.closing || daySchedule.closing.length < requiredCoverage.closing) {
    errors.push(`Fecho: ${daySchedule.closing?.length || 0}/${requiredCoverage.closing} colaboradores`);
  }

  return {
    valid: errors.length === 0,
    errors: errors
  };
}

/**
 * Valida mentoria (júniores sempre com sénior/experiente)
 */
function validateMentorship(daySchedule, employees) {
  if (!daySchedule.lunch) return { valid: true };

  const lunchEmployees = daySchedule.lunch.map(id => 
    employees.find(emp => emp.id === id)
  ).filter(emp => emp);

  const juniorsPresent = lunchEmployees.filter(emp => emp.experienceLevel === 'junior');
  const mentorsPresent = lunchEmployees.filter(emp => 
    emp.experienceLevel === 'senior' || emp.experienceLevel === 'experienced'
  );

  if (juniorsPresent.length > 0 && mentorsPresent.length === 0) {
    return {
      valid: false,
      reason: `Júniores (${juniorsPresent.map(e => e.name).join(', ')}) sem mentor no almoço`
    };
  }

  return { valid: true };
}

/**
 * Valida distribuição equilibrada entre colaboradores
 */
function validateWorkBalance(schedule, employees, totalDays, tolerance = 1) {
  const workDays = employees.map(emp => {
    let days = 0;
    for (let day = 1; day <= totalDays; day++) {
      if (schedule[day] && schedule[day].employees.includes(emp.id)) {
        days++;
      }
    }
    return { employeeId: emp.id, name: emp.name, workDays: days };
  });

  const minDays = Math.min(...workDays.map(w => w.workDays));
  const maxDays = Math.max(...workDays.map(w => w.workDays));
  const difference = maxDays - minDays;

  return {
    valid: difference <= tolerance,
    difference: difference,
    distribution: workDays,
    reason: difference > tolerance ? `Diferença de ${difference} dias entre colaboradores` : null
  };
}

/**
 * Valida fechos consecutivos excessivos
 */
function validateConsecutiveCloses(schedule, employeeId, upToDay, maxConsecutiveCloses = 3) {
  let consecutiveCloses = 0;
  
  for (let day = upToDay; day >= 1; day--) {
    if (schedule[day] && schedule[day].closing && schedule[day].closing.includes(employeeId)) {
      consecutiveCloses++;
    } else {
      break;
    }
  }

  return {
    valid: consecutiveCloses < maxConsecutiveCloses,
    consecutiveCloses: consecutiveCloses,
    reason: consecutiveCloses >= maxConsecutiveCloses ? 
      `${consecutiveCloses} fechos consecutivos (máximo ${maxConsecutiveCloses})` : null
  };
}

/**
 * Validação completa de uma escala
 */
function validateCompleteSchedule(schedule, employees, totalDays) {
  const validation = {
    valid: true,
    errors: [],
    warnings: [],
    details: {
      coverage: [],
      balance: null,
      mentorship: [],
      consecutiveWork: [],
      consecutiveCloses: []
    }
  };

  // Validar cada dia
  for (let day = 1; day <= totalDays; day++) {
    const daySchedule = schedule[day];
    if (!daySchedule) {
      validation.errors.push(`Dia ${day}: Nenhuma escala definida`);
      continue;
    }

    // Validar cobertura
    const coverageValidation = validateDayCoverage(daySchedule);
    if (!coverageValidation.valid) {
      validation.errors.push(`Dia ${day}: ${coverageValidation.errors.join(', ')}`);
      validation.details.coverage.push({ day, errors: coverageValidation.errors });
    }

    // Validar mentoria
    const mentorshipValidation = validateMentorship(daySchedule, employees);
    if (!mentorshipValidation.valid) {
      validation.warnings.push(`Dia ${day}: ${mentorshipValidation.reason}`);
      validation.details.mentorship.push({ day, reason: mentorshipValidation.reason });
    }

    // Validar trabalho consecutivo para cada colaborador
    if (daySchedule.employees) {
      daySchedule.employees.forEach(empId => {
        const consecutiveValidation = validateConsecutiveWork(schedule, empId, day);
        if (!consecutiveValidation.valid) {
          validation.errors.push(`Dia ${day}: ${employees.find(e => e.id === empId)?.name} - ${consecutiveValidation.reason}`);
          validation.details.consecutiveWork.push({
            day, 
            employeeId: empId, 
            reason: consecutiveValidation.reason
          });
        }
      });
    }

    // Validar fechos consecutivos
    if (daySchedule.closing) {
      daySchedule.closing.forEach(empId => {
        const employee = employees.find(e => e.id === empId);
        const maxCloses = employee?.preferences?.maxConsecutiveCloses || 3;
        const closeValidation = validateConsecutiveCloses(schedule, empId, day, maxCloses);
        if (!closeValidation.valid) {
          validation.warnings.push(`Dia ${day}: ${employee?.name} - ${closeValidation.reason}`);
          validation.details.consecutiveCloses.push({
            day,
            employeeId: empId,
            reason: closeValidation.reason
          });
        }
      });
    }
  }

  // Validar equilíbrio geral
  const balanceValidation = validateWorkBalance(schedule, employees, totalDays);
  validation.details.balance = balanceValidation;
  if (!balanceValidation.valid) {
    validation.warnings.push(`Distribuição desequilibrada: ${balanceValidation.reason}`);
  }

  validation.valid = validation.errors.length === 0;
  
  return validation;
}

/**
 * Validação específica de trabalho consecutivo
 */
function validateConsecutiveWork(schedule, employeeId, day) {
  const consecutiveWork = getConsecutiveWorkDays(schedule, employeeId, day);
  
  if (consecutiveWork > 4) {
    return {
      valid: false,
      reason: `${consecutiveWork} dias consecutivos de trabalho (máximo 4)`
    };
  }

  return { valid: true };
}

/**
 * Verifica se uma atribuição de turno é segura
 */
function isSafeAssignment(schedule, employeeId, day, shiftType, employees) {
  const validation = validateEmployeeAssignment(schedule, employeeId, day, shiftType, employees);
  return validation.valid;
}

/**
 * Lista de constraints críticos vs avisos
 */
const constraintTypes = {
  critical: [
    'max_consecutive_work',     // Máximo 4 dias consecutivos
    'consecutive_off_days',     // Mínimo 2 dias folga consecutivos
    'minimum_coverage',         // Cobertura mínima por turno
    'employee_skills'          // Skills necessárias
  ],
  warnings: [
    'work_balance',            // Equilíbrio entre colaboradores
    'consecutive_closes',      // Fechos consecutivos excessivos
    'mentorship_preferred'     // Mentoria preferida
  ]
};

module.exports = {
  validateEmployeeAssignment,
  validateDayCoverage,
  validateMentorship,
  validateWorkBalance,
  validateConsecutiveCloses,
  validateCompleteSchedule,
  validateConsecutiveWork,
  isSafeAssignment,
  constraintTypes
};