import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const GENERIC_SECTION_NAMES = new Set([
  "objetivos da medida",
  "envolvimento da equipa",
  "decisao operacional",
  "decisão operacional",
  "estado",
  "beneficios esperados",
  "benefícios esperados",
  "descricao",
  "descrição",
  "impacto",
  "causa identificada",
  "medida corretiva aplicada",
  "classificacao operacional",
  "classificação operacional",
  "operational notes",
  "service improvement candidate",
  "incident input",
  "team feedback input",
  "overtime input",
  "management notes",
  "inventory context",
  "weather context",
  "registo de horas extra",
  "total da equipa",
  "equipa",
  // Ignorar capítulos de organização / distribuição que não são colaboradores
  "distribuicao por setores",
  "distribuição por setores",
  "distribuicao operacional",
  "distribuição operacional",
]);

const monthFormatter = new Intl.DateTimeFormat("pt-PT", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const shortDateFormatter = new Intl.DateTimeFormat("pt-PT", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});

function normalizeText(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const STAFF_MEMBER_ALIASES = new Map([
  ["filipe", "Filipe Catalão"],
  ["filipe catalao", "Filipe Catalão"],
]);

export function canonicalizeStaffMember(name) {
  const normalized = normalizeText(name).trim();
  return STAFF_MEMBER_ALIASES.get(normalized) ?? name;
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function parseNumber(value) {
  if (!value) {
    return 0;
  }

  return Number.parseFloat(value.replace(",", "."));
}

export function formatHours(minutes) {
  return `${(minutes / 60).toLocaleString("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} h`;
}

export function parseDurationToMinutes(text) {
  const normalized = normalizeText(text);
  const compactHourMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*h(?:(\d{1,2})\s*m?|\s+(\d{1,2})\s*m?)?\b/);

  if (compactHourMatch) {
    const hours = parseNumber(compactHourMatch[1]);
    const minuteText = compactHourMatch[2] ?? compactHourMatch[3];
    const minutes = minuteText ? Number.parseInt(minuteText, 10) : 0;
    return Math.round(hours * 60 + minutes);
  }

  const hourMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*(?:horas?|hours?|hrs?)/);
  const minuteMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*(?:minutos?|mins?|minutes?)/);
  const hours = hourMatch ? parseNumber(hourMatch[1]) : 0;
  const minutes = minuteMatch ? parseNumber(minuteMatch[1]) : 0;
  const totalMinutes = Math.round(hours * 60 + minutes);

  return totalMinutes > 0 ? totalMinutes : null;
}

export function parseReportDate(content, filePath = "") {
  const metadataDateMatch = content.match(/\|\s*Data\s*\|\s*(\d{2})-(\d{2})-(\d{4})\s*\|/i);

  if (metadataDateMatch) {
    const [, day, month, year] = metadataDateMatch;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  }

  const filenameDateMatch = path.basename(filePath).match(/(\d{4})-(\d{2})-(\d{2})/);

  if (filenameDateMatch) {
    const [, year, month, day] = filenameDateMatch;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  }

  return null;
}

function getSentence(line) {
  return line.replace(/^[-*]\s*/, "").trim();
}

function isOvertimeSentence(sentence) {
  const normalized = normalizeText(sentence);
  return (
    /\b(extra|overtime|suplementar(?:es)?|extraordinari[ao]s?)\b/.test(normalized) &&
    parseDurationToMinutes(sentence) !== null
  );
}

function isStaffHeading(heading) {
  const normalized = normalizeText(heading).trim();

  if (!normalized || GENERIC_SECTION_NAMES.has(normalized)) {
    return false;
  }

  return /^[a-z]+(?:\s+[a-z]+){0,3}$/.test(normalized);
}

export function extractOvertimeEntriesFromMarkdown(content, filePath = "") {
  const reportDate = parseReportDate(content, filePath);

  if (!reportDate) {
    return [];
  }

  const entries = [];
  let currentStaffMember = null;
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    const headingMatch = line.match(/^###\s+(.+?)\s*$/);

    if (headingMatch) {
      const heading = headingMatch[1].trim();
      currentStaffMember = isStaffHeading(heading) ? canonicalizeStaffMember(heading) : null;
      return;
    }

    if (!currentStaffMember) {
      return;
    }

    const sentence = getSentence(line);

    if (!isOvertimeSentence(sentence)) {
      return;
    }

    const minutes = parseDurationToMinutes(sentence);

    if (!minutes) {
      return;
    }

    entries.push({
      staffMember: currentStaffMember,
      date: toIsoDate(reportDate),
      monthKey: getMonthKey(reportDate),
      minutes,
      hours: minutes / 60,
      formattedHours: formatHours(minutes),
      sourceFile: filePath,
      sourceLine: index + 1,
      evidence: sentence,
    });
  });

  return entries;
}

export async function findDailyReportFiles(rootDir) {
  const files = [];

  async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        await walk(entryPath);
        continue;
      }

      const normalizedPath = normalizeText(entryPath);
      const isDailyMarkdown = normalizedPath.includes(`${path.sep}daily${path.sep}`) && entry.name.endsWith(".md");
      const isOperationalReport =
        normalizeText(entry.name).includes("registo-diario-operacional") ||
        normalizeText(entry.name).includes("daily-operational");

      if (isDailyMarkdown && isOperationalReport) {
        files.push(entryPath);
      }
    }
  }

  await walk(rootDir);
  return files.sort((left, right) => left.localeCompare(right));
}

export async function extractOvertimeEntriesFromFiles(files) {
  const entries = [];

  for (const filePath of files) {
    const content = await readFile(filePath, "utf8");
    entries.push(...extractOvertimeEntriesFromMarkdown(content, filePath));
  }

  return entries.sort((left, right) => {
    const dateComparison = left.date.localeCompare(right.date);
    return dateComparison === 0 ? left.staffMember.localeCompare(right.staffMember) : dateComparison;
  });
}

export function getMonthKey(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function formatMonthLabel(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  return monthFormatter.format(new Date(Date.UTC(year, month - 1, 1)));
}

function getMonthDateRange(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  return { start, end };
}

function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
}

function getMonday(date) {
  const monday = new Date(date);
  const day = monday.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  monday.setUTCDate(monday.getUTCDate() + offset);
  return monday;
}

export function getWeeksForMonth(monthKey) {
  const { start, end } = getMonthDateRange(monthKey);
  const weeks = [];
  let currentStart = getMonday(start);
  let index = 1;

  while (currentStart <= end) {
    const currentEnd = addDays(currentStart, 6);
    const labelStart = currentStart < start ? start : currentStart;
    const labelEnd = currentEnd > end ? end : currentEnd;

    weeks.push({
      key: `${toIsoDate(currentStart)}_${toIsoDate(currentEnd)}`,
      label: `Week ${index}`,
      dateRangeLabel: `${shortDateFormatter.format(labelStart)} - ${shortDateFormatter.format(labelEnd)}`,
      start: toIsoDate(currentStart),
      end: toIsoDate(currentEnd),
    });

    currentStart = addDays(currentStart, 7);
    index += 1;
  }

  return weeks;
}

function getWeekKeyForDate(date, weeks) {
  const isoDate = toIsoDate(date);
  return weeks.find((week) => isoDate >= week.start && isoDate <= week.end)?.key;
}

export function buildMonthlyOvertimeReports(entries, filesScanned = 0) {
  const entriesByMonth = new Map();

  for (const entry of entries) {
    const monthEntries = entriesByMonth.get(entry.monthKey) ?? [];
    monthEntries.push(entry);
    entriesByMonth.set(entry.monthKey, monthEntries);
  }

  return [...entriesByMonth.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([monthKey, monthEntries]) => {
      const weeks = getWeeksForMonth(monthKey);
      const staffRowsByName = new Map();

      for (const entry of monthEntries) {
        const staffMember = canonicalizeStaffMember(entry.staffMember);
        const row =
          staffRowsByName.get(staffMember) ??
          {
            staffMember,
            weeklyMinutes: Object.fromEntries(weeks.map((week) => [week.key, 0])),
            totalMinutes: 0,
          };
        const weekKey = getWeekKeyForDate(new Date(`${entry.date}T00:00:00.000Z`), weeks);

        if (weekKey) {
          row.weeklyMinutes[weekKey] += entry.minutes;
        }

        row.totalMinutes += entry.minutes;
        staffRowsByName.set(staffMember, row);
      }

      const staffRows = [...staffRowsByName.values()]
        .map((row) => ({
          ...row,
          weeklyHours: Object.fromEntries(
            weeks.map((week) => [week.key, formatHours(row.weeklyMinutes[week.key] ?? 0)])
          ),
          totalHours: formatHours(row.totalMinutes),
        }))
        .sort((left, right) => right.totalMinutes - left.totalMinutes || left.staffMember.localeCompare(right.staffMember));
      const totalMinutes = staffRows.reduce((total, row) => total + row.totalMinutes, 0);

      return {
        monthKey,
        monthLabel: formatMonthLabel(monthKey),
        weeks,
        staffRows,
        entries: monthEntries,
        filesScanned,
        staffCount: staffRows.length,
        totalMinutes,
        totalHours: formatHours(totalMinutes),
      };
    });
}
