import { prisma } from "@/lib/db/client";
import { logger } from "@/lib/logging";
import { normalizeKPIValue } from "../utils/data-transforms";
import type { KPIValue } from "../types";
import {
  getPlannedVsActualForSchedule,
  type PlannedVsActualHours,
} from "@/features/workforce-planning/services/integration";

export type WorkforceWeekSummary = {
  scheduleId: string;
  year: number;
  weekNumber: number;
  plannedHours: KPIValue;
  actualHours: KPIValue;
  overtimeHours: KPIValue;
  differenceHours: KPIValue;
  coverageByDay: Record<string, KPIValue>;
  coverageByHour: Record<string, KPIValue>;
  workloadByEmployee: Record<string, KPIValue>;
  plannedVsActualByEmployee: PlannedVsActualHours[];
};

export class WorkforceAnalyticsService {
  /**
   * Get workforce KPIs for a specific schedule (week).
   */
  static async getWeekSummary(scheduleId: string): Promise<WorkforceWeekSummary> {
    const schedule = await prisma.workforceSchedule.findUnique({
      where: { id: scheduleId },
      include: {
        entries: true,
      },
    });

    if (!schedule) {
      throw new Error(`WorkforceSchedule not found: ${scheduleId}`);
    }

    const plannedVsActual = await getPlannedVsActualForSchedule(scheduleId);

    const totalPlanned = plannedVsActual.reduce((sum, row) => sum + row.plannedHours, 0);
    const totalActual = plannedVsActual.reduce((sum, row) => sum + row.actualHours, 0);
    const totalOvertime = plannedVsActual.reduce((sum, row) => sum + row.overtimeHours, 0);
    const totalDifference = plannedVsActual.reduce((sum, row) => sum + row.difference, 0);

    const coverageByDay: Record<string, KPIValue> = {};
    const coverageByHour: Record<string, KPIValue> = {};
    const workloadByEmployee: Record<string, KPIValue> = {};

    // Coverage by day/hour & workload by employee
    for (const entry of schedule.entries) {
      if (!entry.plannedStart || !entry.plannedEnd) continue;

      const dayKey = entry.date.toISOString().slice(0, 10);
      const start = entry.plannedStart;
      const end = entry.plannedEnd;

      // Aggregate daily coverage (total hours scheduled across team)
      const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      const currentDay = coverageByDay[dayKey]?.value ?? 0;
      coverageByDay[dayKey] = normalizeKPIValue(currentDay + durationHours);

      // Aggregate per-employee workload
      const employeeKey = entry.employeeName || "Desconhecido";
      const currentEmployeeHours = workloadByEmployee[employeeKey]?.value ?? 0;
      workloadByEmployee[employeeKey] = normalizeKPIValue(currentEmployeeHours + durationHours);

      // Coverage per hour slot (e.g. "Mon-10:00")
      const slotStart = new Date(start);
      while (slotStart < end) {
        const hourKey = `${slotStart.toISOString().slice(0, 10)} ${slotStart
          .toISOString()
          .slice(11, 16)}`;
        const current = coverageByHour[hourKey]?.value ?? 0;
        coverageByHour[hourKey] = normalizeKPIValue(current + 1); // +1 collaborator in slot

        slotStart.setMinutes(slotStart.getMinutes() + 30);
      }
    }

    return {
      scheduleId: schedule.id,
      year: schedule.year,
      weekNumber: schedule.weekNumber,
      plannedHours: normalizeKPIValue(Number(totalPlanned.toFixed(2))),
      actualHours: normalizeKPIValue(Number(totalActual.toFixed(2))),
      overtimeHours: normalizeKPIValue(Number(totalOvertime.toFixed(2)), 0),
      differenceHours: normalizeKPIValue(Number(totalDifference.toFixed(2)), 0),
      coverageByDay,
      coverageByHour,
      workloadByEmployee,
      plannedVsActualByEmployee: plannedVsActual,
    };
  }

  /**
   * Compare workforce load between two schedules (weeks).
   */
  static async compareWeeks(scheduleAId: string, scheduleBId: string) {
    logger.info("Comparing workforce weeks", { scheduleAId, scheduleBId });

    const [weekA, weekB] = await Promise.all([
      this.getWeekSummary(scheduleAId),
      this.getWeekSummary(scheduleBId),
    ]);

    return {
      weekA,
      weekB,
      deltaPlannedHours: weekB.plannedHours.value - weekA.plannedHours.value,
      deltaActualHours: weekB.actualHours.value - weekA.actualHours.value,
      deltaOvertimeHours: weekB.overtimeHours.value - weekA.overtimeHours.value,
    };
  }
}

