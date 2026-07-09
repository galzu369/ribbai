import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db/client";
import { logger } from "@/lib/logging";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scheduleId } = body as { scheduleId?: string };

    if (!scheduleId) {
      return NextResponse.json(
        { success: false, error: "Missing scheduleId in request body." },
        { status: 400 },
      );
    }

    const schedule = await prisma.workforceSchedule.update({
      where: { id: scheduleId },
      data: {
        status: "VALIDATED",
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          scheduleId: schedule.id,
          status: schedule.status,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    logger.error("Failed to validate workforce schedule", { error });

    return NextResponse.json(
      {
        success: false,
        error: "Failed to validate workforce schedule.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

