'use client';

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export default function WorkforceScheduleImportPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const importResponse = await fetch("/api/workforce-planning/import", {
        method: "POST",
        body: formData,
      });

      const importJson = await importResponse.json();

      if (!importResponse.ok || !importJson?.data?.scheduleId) {
        throw new Error(importJson?.error ?? "Falha ao importar o horário semanal.");
      }

      const scheduleId = importJson.data.scheduleId as string;

      // Dispara OCR e criação de entries de forma síncrona na primeira versão
      await fetch("/api/workforce-planning/parse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ scheduleId }),
      });

      router.push(`/dashboard/workforce-planning/review/${scheduleId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado ao importar o horário.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const today = new Date();
  const defaultYear = today.getFullYear();

  return (
    <div className="container mx-auto py-8 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Importar horário semanal</h1>
        <p className="text-sm text-muted-foreground">
          Carrega o mapa semanal (imagem/PDF/Excel) recebido da gerência. O sistema irá transformar o
          documento em dados estruturados para análise.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border bg-card p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="year">
              Ano
            </label>
            <input
              id="year"
              name="year"
              type="number"
              defaultValue={defaultYear}
              min={2000}
              className="w-full rounded-md border px-3 py-2 text-sm"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="weekNumber">
              Semana (ISO)
            </label>
            <input
              id="weekNumber"
              name="weekNumber"
              type="number"
              min={1}
              max={53}
              className="w-full rounded-md border px-3 py-2 text-sm"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="weekStartDate">
              Data início da semana
            </label>
            <input
              id="weekStartDate"
              name="weekStartDate"
              type="date"
              className="w-full rounded-md border px-3 py-2 text-sm"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="weekEndDate">
              Data fim da semana
            </label>
            <input
              id="weekEndDate"
              name="weekEndDate"
              type="date"
              className="w-full rounded-md border px-3 py-2 text-sm"
              required
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="location">
              Local (opcional)
            </label>
            <input
              id="location"
              name="location"
              type="text"
              placeholder="Restaurante / unidade"
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="department">
              Departamento (opcional)
            </label>
            <input
              id="department"
              name="department"
              type="text"
              placeholder="Sala / cozinha / bar"
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="file">
            Documento do horário semanal
          </label>
          <input
            id="file"
            name="file"
            type="file"
            accept=".jpg,.jpeg,.png,.pdf,.xls,.xlsx"
            className="w-full rounded-md border px-3 py-2 text-sm"
            required
          />
          <p className="text-xs text-muted-foreground">
            Formatos suportados: imagem (JPG/PNG), PDF ou Excel. Idealmente usa o template oficial da
            gerência.
          </p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "A importar..." : "Importar e processar"}
          </Button>
        </div>
      </form>
    </div>
  );
}

