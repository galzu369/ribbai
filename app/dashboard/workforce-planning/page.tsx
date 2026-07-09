import { Metadata } from "next";
import Link from "next/link";

import { prisma } from "@/lib/db/client";
import { Button } from "@/components/ui/button";
import { WorkforceAnalyticsService } from "@/features/business-intelligence/services/workforce-analytics";

export const metadata: Metadata = {
  title: "Workforce Planning | RIBBAI Operations",
  description: "Weekly team schedules management and workforce planning.",
};

async function getSchedules() {
  return prisma.workforceSchedule.findMany({
    orderBy: [
      { year: "desc" },
      { weekNumber: "desc" },
    ],
  });
}

export default async function WorkforcePlanningPage() {
  const schedules = await getSchedules();

  const latestValidated =
    schedules.find((s) => s.status === "VALIDATED") ?? schedules[0] ?? null;

  const analytics =
    latestValidated != null
      ? await WorkforceAnalyticsService.getWeekSummary(latestValidated.id)
      : null;

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Workforce Planning</h1>
          <p className="text-sm text-muted-foreground">
            Importa, revê e valida os horários semanais oficiais da equipa.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/workforce-planning/import">
            <Button>Importar novo horário semanal</Button>
          </Link>
        </div>
      </div>

      {analytics && (
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs uppercase text-muted-foreground mb-1">
              Horas planeadas vs realizadas
            </p>
            <p className="text-2xl font-bold">
              {analytics.plannedHours.value.toFixed(1)}h{" "}
              <span className="text-xs text-muted-foreground">planeadas</span>
            </p>
            <p className="text-sm mt-1">
              <span className="font-semibold">
                {analytics.actualHours.value.toFixed(1)}h
              </span>{" "}
              realizadas,{" "}
              <span
                className={
                  analytics.differenceHours.value > 0
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }
              >
                {analytics.differenceHours.value >= 0 ? "+" : ""}
                {analytics.differenceHours.value.toFixed(1)}h
              </span>{" "}
              diferença.
            </p>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs uppercase text-muted-foreground mb-1">
              Overtime semanal
            </p>
            <p className="text-2xl font-bold">
              {analytics.overtimeHours.value.toFixed(1)}h
            </p>
            <p className="text-sm mt-1 text-muted-foreground">
              Considera somatório de `Attendance.overtimeHours` na semana.
            </p>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs uppercase text-muted-foreground mb-1">
              Carga média por colaborador
            </p>
            <p className="text-2xl font-bold">
              {(
                analytics.plannedHours.value /
                Object.keys(analytics.workloadByEmployee).length
              ).toFixed(1)}
              h
            </p>
            <p className="text-sm mt-1 text-muted-foreground">
              Baseado no horário semanal validado mais recente.
            </p>
          </div>
        </div>
      )}

      <div className="rounded-lg border bg-card">
        <div className="px-4 py-3 border-b">
          <h2 className="font-semibold text-sm">Horários importados</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
                <th className="px-4 py-2 text-left">Ano</th>
                <th className="px-4 py-2 text-left">Semana</th>
                <th className="px-4 py-2 text-left">Período</th>
                <th className="px-4 py-2 text-left">Local</th>
                <th className="px-4 py-2 text-left">Departamento</th>
                <th className="px-4 py-2 text-left">Estado</th>
                <th className="px-4 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {schedules.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center text-muted-foreground" colSpan={7}>
                    Ainda não existem horários semanais importados.
                  </td>
                </tr>
              ) : (
                schedules.map((schedule) => (
                  <tr key={schedule.id} className="border-b last:border-0">
                    <td className="px-4 py-2">{schedule.year}</td>
                    <td className="px-4 py-2">W{schedule.weekNumber}</td>
                    <td className="px-4 py-2">
                      {schedule.weekStartDate.toISOString().slice(0, 10)} –{" "}
                      {schedule.weekEndDate.toISOString().slice(0, 10)}
                    </td>
                    <td className="px-4 py-2">{schedule.location ?? "—"}</td>
                    <td className="px-4 py-2">{schedule.department ?? "—"}</td>
                    <td className="px-4 py-2">
                      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs capitalize">
                        {schedule.status.toLowerCase().replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Link href={`/dashboard/workforce-planning/review/${schedule.id}`}>
                        <Button size="sm" variant="outline">
                          Rever
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

