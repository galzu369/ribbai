export const scoringRules = {
  excludedStaff: ["Filipe Catalão", "Luís"],
  knownStaff: ["Pablo", "Carolina", "Matilde", "Marta", "Bruno", "Lil"],
  categories: [
    {
      id: "operationalExecution",
      label: "Execução operacional",
      description:
        "Responsabilidade assumida, desempenho no setor, abertura, coordenação local e capacidade de resposta.",
      maxDailyPoints: 20,
    },
    {
      id: "serviceQuality",
      label: "Qualidade e consistência",
      description:
        "Serviço sem falhas relevantes, boa comunicação, recuperação de inconsistências e experiência do cliente.",
      maxDailyPoints: 12,
    },
    {
      id: "sectorModel",
      label: "Adaptação ao modelo de setores",
      description:
        "Foco no setor atribuído, disciplina operacional e comunicação antes de intervir noutra zona.",
      maxDailyPoints: 16,
    },
    {
      id: "commitment",
      label: "Compromisso e colaboração",
      description:
        "Horas extra, apoio a colegas, fecho, stock, manutenção e disponibilidade em dias críticos.",
      maxDailyPoints: 12,
    },
  ],
  points: {
    responsibility: 7,
    highlight: 5,
    strongPerformance: 6,
    criticalRole: 5,
    openingExemplar: 3,
    support: 4,
    opening: 6,
    closing: 5,
    stock: 7,
    maintenance: 4,
    modelReference: 14,
    modelStrong: 11,
    modelImprovement: 4,
    modelBasic: 1,
    modelNeedsWork: -6,
    modelFailureNamed: -5,
    conductIssue: -4,
    teamDayNoIncidents: 3,
    minorIssueRecovered: -1,
    overtime: [
      { minMinutes: 120, points: 5 },
      { minMinutes: 90, points: 4 },
      { minMinutes: 60, points: 3 },
      { minMinutes: 30, points: 2 },
      { minMinutes: 1, points: 1 },
    ],
    weeklyOvertimeCommitmentCap: 15,
  },
};
