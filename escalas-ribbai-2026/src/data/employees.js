/**
 * Configuração dos Colaboradores RIBBAI 2.0
 * Julho 2026
 */

const employees = [
  {
    id: 'bruno',
    name: 'Bruno',
    role: 'chefia_operacional',
    experienceLevel: 'senior',
    skills: ['abertura', 'almoço', 'fecho', 'liderança'],
    preferences: {
      preferredShifts: ['abertura', 'almoço'],
      maxConsecutiveCloses: 2
    },
    availability: {
      // Todos os dias disponível (pode ser ajustado se houver restrições)
      restrictions: []
    }
  },
  {
    id: 'filipe',
    name: 'Filipe',
    role: 'chefia_operacional', 
    experienceLevel: 'senior',
    skills: ['abertura', 'almoço', 'fecho', 'liderança'],
    preferences: {
      preferredShifts: ['abertura', 'almoço'],
      maxConsecutiveCloses: 2
    },
    availability: {
      restrictions: []
    }
  },
  {
    id: 'carolina',
    name: 'Carolina',
    role: 'elemento_experiente',
    experienceLevel: 'senior',
    skills: ['abertura', 'almoço', 'fecho', 'zonas_pressão'],
    preferences: {
      preferredShifts: ['almoço'],
      maxConsecutiveCloses: 3
    },
    availability: {
      restrictions: []
    }
  },
  {
    id: 'pablo',
    name: 'Pablo',
    role: 'especialista_60s',
    experienceLevel: 'experienced',
    skills: ['almoço', 'fecho', 'zona_60s'],
    preferences: {
      preferredShifts: ['almoço', 'fecho'],
      maxConsecutiveCloses: 3
    },
    availability: {
      restrictions: []
    }
  },
  {
    id: 'lil',
    name: 'Lil',
    role: 'polivalente',
    experienceLevel: 'experienced',
    skills: ['abertura', 'almoço', 'fecho'],
    preferences: {
      preferredShifts: ['abertura', 'almoço'],
      maxConsecutiveCloses: 3
    },
    availability: {
      restrictions: []
    }
  },
  {
    id: 'matilde',
    name: 'Matilde',
    role: 'sala_interior',
    experienceLevel: 'experienced',
    skills: ['almoço', 'fecho', 'sala_interior'],
    preferences: {
      preferredShifts: ['almoço'],
      maxConsecutiveCloses: 3
    },
    availability: {
      restrictions: []
    }
  },
  {
    id: 'lee',
    name: 'Lee',
    role: 'desenvolvimento',
    experienceLevel: 'junior',
    skills: ['almoço', 'fecho'],
    preferences: {
      preferredShifts: ['almoço'],
      maxConsecutiveCloses: 2,
      needsMentorship: true
    },
    availability: {
      restrictions: []
    }
  },
  {
    id: 'diogo',
    name: 'Diogo', 
    role: 'desenvolvimento',
    experienceLevel: 'junior',
    skills: ['almoço', 'fecho'],
    preferences: {
      preferredShifts: ['almoço'],
      maxConsecutiveCloses: 2,
      needsMentorship: true
    },
    availability: {
      restrictions: []
    }
  }
];

/**
 * Configurações de experiência para priorização
 */
const experienceConfig = {
  senior: {
    priority: 3,
    canMentor: true,
    preferredForOpening: true,
    preferredForLunch: true
  },
  experienced: {
    priority: 2,
    canMentor: true,
    preferredForOpening: false,
    preferredForLunch: true
  },
  junior: {
    priority: 1,
    canMentor: false,
    preferredForOpening: false,
    preferredForLunch: false
  }
};

/**
 * Configurações dos turnos
 */
const shiftConfig = {
  opening: {
    name: 'Abertura',
    time: '09:00',
    requiredStaff: 2,
    preferredExperience: ['senior'],
    duration: 'full_day'
  },
  lunch: {
    name: 'Pico Almoço',
    time: '12:00-16:30',
    requiredStaff: 5,
    preferredExperience: ['senior', 'experienced'],
    mentorshipRequired: true,
    duration: 'full_day'
  },
  closing: {
    name: 'Fecho',
    time: '23:00',
    requiredStaff: 3,
    preferredExperience: ['senior', 'experienced'],
    duration: 'full_day'
  }
};

module.exports = {
  employees,
  experienceConfig,
  shiftConfig
};