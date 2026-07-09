export type OvertimeEntry = {
  staffMember: string;
  date: string;
  monthKey: string;
  minutes: number;
  hours: number;
  formattedHours: string;
  sourceFile: string;
  sourceLine: number;
  evidence: string;
};

export type OvertimeWeek = {
  key: string;
  label: string;
  dateRangeLabel: string;
  start: string;
  end: string;
};

export type StaffOvertimeRow = {
  staffMember: string;
  weeklyMinutes: Record<string, number>;
  weeklyHours: Record<string, string>;
  totalMinutes: number;
  totalHours: string;
};

export type MonthlyOvertimeReport = {
  monthKey: string;
  monthLabel: string;
  weeks: OvertimeWeek[];
  staffRows: StaffOvertimeRow[];
  entries: OvertimeEntry[];
  filesScanned: number;
  staffCount: number;
  totalMinutes: number;
  totalHours: string;
};

export function formatHours(minutes: number): string;
export function parseDurationToMinutes(text: string): number | null;
export function parseReportDate(content: string, filePath?: string): Date | null;
export function extractOvertimeEntriesFromMarkdown(content: string, filePath?: string): OvertimeEntry[];
export function findDailyReportFiles(rootDir: string): Promise<string[]>;
export function extractOvertimeEntriesFromFiles(files: string[]): Promise<OvertimeEntry[]>;
export function getMonthKey(date: Date): string;
export function formatMonthLabel(monthKey: string): string;
export function getWeeksForMonth(monthKey: string): OvertimeWeek[];
export function buildMonthlyOvertimeReports(
  entries: OvertimeEntry[],
  filesScanned?: number
): MonthlyOvertimeReport[];
