import { NextRequest, NextResponse } from "next/server";
import type { WorkforceDayType } from "@prisma/client";

import { prisma } from "@/lib/db/client";
import { logger } from "@/lib/logging";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scheduleId, entries } = body as {
      scheduleId?: string;
      entries?: Array<{
        id: string;
        employeeName: string;
        date: string;
        weekday: number;
        plannedStart: string | null;
        plannedEnd: string | null;
        dayType: string;
        notes: string | null;
      }>;
    };

    if (!scheduleId || !Array.isArray(entries)) {
      return NextResponse.json(
        { success: false, error: "Missing scheduleId or entries in request body." },
        { status: 400 },
      );
    }

    const schedule = await prisma.workforceSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule) {
      return NextResponse.json(
        { success: false, error: "Workforce schedule not found." },
        { status: 404 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.workforceScheduleEntry.deleteMany({
        where: { workforceScheduleId: scheduleId },
      });

      const data = entries.map((entry, index) => {
        const baseDate = new Date(entry.date);
        const plannedStart = entry.plannedStart ? new Date(entry.plannedStart) : null;
        const plannedEnd = entry.plannedEnd ? new Date(entry.plannedEnd) : null;

        let plannedHours: number | null = null;

        if (plannedStart && plannedEnd) {
          const diffMs = plannedEnd.getTime() - plannedStart.getTime();
          plannedHours = diffMs > 0 ? diffMs / (1000 * 60 * 60) : 0;
        }

        return {
          workforceScheduleId: scheduleId,
          employeeId: null,
          employeeName: entry.employeeName,
          date: baseDate,
          weekday: entry.weekday ?? baseDate.getDay(),
          plannedStart,
          plannedEnd,
          breakStart: null,
          breakEnd: null,
          plannedHours,
          shiftLabel: null,
          dayType: entry.dayType as WorkforceDayType,
          sourceRow: index,
          sourceColumn: 0,
          ocrConfidence: null,
          notes: entry.notes,
        };
      });

      if (data.length > 0) {
        await tx.workforceScheduleEntry.createMany({
          data,
        });
      }
    });

    return NextResponse.json(
      {
        success: true,
      },
      { status: 200 },
    );
  } catch (error) {
    logger.error("Failed to save workforce schedule entries", { error });

    return NextResponse.json(
      {
        success: false,
        error: "Failed to save workforce schedule entries.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

