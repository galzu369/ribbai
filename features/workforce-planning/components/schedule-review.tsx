'use client';

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

type WorkforceDayType = "WORK" | "OFF" | "HOLIDAY" | "SICK_LEAVE" | "OTHER";

export type WorkforceScheduleEntryViewModel = {
  id: string;
  employeeName: string;
  date: string;
  weekday: number;
  plannedStart: string | null;
  plannedEnd: string | null;
  dayType: WorkforceDayType;
  ocrConfidence: number | null;
  notes: string | null;
};

type Props = {
  scheduleId: string;
  status: string;
  entries: WorkforceScheduleEntryViewModel[];
};

export function WorkforceScheduleReview({ scheduleId, status, entries }: Props) {
  const router = useRouter();
  const [rows, setRows] = React.useState(entries);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isValidating, setIsValidating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleFieldChange = (index: number, field: keyof WorkforceScheduleEntryViewModel, value: string) => {
    setRows((prev) => {
      const next = [...prev];
      (next[index] as any)[field] = value;
      return next;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const payload = {
        scheduleId,
        entries: rows,
      };

      const response = await fetch("/api/workforce-planning/entries/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json?.error ?? "Falha ao guardar alterações do horário.");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado ao guardar alterações.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleValidate = async () => {
    setIsValidating(true);
    setError(null);

    try {
      const response = await fetch("/api/workforce-planning/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ scheduleId }),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json?.error ?? "Falha ao marcar horário como validado.");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado ao validar o horário.");
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            Revê e corrige as entradas geradas automaticamente pelo OCR. Linhas com confiança mais
            baixa aparecem realçadas.
          </p>
          <p className="text-xs text-muted-foreground">
            Estado atual:{" "}
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs capitalize">
              {status.toLowerCase().replace(/_/g, " ")}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "A guardar..." : "Guardar alterações"}
          </Button>
          <Button size="sm" onClick={handleValidate} disabled={isValidating}>
            {isValidating ? "A validar..." : "Marcar como validado"}
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="border-b bg-muted/50 text-[11px] uppercase text-muted-foreground">
              <th className="px-3 py-2 text-left">Colaborador</th>
              <th className="px-3 py-2 text-left">Data</th>
              <th className="px-3 py-2 text-left">Início</th>
              <th className="px-3 py-2 text-left">Fim</th>
              <th className="px-3 py-2 text-left">Tipo de dia</th>
              <th className="px-3 py-2 text-left">Confiança OCR</th>
              <th className="px-3 py-2 text-left">Notas</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-muted-foreground" colSpan={7}>
                  Ainda não existem entradas geradas para este horário.
                </td>
              </tr>
            ) : (
              rows.map((entry, index) => {
                const confidence = entry.ocrConfidence ?? 0;
                const isLowConfidence = confidence > 0 && confidence < 0.9;

                const startTime = entry.plannedStart
                  ? new Date(entry.plannedStart).toISOString().slice(11, 16)
                  : "";
                const endTime = entry.plannedEnd
                  ? new Date(entry.plannedEnd).toISOString().slice(11, 16)
                  : "";

                return (
                  <tr
                    key={entry.id}
                    className={`border-b last:border-0 ${isLowConfidence ? "bg-amber-50 dark:bg-amber-900/20" : ""}`}
                  >
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      <input
                        className="w-full rounded-md border px-2 py-1 text-xs"
                        value={entry.employeeName}
                        onChange={(e) => handleFieldChange(index, "employeeName", e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      <input
                        type="date"
                        className="w-full rounded-md border px-2 py-1 text-xs"
                        value={entry.date.slice(0, 10)}
                        onChange={(e) => handleFieldChange(index, "date", e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      <input
                        type="time"
                        className="w-full rounded-md border px-2 py-1 text-xs"
                        value={startTime}
                        onChange={(e) =>
                          handleFieldChange(
                            index,
                            "plannedStart",
                            `${entry.date.slice(0, 10)}T${e.target.value}:00.000Z`,
                          )
                        }
                      />
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      <input
                        type="time"
                        className="w-full rounded-md border px-2 py-1 text-xs"
                        value={endTime}
                        onChange={(e) =>
                          handleFieldChange(
                            index,
                            "plannedEnd",
                            `${entry.date.slice(0, 10)}T${e.target.value}:00.000Z`,
                          )
                        }
                      />
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      <select
                        className="w-full rounded-md border px-2 py-1 text-xs"
                        value={entry.dayType}
                        onChange={(e) => handleFieldChange(index, "dayType", e.target.value)}
                      >
                        <option value="WORK">Trabalho</option>
                        <option value="OFF">Folga</option>
                        <option value="HOLIDAY">Férias</option>
                        <option value="SICK_LEAVE">Baixa</option>
                        <option value="OTHER">Outro</option>
                      </select>
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      {confidence ? `${(confidence * 100).toFixed(1)}%` : "—"}
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        className="w-full rounded-md border px-2 py-1 text-xs"
                        value={entry.notes ?? ""}
                        onChange={(e) => handleFieldChange(index, "notes", e.target.value)}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

