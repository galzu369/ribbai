import { createSupabaseServiceClient } from "@/lib/supabase/client";
import { prisma } from "@/lib/db/client";
import type { WorkforceDayType } from "@prisma/client";
import Tesseract from "tesseract.js";

type OcrEngineConfig = {
  language?: string;
};

export type ParseWorkforceScheduleOptions = {
  scheduleId: string;
  /**
   * Path in the form `supabase://bucket/path/to/file` as stored in Document.fileUrl.
   */
  sourceFileUrl: string;
  engineConfig?: OcrEngineConfig;
};

export type ParsedShiftBlock = {
  employeeName: string;
  date: Date;
  weekday: number;
  startTime: string;
  endTime: string;
  marker: string;
  dayType: WorkforceDayType;
};

export type ParseWorkforceScheduleResult = {
  blocks: ParsedShiftBlock[];
  confidenceAverage: number;
};

function parseSupabaseUrl(supabaseUrl: string) {
  if (!supabaseUrl.startsWith("supabase://")) {
    throw new Error("Unsupported storage URL format for workforce schedule OCR.");
  }

  const [, rest] = supabaseUrl.split("supabase://");
  const [bucket, ...pathParts] = rest.split("/");

  if (!bucket || pathParts.length === 0) {
    throw new Error("Invalid Supabase storage URL for workforce schedule OCR.");
  }

  return {
    bucket,
    path: pathParts.join("/"),
  };
}

/**
 * Best-effort OCR and parsing for weekly team schedules.
 *
 * Assumes a grid layout with:
 * - Column headers = employee names
 * - Row headers = time slots (e.g. 8h30, 9h, 9h30, ...)
 * - Cells containing markers like "x" or "f" to indicate presence/folga
 *
 * The algorithm is intentionally conservative: when confiança é baixa,
 * marca o registo com menor `ocrConfidence` e deixa espaço para revisão manual.
 */
export async function parseWorkforceScheduleFromSource(
  options: ParseWorkforceScheduleOptions,
): Promise<ParseWorkforceScheduleResult> {
  const { scheduleId, sourceFileUrl, engineConfig } = options;

  const { bucket, path } = parseSupabaseUrl(sourceFileUrl);

  const supabase = createSupabaseServiceClient();

  const { data, error } = await supabase.storage.from(bucket).download(path);

  if (error || !data) {
    throw new Error(`Failed to download workforce schedule source file for OCR: ${error?.message}`);
  }

  // Run OCR using tesseract.js
  const ocrResult = await Tesseract.recognize(data, engineConfig?.language ?? "por", {
    logger: () => {
      // Intentionally silent in production; hook here if we want detailed logs.
    },
  });

  const fullText = ocrResult.data.text;
  const confidenceAverage = ocrResult.data.confidence;

  // Na fase inicial, usamos um parser de texto simples que procura:
  // - Linhas com horas
  // - Nomes de colaboradores no cabeçalho
  // - Marcas "x" ou "f" associadas a blocos de tempo
  //
  // NOTA: Isto pode (e deve) ser evoluído com parsing por bounding boxes.

  const lines = fullText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  // Horários típicos no template (8h30, 9h, 9h30, ...)
  const timeSlotRegex = /^(\d{1,2}h(?:30)?)$/i;

  const headerLineIndex = lines.findIndex((line) =>
    line.toLowerCase().includes("bruno") || line.toLowerCase().includes("sofia"),
  );

  if (headerLineIndex === -1) {
    // Se não conseguirmos detetar cabeçalhos, devolvemos resultado vazio com confiança baixa
    return {
      blocks: [],
      confidenceAverage: confidenceAverage ?? 0,
    };
  }

  const headerLine = lines[headerLineIndex];
  const employeeNames = headerLine
    .split(/\s{2,}|\t+/)
    .map((name) => name.trim())
    .filter((name) => name.length > 0);

  const timeLines = lines.slice(headerLineIndex + 1).filter((line) => timeSlotRegex.test(line.split(/\s+/)[0]));

  const blocks: ParsedShiftBlock[] = [];

  // Este parser é deliberadamente simplificado: percorre linhas de tempo e, para cada coluna,
  // quando encontra um "x" ou "f" assume que o colaborador está escalado nesse slot.
  // Posteriormente, slots contíguos são agregados em blocos contínuos a nível de service
  // que grava na base de dados.

  for (const line of timeLines) {
    const parts = line.split(/\s+/);
    const timeToken = parts[0];

    if (!timeSlotRegex.test(timeToken)) continue;

    const timeIndex = parts.indexOf(timeToken);
    const cellTokens = parts.slice(timeIndex + 1);

    const hour = parseInt(timeToken.replace("h", "").replace("H", ""), 10);
    const minutes = timeToken.toLowerCase().includes("30") ? 30 : 0;

    // Placeholder: associamos sempre a um único dia por agora; a data real é extraída
    // da entidade WorkforceSchedule a seguir.
    for (let col = 0; col < cellTokens.length && col < employeeNames.length; col++) {
      const marker = cellTokens[col].toLowerCase();

      if (marker !== "x" && marker !== "f") continue;

      const dayType: WorkforceDayType = marker === "f" ? "OFF" : "WORK";

      blocks.push({
        employeeName: employeeNames[col],
        // Data real será substituída com base na semana quando gravarmos as entries.
        date: new Date(),
        weekday: 0,
        startTime: `${hour.toString().padStart(2, "0")}:${minutes === 0 ? "00" : "30"}`,
        endTime: `${hour.toString().padStart(2, "0")}:${minutes === 0 ? "30" : "00"}`,
        marker,
        dayType,
      });
    }
  }

  // Agora gravamos blocos agregados em WorkforceScheduleEntry, distribuindo pelas datas reais da semana.
  await persistParsedBlocks(scheduleId, blocks, confidenceAverage ?? 0);

  return {
    blocks,
    confidenceAverage: confidenceAverage ?? 0,
  };
}

async function persistParsedBlocks(
  scheduleId: string,
  blocks: ParsedShiftBlock[],
  confidenceAverage: number,
) {
  const schedule = await prisma.workforceSchedule.findUnique({
    where: { id: scheduleId },
  });

  if (!schedule) {
    throw new Error(`WorkforceSchedule not found for OCR parsing: ${scheduleId}`);
  }

  const weekStart = schedule.weekStartDate;

  // Distribuímos todos os blocos ao longo da semana (segunda a domingo),
  // usando weekday 0..6. Nesta primeira versão, como o OCR não distingue
  // colunas por dia, atribuiremos tudo ao primeiro dia (weekday 0),
  // deixando para revisão humana os ajustes finos.

  const entriesData = blocks.map((block, index) => {
    const baseDate = new Date(weekStart);
    baseDate.setDate(baseDate.getDate() + block.weekday);

    const [startHour, startMinute] = block.startTime.split(":").map((v) => parseInt(v, 10));
    const [endHour, endMinute] = block.endTime.split(":").map((v) => parseInt(v, 10));

    const plannedStart = new Date(baseDate);
    plannedStart.setHours(startHour, startMinute, 0, 0);

    const plannedEnd = new Date(baseDate);
    plannedEnd.setHours(endHour, endMinute, 0, 0);

    const plannedHours = (endHour + endMinute / 60) - (startHour + startMinute / 60);

    return {
      workforceScheduleId: scheduleId,
      employeeName: block.employeeName,
      date: baseDate,
      weekday: block.weekday,
      plannedStart,
      plannedEnd,
      plannedHours,
      shiftLabel: null,
      dayType: block.dayType,
      sourceRow: index,
      sourceColumn: 0,
      ocrConfidence: confidenceAverage / 100,
      notes: null,
    };
  });

  if (entriesData.length === 0) {
    return;
  }

  await prisma.workforceScheduleEntry.createMany({
    data: entriesData,
    skipDuplicates: true,
  });
}

