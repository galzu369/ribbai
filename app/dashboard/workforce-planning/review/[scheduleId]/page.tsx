import { notFound } from "next/navigation";

import { prisma } from "@/lib/db/client";
import { WorkforceScheduleReview } from "@/features/workforce-planning/components/schedule-review";

interface ReviewPageProps {
  params: {
    scheduleId: string;
  };
}

export default async function WorkforceScheduleReviewPage({ params }: ReviewPageProps) {
  const schedule = await prisma.workforceSchedule.findUnique({
    where: { id: params.scheduleId },
    include: {
      entries: {
        orderBy: [
          { date: "asc" },
          { employeeName: "asc" },
        ],
      },
    },
  });

  if (!schedule) {
    notFound();
  }

  const entries = schedule.entries.map((entry) => ({
    id: entry.id,
    employeeName: entry.employeeName,
    date: entry.date.toISOString(),
    weekday: entry.weekday,
    plannedStart: entry.plannedStart ? entry.plannedStart.toISOString() : null,
    plannedEnd: entry.plannedEnd ? entry.plannedEnd.toISOString() : null,
    dayType: entry.dayType,
    ocrConfidence: entry.ocrConfidence ? Number(entry.ocrConfidence) : null,
    notes: entry.notes ?? null,
  }));

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Rever horário semanal – Ano {schedule.year}, Semana W{schedule.weekNumber}
        </h1>
        <p className="text-sm text-muted-foreground">
          {schedule.weekStartDate.toISOString().slice(0, 10)} –{" "}
          {schedule.weekEndDate.toISOString().slice(0, 10)}
        </p>
      </div>

      <WorkforceScheduleReview scheduleId={schedule.id} status={schedule.status} entries={entries} />
    </div>
  );
}

