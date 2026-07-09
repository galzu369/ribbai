import { NextRequest, NextResponse } from "next/server";

import { env } from "@/lib/env";
import { uploadToStorage } from "@/lib/supabase/storage";
import { logger } from "@/lib/logging";
import { WorkforceScheduleService } from "@/server/services/workforce/workforce-schedule-service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const file = formData.get("file");
    const weekNumberRaw = formData.get("weekNumber");
    const yearRaw = formData.get("year");
    const weekStartDateRaw = formData.get("weekStartDate");
    const weekEndDateRaw = formData.get("weekEndDate");
    const location = (formData.get("location") as string | null) ?? null;
    const department = (formData.get("department") as string | null) ?? null;
    const importedByUserId = (formData.get("importedByUserId") as string | null) ?? null;

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "Missing or invalid file in request." },
        { status: 400 },
      );
    }

    if (!weekNumberRaw || !yearRaw || !weekStartDateRaw || !weekEndDateRaw) {
      return NextResponse.json(
        { success: false, error: "Missing required scheduling metadata (week/year/dates)." },
        { status: 400 },
      );
    }

    const weekNumber = Number(weekNumberRaw);
    const year = Number(yearRaw);
    const weekStartDate = new Date(String(weekStartDateRaw));
    const weekEndDate = new Date(String(weekEndDateRaw));

    if (!Number.isInteger(weekNumber) || !Number.isInteger(year)) {
      return NextResponse.json(
        { success: false, error: "Week number and year must be integers." },
        { status: 400 },
      );
    }

    if (Number.isNaN(weekStartDate.getTime()) || Number.isNaN(weekEndDate.getTime())) {
      return NextResponse.json(
        { success: false, error: "Invalid week start/end dates." },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const safeFileName = file.name || `workforce-week-${year}-${weekNumber}`;
    const storagePath = `workforce-schedules/${year}/week-${weekNumber}/${Date.now()}-${safeFileName}`;
    const mimeType = file.type || "application/octet-stream";

    const { error: uploadError } = await uploadToStorage({
      path: storagePath,
      body: buffer,
      contentType: mimeType,
    });

    if (uploadError) {
      logger.error("Failed to upload workforce schedule to storage", { error: uploadError });
      return NextResponse.json(
        { success: false, error: "Failed to upload file to storage." },
        { status: 500 },
      );
    }

    const fileUrl = `supabase://${env.SUPABASE_STORAGE_BUCKET}/${storagePath}`;

    const service = new WorkforceScheduleService();

    const result = await service.createFromDocument({
      year,
      weekNumber,
      weekStartDate,
      weekEndDate,
      location,
      department,
      importedByUserId,
      document: {
        title: `Weekly Team Schedule - ${year}-W${weekNumber}`,
        description: `Weekly workforce planning document for week ${weekNumber} of ${year}`,
        category: "WORKFORCE_PLANNING",
        subCategory: "WEEKLY_SCHEDULE",
        tags: ["workforce", "schedule", "weekly"],
        fileUrl,
        fileName: safeFileName,
        fileSize: buffer.byteLength,
        mimeType,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          scheduleId: result?.schedule.id,
          documentId: result?.document.id,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("Failed to import workforce schedule", { error });

    return NextResponse.json(
      {
        success: false,
        error: "Failed to import workforce schedule.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

