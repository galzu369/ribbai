import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { resolve } from "path";

import { env } from "@/lib/env";
import { uploadToStorage } from "@/lib/supabase/storage";
import { logger } from "@/lib/logging";
import { WorkforceScheduleService } from "@/server/services/workforce/workforce-schedule-service";
import { parseWorkforceScheduleFromSource } from "@/features/workforce-planning/services/ocr-parser";
import { prisma } from "@/lib/db/client";

export const runtime = "nodejs";

/**
 * Technical backfill endpoint for seeding the first workforce schedule
 * from the July 2026 planning file (1–5 July 2026).
 *
 * POST /api/workforce-planning/backfill/july-2026
 */
export async function POST(_request: NextRequest) {
  try {
    const relativePath = "escalas-ribbai-2026/output/schedule.pdf";
    const absolutePath = resolve(process.cwd(), relativePath);

    const buffer = await readFile(absolutePath);

    const year = 2026;
    const weekNumber = 27; // ISO week for 1–5 July 2026
    const weekStartDate = new Date("2026-07-01T00:00:00.000Z");
    const weekEndDate = new Date("2026-07-05T23:59:59.000Z");

    const safeFileName = "schedule-july-2026-week-27.pdf";
    const storagePath = `workforce-schedules/${year}/week-${weekNumber}/${safeFileName}`;
    const mimeType = "application/pdf";

    // Tentar enviar para o Supabase Storage, mas não bloquear o backfill
    // caso o serviço de storage não esteja configurado neste ambiente.
    let fileUrl: string;

    try {
      const { error: uploadError } = await uploadToStorage({
        path: storagePath,
        body: buffer,
        contentType: mimeType,
      });

      if (uploadError) {
        logger.warn("Failed to upload July 2026 workforce schedule to Supabase Storage", {
          error: uploadError,
        });
        fileUrl = `file://${absolutePath.replace(/\\/g, "/")}`;
      } else {
        fileUrl = `supabase://${env.SUPABASE_STORAGE_BUCKET}/${storagePath}`;
      }
    } catch (storageError) {
      logger.warn("Exception while uploading July 2026 schedule to storage, falling back to local file URL", {
        error: storageError,
      });
      fileUrl = `file://${absolutePath.replace(/\\/g, "/")}`;
    }

    const service = new WorkforceScheduleService();

    const { schedule, document } = await service.createFromDocument({
      year,
      weekNumber,
      weekStartDate,
      weekEndDate,
      location: "RIBBAI Sala",
      department: "Front of House",
      document: {
        title: "Weekly Team Schedule - 1–5 July 2026",
        description: "Backfilled workforce planning document for 1–5 July 2026.",
        category: "WORKFORCE_PLANNING",
        subCategory: "WEEKLY_SCHEDULE",
        tags: ["workforce", "schedule", "weekly", "backfill"],
        fileUrl,
        fileName: safeFileName,
        fileSize: buffer.byteLength,
        mimeType,
      },
    });

    await parseWorkforceScheduleFromSource({
      scheduleId: schedule.id,
      sourceFileUrl: fileUrl,
    });

    await prisma.workforceSchedule.update({
      where: { id: schedule.id },
      data: {
        status: "VALIDATED",
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          scheduleId: schedule.id,
          documentId: document.id,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("Failed to backfill July 2026 workforce schedule", { error });

    return NextResponse.json(
      {
        success: false,
        error: "Failed to backfill July 2026 workforce schedule.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

