/**
 * Date utilities for BI operations
 */

export function formatDateRange(startDate: Date, endDate: Date): string {
  const start = startDate.toLocaleDateString('pt-PT');
  const end = endDate.toLocaleDateString('pt-PT');
  
  if (start === end) {
    return start;
  }
  
  return `${start} - ${end}`;
}

export function getDateRanges(referenceDate: Date = new Date()) {
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
  
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  
  const quarterStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
  
  const yearStart = new Date(today.getFullYear(), 0, 1);
  
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(weekStart.getDate() - 7);
  
  const lastWeekEnd = new Date(weekStart);
  lastWeekEnd.setDate(weekStart.getDate() - 1);
  
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
  
  return {
    today: { start: today, end: today },
    yesterday: { start: yesterday, end: yesterday },
    thisWeek: { start: weekStart, end: today },
    thisMonth: { start: monthStart, end: today },
    thisQuarter: { start: quarterStart, end: today },
    thisYear: { start: yearStart, end: today },
    lastWeek: { start: lastWeekStart, end: lastWeekEnd },
    lastMonth: { start: lastMonthStart, end: lastMonthEnd },
  };
}

export function calculateDateDiff(startDate: Date, endDate: Date): {
  days: number;
  weeks: number;
  months: number;
  hours: number;
} {
  const diffMs = endDate.getTime() - startDate.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.ceil(diffDays / 7);
  const diffMonths = Math.ceil(diffDays / 30.44); // Average month length
  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
  
  return {
    days: diffDays,
    weeks: diffWeeks,
    months: diffMonths,
    hours: diffHours,
  };
}

export function isWorkingDay(date: Date): boolean {
  const dayOfWeek = date.getDay();
  return dayOfWeek >= 1 && dayOfWeek <= 6; // Monday to Saturday (assuming Sunday is closed)
}

export function getWorkingDaysInRange(startDate: Date, endDate: Date): Date[] {
  const workingDays: Date[] = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    if (isWorkingDay(currentDate)) {
      workingDays.push(new Date(currentDate));
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return workingDays;
}