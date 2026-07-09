import { prisma } from "@/lib/db/client";
import { logger } from "@/lib/logging";

export type PlannedVsActualHours = {
  employeeName: string;
  plannedHours: number;
  actualHours: number;
  overtimeHours: number;
  difference: number;
};

export async function getPlannedVsActualForSchedule(
  scheduleId: string,
): Promise<PlannedVsActualHours[]> {
  logger.info("Calculating planned vs actual hours for workforce schedule", { scheduleId });

  const schedule = await prisma.workforceSchedule.findUnique({
    where: { id: scheduleId },
    include: {
      entries: true,
    },
  });

  if (!schedule) {
    throw new Error(`WorkforceSchedule not found: ${scheduleId}`);
  }

  const startDate = schedule.weekStartDate;
  const endDate = schedule.weekEndDate;

  // Aggregate planned hours by employee (using employeeName for now; can be evolved to use employeeId mapping)
  const plannedByEmployee = new Map<string, number>();

  for (const entry of schedule.entries) {
    if (!entry.employeeName || !entry.plannedHours) continue;
    const key = entry.employeeName.trim();
    const existing = plannedByEmployee.get(key) ?? 0;
    plannedByEmployee.set(key, existing + Number(entry.plannedHours));
  }

  // Aggregate actual hours & overtime from attendance/shift data
  const attendanceRecords = await prisma.attendance.findMany({
    where: {
      shift: {
        shiftDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    },
    include: {
      employee: true,
      shift: true,
    },
  });

  const actualByEmployee = new Map<string, { hours: number; overtime: number }>();

  for (const record of attendanceRecords) {
    const name = record.employee
      ? `${record.employee.firstName} ${record.employee.lastName}`.trim()
      : "Desconhecido";

    let hours = 0;

    if (record.actualHours) {
      hours = Number(record.actualHours);
    } else if (record.clockInTime && record.clockOutTime) {
      const start = new Date(record.clockInTime);
      const end = new Date(record.clockOutTime);
      hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    } else if (record.shift) {
      const start = new Date(record.shift.startTime);
      const end = new Date(record.shift.endTime);
      hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    }

    const overtime = record.overtimeHours ? Number(record.overtimeHours) : 0;

    const aggregate = actualByEmployee.get(name) ?? { hours: 0, overtime: 0 };
    aggregate.hours += hours;
    aggregate.overtime += overtime;
    actualByEmployee.set(name, aggregate);
  }

  const employees = new Set<string>([
    ...Array.from(plannedByEmployee.keys()),
    ...Array.from(actualByEmployee.keys()),
  ]);

  const result: PlannedVsActualHours[] = [];

  for (const name of employees) {
    const planned = plannedByEmployee.get(name) ?? 0;
    const actualAggregate = actualByEmployee.get(name) ?? { hours: 0, overtime: 0 };
    const difference = actualAggregate.hours - planned;

    result.push({
      employeeName: name,
      plannedHours: Number(planned.toFixed(2)),
      actualHours: Number(actualAggregate.hours.toFixed(2)),
      overtimeHours: Number(actualAggregate.overtime.toFixed(2)),
      difference: Number(difference.toFixed(2)),
    });
  }

  return result.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
}

