import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  extractOvertimeEntriesFromMarkdown,
  findDailyReportFiles,
  parseDurationToMinutes,
  parseReportDate,
} from "./overtime-report-parser.mjs";
import { scoringRules } from "./leaderboard-scoring-rules.mjs";

const GENERIC_HEADINGS = new Set([
  "areas de melhoria",
  "áreas de melhoria",
  "beneficios esperados",
  "benefícios esperados",
  "causa identificada",
  "decisao operacional",
  "decisão operacional",
  "equipa",
  "envolvimento da equipa",
  "estado",
  "impacto",
  "medida corretiva aplicada",
  "objetivos da medida",
  "observacoes",
  "observações",
  "proposta a testar",
  "registo de horas extra",
  "operational notes",
  "service improvement candidate",
  "team feedback input",
  "inventory context",
  "maintenance input",
  "overtime input",
  "management notes",
]);

const STAFF_SECTION_NAMES = new Set([
  "equipa em servico",
  "equipa em serviço",
  "destaques da equipa",
  "team feedback input",
  "team conduct input",
]);

const SECTOR_SECTION_PATTERN =
  /^##\s+.*(?:Setores|Distribuição|Posições|Organização)/i;
const SECTOR_SUBSECTION_PATTERN =
  /^###\s+(?:Distribuição|Posições Definidas|Distribuição Operacional|Distribuição De Funções|Distribuição Aplicada)/i;

const SECTOR_NAME_PATTERN =
  /^(porta|cafetaria|sala interior|mesas \d+|zona \d+|coordena|runner|apoio|setor|funcao|funcão|posicao|posição)/;

const STAFF_NAME_PATTERN = /\b(Pablo|Carolina|Matilde|Marta|Bruno|Lil)\b/gi;

const knownStaffSet = new Set(scoringRules.knownStaff.map((name) => normalizeText(name)));

const dateFormatter = new Intl.DateTimeFormat("pt-PT", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const weekdayFormatter = new Intl.DateTimeFormat("pt-PT", {
  weekday: "long",
  timeZone: "UTC",
});

function normalizeText(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function cleanMarkdown(value) {
  return String(value)
    .replace(/^[-*]\s*/, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function parseIsoDate(value) {
  if (!value) {
    return null;
  }

  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    throw new Error(`Invalid date "${value}". Use YYYY-MM-DD.`);
  }

  const [, year, month, day] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
}

function isPersonName(name) {
  const normalized = normalizeText(name).trim();

  if (!normalized || GENERIC_HEADINGS.has(normalized)) {
    return false;
  }

  if (knownStaffSet.has(normalized)) {
    return true;
  }

  if (SECTOR_NAME_PATTERN.test(normalized) || /\d/.test(normalized)) {
    return false;
  }

  return /^[a-z]+(?:\s+[a-z]+){0,2}$/.test(normalized);
}

function isStaffHeading(heading) {
  return isPersonName(heading);
}

function splitStaffNames(value) {
  return String(value)
    .split(/,| e /i)
    .map((part) => cleanMarkdown(part))
    .filter((part) => isPersonName(part));
}

function ensureStaffRecord(staffMap, staffName) {
  const record = staffMap.get(staffName) ?? {
    name: staffName,
    notes: [],
    contexts: new Set(),
    sectors: [],
    overtimeMinutes: 0,
    flags: {
      modelFailure: false,
      conductIssue: false,
      modelPraise: false,
      modelCriticism: false,
    },
  };

  staffMap.set(staffName, record);
  return record;
}

function addStaffNote(staffMap, staffName, note, context) {
  const cleanedNote = cleanMarkdown(note);

  if (!cleanedNote) {
    return;
  }

  const record = staffMap.get(staffName) ?? {
    name: staffName,
    notes: [],
    contexts: new Set(),
    sectors: [],
    overtimeMinutes: 0,
    flags: {
      modelFailure: false,
      conductIssue: false,
      modelPraise: false,
      modelCriticism: false,
    },
  };

  record.notes.push(cleanedNote);
  record.contexts.add(context);
  staffMap.set(staffName, record);
}

function parseMetadata(content) {
  const metadata = {};

  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|$/);

    if (!match || match[1].trim() === "---") {
      continue;
    }

    metadata[cleanMarkdown(match[1])] = cleanMarkdown(match[2]);
  }

  return metadata;
}

function parseGlobalRatings(content) {
  const ratings = [];
  const lines = content.split(/\r?\n/);
  let inRatings = false;

  for (const line of lines) {
    if (/^##\s+Avaliação Global Do Dia/i.test(line)) {
      inRatings = true;
      continue;
    }

    if (inRatings && /^##\s+/.test(line)) {
      break;
    }

    if (!inRatings || !line.startsWith("|")) {
      continue;
    }

    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cleanMarkdown(cell));

    if (cells.length >= 2 && cells[0] !== "Indicador" && !cells[0].startsWith("---")) {
      ratings.push({ label: cells[0], value: cells[1] });
    }
  }

  return ratings;
}

function parseStaffBlocks(content) {
  const staffMap = new Map();
  const lines = content.split(/\r?\n/);
  let currentSection = "";
  let currentStaff = null;

  for (const line of lines) {
    const sectionMatch = line.match(/^##\s+(.+?)\s*$/);

    if (sectionMatch) {
      currentSection = cleanMarkdown(sectionMatch[1]);
      currentStaff = null;
      continue;
    }

    const staffMatch = line.match(/^###\s+(.+?)\s*$/);

    if (staffMatch) {
      const heading = cleanMarkdown(staffMatch[1]);
      currentStaff =
        STAFF_SECTION_NAMES.has(normalizeText(currentSection)) && isStaffHeading(heading) ? heading : null;
      continue;
    }

    if (!currentStaff || !/^[-*]\s+/.test(line)) {
      continue;
    }

    addStaffNote(staffMap, currentStaff, line, currentSection);
  }

  return staffMap;
}

function isOvertimeNote(note) {
  const normalized = normalizeText(note);

  return (
    /\b(extra|adicionais?|prolongou|pausa reduzida|mais cedo|mais tarde|apos o termino|após o término)\b/.test(
      normalized
    ) && !/\bsaiu as \d{1,2}h\d{2}\b/.test(normalized)
  );
}

function parseSectorTable(content, staffMap) {
  const lines = content.split(/\r?\n/);
  let inSectorSection = false;
  let columnsInverted = false;

  for (const line of lines) {
    if (SECTOR_SECTION_PATTERN.test(line) || SECTOR_SUBSECTION_PATTERN.test(line)) {
      inSectorSection = true;
      columnsInverted = false;
      continue;
    }

    if (inSectorSection && /^##\s+/.test(line) && !SECTOR_SUBSECTION_PATTERN.test(line)) {
      inSectorSection = false;
    }

    if (!inSectorSection || !line.startsWith("|")) {
      continue;
    }

    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cleanMarkdown(cell));

    if (cells.length < 2) {
      continue;
    }

    const headerLeft = normalizeText(cells[0]);
    const headerRight = normalizeText(cells[1]);

    if (cells[0].startsWith("---")) {
      continue;
    }

    if (headerLeft === "colaborador" || headerRight === "colaborador") {
      columnsInverted = headerLeft.includes("setor") || headerLeft.includes("funcao") || headerLeft.includes("posicao");
      continue;
    }

    if (headerLeft === "setor / funcao" || headerLeft === "setor / função") {
      columnsInverted = true;
      continue;
    }

    const [rawStaff, rawSector] = columnsInverted ? [cells[1], cells[0]] : [cells[0], cells[1]];
    const staffNames = splitStaffNames(rawStaff);

    for (const staffName of staffNames) {
      const record = ensureStaffRecord(staffMap, staffName);
      record.sectors.push(rawSector);
    }
  }
}

function parseStructuredStaffBullets(content, staffMap, sectionPattern, context) {
  const lines = content.split(/\r?\n/);
  let inSection = false;

  for (const line of lines) {
    if (sectionPattern.test(line)) {
      inSection = true;
      continue;
    }

    if (inSection && /^#{2,3}\s+/.test(line) && !sectionPattern.test(line)) {
      inSection = false;
    }

    if (!inSection || !/^[-*]\s+/.test(line)) {
      continue;
    }

    const sentence = cleanMarkdown(line);
    const matchedStaff = scoringRules.knownStaff.find((name) =>
      normalizeText(sentence).startsWith(normalizeText(name))
    );

    if (!matchedStaff) {
      continue;
    }

    addStaffNote(staffMap, matchedStaff, sentence, context);
  }
}

function parseModelSectionMentions(content, staffMap) {
  const lines = content.split(/\r?\n/);
  let inModelSection = false;
  const praisePattern =
    /maior capacidade de adaptacao|melhor adaptacao|excelente compreensao|exemplo positivo|referencia operacional|bom controlo|foco consistente|distribuicao operacional exemplar|exemplo mais proximo/i;
  const criticismPattern =
    /oportunidades de melhoria|dificuldade|resistencia|deve continuar|necessita de consolidar|precisa de acompanhamento|fragilidades|incumprimento|atropelamentos/i;
  const failurePattern = /dificuldades verificaram-se entre\s+([^.]+)/i;

  for (const line of lines) {
    if (/^##\s+.*Modelo De Setores/i.test(line) || /^##\s+Observação Sobre O Modelo/i.test(line)) {
      inModelSection = true;
      continue;
    }

    if (inModelSection && /^##\s+/.test(line)) {
      inModelSection = false;
    }

    if (!inModelSection) {
      const failureMatch = line.match(failurePattern);

      if (failureMatch) {
        for (const staffName of splitStaffNames(failureMatch[1])) {
          const record = ensureStaffRecord(staffMap, staffName);
          record.flags.modelFailure = true;
        }
      }

      continue;
    }

    const sentence = cleanMarkdown(line);

    if (!sentence) {
      continue;
    }

    const names = [...sentence.matchAll(STAFF_NAME_PATTERN)].map((match) => match[1]);

    for (const staffName of names) {
      const record = ensureStaffRecord(staffMap, staffName);

      if (praisePattern.test(normalizeText(sentence))) {
        record.flags.modelPraise = true;
        addStaffNote(staffMap, staffName, sentence, "Modelo De Setores");
      }

      if (criticismPattern.test(normalizeText(sentence))) {
        record.flags.modelCriticism = true;
        addStaffNote(staffMap, staffName, sentence, "Modelo De Setores");
      }
    }
  }
}

function parseConductInput(content, staffMap) {
  const lines = content.split(/\r?\n/);
  let inSection = false;
  let conductStaff = null;

  for (const line of lines) {
    if (/^###\s+Team Conduct Input/i.test(line)) {
      inSection = true;
      conductStaff = null;
      continue;
    }

    if (inSection && /^#{2,3}\s+/.test(line)) {
      inSection = false;
      conductStaff = null;
    }

    if (!inSection || !line.startsWith("|")) {
      continue;
    }

    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cleanMarkdown(cell));

    if (cells.length < 2 || cells[0] === "Campo" || cells[0].startsWith("---")) {
      continue;
    }

    if (normalizeText(cells[0]) === "colaborador" && isPersonName(cells[1])) {
      conductStaff = cells[1];
      const record = ensureStaffRecord(staffMap, conductStaff);
      record.flags.conductIssue = true;
      addStaffNote(staffMap, conductStaff, cells[1], "Team Conduct Input");
      continue;
    }

    if (conductStaff) {
      addStaffNote(staffMap, conductStaff, `${cells[0]}: ${cells[1]}`, "Team Conduct Input");
    }
  }
}

function getSectorDayMultiplier(ratings) {
  const rating = ratings.find((entry) =>
    /modelo de setores|modelo de posic|controlo por setores/i.test(normalizeText(entry.label))
  );

  if (!rating) {
    return 1;
  }

  const value = Number.parseFloat(String(rating.value).replace(",", ".").replace(/\/10$/, ""));

  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.max(0.5, Math.min(1, value / 10));
}

function getReportSignals(content) {
  const normalized = normalizeText(content);

  return {
    highPressure:
      /forte afluencia|elevada intensidade|elevado volume|lotacao maxima|feriado|campeonato|pressao continua/.test(
        normalized
      ),
    noRelevantIncidents:
      /nao foram registad[ao]s? (?:ocorrencias|falhas|erros|reclamacoes).*relevantes/.test(normalized) ||
      /sem falhas operacionais relevantes/.test(normalized),
    sectorModelActive: /modelo .*setores|setores fixos|modelo por setores/.test(normalized),
  };
}

function cap(value, max) {
  return Math.min(value, max);
}

function finalizeCategoryPoints(points, max) {
  if (points < 0) {
    return points;
  }

  return cap(points, max);
}

function getOvertimePoints(minutes) {
  const rule = scoringRules.points.overtime.find((entry) => minutes >= entry.minMinutes);
  return rule?.points ?? 0;
}

function addScore(scores, category, points, evidence, source) {
  if (!points) {
    return;
  }

  scores[category].points += points;

  if (evidence) {
    scores[category].evidence.push({ text: evidence, source });
  }
}

function scoreStaffDay(staff, report) {
  const text = [...staff.notes, ...staff.sectors].join(" ");
  const normalized = normalizeText(text);
  const hasHighlight = staff.contexts.has("Destaques Da Equipa");
  const sectorDayMultiplier = getSectorDayMultiplier(report.ratings);
  const scores = {
    operationalExecution: { points: 0, evidence: [] },
    serviceQuality: { points: 0, evidence: [] },
    sectorModel: { points: 0, evidence: [] },
    commitment: { points: 0, evidence: [] },
  };

  if (staff.sectors.length || /responsavel|responsabilidade|assumiu/.test(normalized)) {
    addScore(
      scores,
      "operationalExecution",
      scoringRules.points.responsibility,
      staff.sectors[0] ? `Responsabilidade: ${staff.sectors[0]}` : "Responsabilidade operacional assumida.",
      "Distribuição de setores"
    );
  }

  if (hasHighlight) {
    addScore(scores, "operationalExecution", scoringRules.points.highlight, "Destaque individual no relatório.", "Destaques");
  }

  if (/irrepreensivel|exemplar|excelente|consistencia|organizacao|capacidade de resposta|fundamental|bom desempenho/.test(normalized)) {
    addScore(
      scores,
      "operationalExecution",
      scoringRules.points.strongPerformance,
      "Desempenho forte registado no relatório.",
      "Equipa em serviço"
    );
  }

  if (/abertura|coorden|gestao da porta|gestão da porta|runner|pausas?|sala interior|zona 50|zona 60|zona 70/.test(normalized)) {
    addScore(scores, "operationalExecution", scoringRules.points.criticalRole, "Função crítica no serviço.", "Operação");
  }

  if (/abertura/.test(normalized) && /irrepreensivel|exemplar|consistencia/.test(normalized)) {
    addScore(
      scores,
      "operationalExecution",
      scoringRules.points.openingExemplar,
      "Abertura consistente e exemplar.",
      "Abertura"
    );
  }

  if (report.signals.noRelevantIncidents) {
    addScore(
      scores,
      "serviceQuality",
      scoringRules.points.teamDayNoIncidents,
      "Dia sem ocorrências relevantes para a experiência do cliente.",
      "Desempenho"
    );
  }

  if (/comunic|recuperou|resolucao|resolução|controlo|organiza|consistencia|foco/.test(normalized)) {
    addScore(scores, "serviceQuality", 5, "Contributo para comunicação, controlo ou consistência.", "Qualidade");
  }

  if (/inconsistencias|inconsistências|trocas de numeros|trocas de números/.test(normalized)) {
    addScore(
      scores,
      "serviceQuality",
      scoringRules.points.minorIssueRecovered,
      "Pequenas inconsistências recuperadas.",
      "Qualidade"
    );
  }

  if (/exemplo positivo|referencia|referência|distribuicao operacional exemplar|exemplo mais proximo/.test(normalized) || staff.flags.modelPraise) {
    addScore(scores, "sectorModel", scoringRules.points.modelReference, "Referência na aplicação do modelo de setores.", "Modelo");
  } else if (
    /melhor adaptacao|maior capacidade de adaptacao|excelente compreensao|boa adaptacao|bom controlo|foco consistente/.test(
      normalized
    )
  ) {
    addScore(scores, "sectorModel", scoringRules.points.modelStrong, "Boa adaptação ao modelo de setores.", "Modelo");
  } else if (/melhoria|evolucao|evolução/.test(normalized) && !staff.flags.modelCriticism) {
    addScore(scores, "sectorModel", scoringRules.points.modelImprovement, "Evolução positiva no modelo de setores.", "Modelo");
  } else if (
    report.signals.sectorModelActive &&
    staff.sectors.length &&
    /foco|controlo|disciplina|responsabilidade/.test(normalized)
  ) {
    addScore(scores, "sectorModel", scoringRules.points.modelBasic, "Participação ativa no modelo de setores fixos.", "Modelo");
  }

  if (
    staff.flags.modelCriticism ||
    /oportunidades de melhoria|dificuldade|resistencia|resistência|deve continuar|necessita de consolidar|precisa de acompanhamento/.test(
      normalized
    )
  ) {
    addScore(scores, "sectorModel", scoringRules.points.modelNeedsWork, "Necessidade de consolidar a disciplina no modelo.", "Modelo");
  }

  if (staff.flags.modelFailure) {
    addScore(scores, "sectorModel", scoringRules.points.modelFailureNamed, "Nomeado num dia com fragilidades no modelo de setores.", "Modelo");
  }

  if (staff.flags.conductIssue || staff.contexts.has("Team Conduct Input")) {
    addScore(scores, "commitment", scoringRules.points.conductIssue, "Conduta operacional a reforçar.", "Conduta");
  }

  if (/apoio|apoiou|entreajuda|disponibilidade|colaboracao|colaboração|polivalencia|polivalência/.test(normalized)) {
    addScore(scores, "commitment", scoringRules.points.support, "Apoio ou colaboração registada.", "Compromisso");
  }

  if (/abertura/.test(normalized)) {
    addScore(scores, "commitment", scoringRules.points.opening, "Participação na abertura.", "Compromisso");
  }

  if (/fecho/.test(normalized)) {
    addScore(scores, "commitment", scoringRules.points.closing, "Participação no fecho.", "Compromisso");
  }

  if (/stock|armazem|armazém|mercadoria|encomenda|consumiveis|consumíveis|reposicao|reposição/.test(normalized)) {
    addScore(scores, "commitment", scoringRules.points.stock, "Contributo para stock, armazém ou consumíveis.", "Compromisso");
  }

  if (/vidros|limpeza|manutencao|manutenção|guardanapos|talheres/.test(normalized)) {
    addScore(scores, "commitment", scoringRules.points.maintenance, "Trabalho adicional de manutenção ou apresentação.", "Compromisso");
  }

  const overtimePoints =
    staff.overtimeMinutes > 0 ? getOvertimePoints(staff.overtimeMinutes) : 0;

  if (overtimePoints > 0) {
    addScore(
      scores,
      "commitment",
      overtimePoints,
      `Horas extra registadas: ${formatDuration(staff.overtimeMinutes)}.`,
      "Horas extra"
    );
  }

  if (sectorDayMultiplier !== 1) {
    const scaledPoints = Math.round(scores.sectorModel.points * sectorDayMultiplier);
    const delta = scaledPoints - scores.sectorModel.points;

    if (delta !== 0) {
      scores.sectorModel.points = scaledPoints;
      scores.sectorModel.evidence.push({
        text: `Ajuste pelo nível global do modelo no dia (${sectorDayMultiplier.toFixed(1)}x).`,
        source: "Avaliação global",
      });
    }
  }

  for (const category of scoringRules.categories) {
    scores[category.id].points = finalizeCategoryPoints(
      scores[category.id].points,
      category.maxDailyPoints
    );
  }

  const total = Object.values(scores).reduce((sum, category) => sum + category.points, 0);

  return {
    staffMember: staff.name,
    date: report.date,
    dayLabel: report.dayLabel,
    total,
    categories: scores,
    sectors: staff.sectors,
    overtimeMinutes: staff.overtimeMinutes,
    overtimePoints,
    evidence: Object.values(scores)
      .flatMap((category) => category.evidence)
      .slice(0, 5),
  };
}

function formatDuration(minutes) {
  if (!minutes) {
    return "0min";
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (!hours) {
    return `${remainingMinutes}min`;
  }

  return remainingMinutes ? `${hours}h${String(remainingMinutes).padStart(2, "0")}` : `${hours}h`;
}

function extractSummaryBullets(content, headingPattern, limit = 5) {
  const lines = content.split(/\r?\n/);
  const bullets = [];
  let inSection = false;

  for (const line of lines) {
    if (headingPattern.test(line)) {
      inSection = true;
      continue;
    }

    if (inSection && /^#{2,3}\s+/.test(line) && bullets.length > 0) {
      break;
    }

    if (inSection && /^[-*]\s+/.test(line)) {
      bullets.push(cleanMarkdown(line));
    }

    if (bullets.length >= limit) {
      break;
    }
  }

  return bullets;
}

export async function parseDailyLeaderboardReport(filePath) {
  const content = await readFile(filePath, "utf8");
  const date = parseReportDate(content, filePath);

  if (!date) {
    throw new Error(`Could not parse report date from ${filePath}`);
  }

  const staffMap = parseStaffBlocks(content);
  parseSectorTable(content, staffMap);
  parseStructuredStaffBullets(content, staffMap, /^###\s+Team Feedback Input/i, "Team Feedback Input");
  parseModelSectionMentions(content, staffMap);
  parseConductInput(content, staffMap);

  for (const entry of extractOvertimeEntriesFromMarkdown(content, filePath)) {
    const record = staffMap.get(entry.staffMember);

    if (record) {
      record.overtimeMinutes = Math.max(record.overtimeMinutes, entry.minutes);
    }
  }

  for (const record of staffMap.values()) {
    for (const note of record.notes) {
      if (!isOvertimeNote(note)) {
        continue;
      }

      const minutes = parseDurationToMinutes(note);

      if (minutes) {
        record.overtimeMinutes = Math.max(record.overtimeMinutes, minutes);
      }
    }
  }

  const report = {
    date: toIsoDate(date),
    dayLabel: weekdayFormatter.format(date),
    dateLabel: dateFormatter.format(date),
    metadata: parseMetadata(content),
    ratings: parseGlobalRatings(content),
    sourceFile: filePath,
    signals: getReportSignals(content),
    operationalNotes: extractSummaryBullets(content, /^###\s+Operational Notes/i, 6),
    managementNotes: extractSummaryBullets(content, /^###\s+Management Notes/i, 5),
  };

  const excluded = new Set(scoringRules.excludedStaff.map((name) => normalizeText(name)));
  const staffScores = [...staffMap.values()]
    .filter((staff) => !excluded.has(normalizeText(staff.name)) && isPersonName(staff.name))
    .map((staff) => scoreStaffDay(staff, report))
    .filter((entry) => entry.total > 0)
    .sort((left, right) => right.total - left.total || left.staffMember.localeCompare(right.staffMember));

  return {
    ...report,
    staffScores,
  };
}

export async function buildWeeklyLeaderboardReport(sourceRootDir, options = {}) {
  const fromDate = parseIsoDate(options.from);
  const toDate = parseIsoDate(options.to);
  const files = await findDailyReportFiles(sourceRootDir);
  const dailyReports = [];

  for (const filePath of files) {
    const dateMatch = path.basename(filePath).match(/^(\d{4}-\d{2}-\d{2})/);

    if (!dateMatch) {
      continue;
    }

    const reportDate = parseIsoDate(dateMatch[1]);

    if (fromDate && reportDate < fromDate) {
      continue;
    }

    if (toDate && reportDate > toDate) {
      continue;
    }

    dailyReports.push(await parseDailyLeaderboardReport(filePath));
  }

  dailyReports.sort((left, right) => left.date.localeCompare(right.date));

  const staffTotals = new Map();

  for (const report of dailyReports) {
    for (const score of report.staffScores) {
      const record = staffTotals.get(score.staffMember) ?? {
        staffMember: score.staffMember,
        total: 0,
        daysWorked: 0,
        overtimeMinutes: 0,
        overtimePoints: 0,
        categoryTotals: Object.fromEntries(scoringRules.categories.map((category) => [category.id, 0])),
        dailyScores: [],
        highlights: [],
      };

      record.total += score.total;
      record.daysWorked += 1;
      record.overtimeMinutes += score.overtimeMinutes;
      record.overtimePoints += score.overtimePoints ?? 0;
      record.dailyScores.push(score);

      for (const category of scoringRules.categories) {
        record.categoryTotals[category.id] += score.categories[category.id].points;
      }

      record.highlights.push(...score.evidence.map((entry) => `${score.date}: ${entry.text}`));
      staffTotals.set(score.staffMember, record);
    }
  }

  const leaderboard = [...staffTotals.values()]
    .map((record) => {
      const overtimeCap = scoringRules.points.weeklyOvertimeCommitmentCap ?? 15;
      let adjustedTotal = record.total;

      if (record.overtimePoints > overtimeCap) {
        adjustedTotal -= record.overtimePoints - overtimeCap;
      }

      return {
        ...record,
        total: adjustedTotal,
        averagePerDay: record.daysWorked ? adjustedTotal / record.daysWorked : 0,
        overtimeLabel: formatDuration(record.overtimeMinutes),
        highlights: record.highlights.slice(0, 4),
      };
    })
    .sort((left, right) => right.total - left.total || right.averagePerDay - left.averagePerDay);

  const periodStart = dailyReports[0]?.date ?? options.from;
  const periodEnd = dailyReports.at(-1)?.date ?? options.to ?? periodStart;

  return {
    period: {
      from: periodStart,
      to: periodEnd,
      label: `${periodStart} a ${periodEnd}`,
    },
    generatedAt: new Date().toISOString(),
    restaurant: "RIBBAI",
    dailyReports,
    leaderboard,
    scoringRules,
    weeklySignals: buildWeeklySignals(dailyReports),
  };
}

function buildWeeklySignals(dailyReports) {
  const highPressureDays = dailyReports.filter((report) => report.signals.highPressure);
  const noIncidentDays = dailyReports.filter((report) => report.signals.noRelevantIncidents);
  const sectorRatings = dailyReports.flatMap((report) =>
    report.ratings.filter((rating) => normalizeText(rating.label).includes("modelo de setores"))
  );

  return {
    reportsScanned: dailyReports.length,
    highPressureDays: highPressureDays.length,
    noIncidentDays: noIncidentDays.length,
    sectorModelRatings: sectorRatings,
    topOperationalNotes: dailyReports.flatMap((report) => report.operationalNotes).slice(0, 8),
    managementNotes: dailyReports.flatMap((report) => report.managementNotes).slice(0, 8),
  };
}

export { formatDuration };
