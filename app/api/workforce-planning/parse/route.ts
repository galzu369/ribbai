import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logging";
import { prisma } from "@/lib/db/client";
import { parseWorkforceScheduleFromSource } from "@/features/workforce-planning/services/ocr-parser";

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

    const schedule = await prisma.workforceSchedule.findUnique({
      where: { id: scheduleId },
      include: {
        sourceDocument: true,
      },
    });

    if (!schedule || !schedule.sourceDocument) {
      return NextResponse.json(
        { success: false, error: "Schedule or source document not found." },
        { status: 404 },
      );
    }

    const result = await parseWorkforceScheduleFromSource({
      scheduleId: schedule.id,
      sourceFileUrl: schedule.sourceDocument.fileUrl,
    });

    // Depois do parsing inicial, colocamos o horário em estado de revisão manual.
    await prisma.workforceSchedule.update({
      where: { id: schedule.id },
      data: {
        status: "IN_REVIEW",
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          blocks: result.blocks.length,
          confidenceAverage: result.confidenceAverage,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    logger.error("Failed to parse workforce schedule for OCR", { error });

    return NextResponse.json(
      {
        success: false,
        error: "Failed to parse workforce schedule.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

