import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { PATHS } from "./config";
import type { LayoutName } from "./report-html";
import { renderReport, setFichaScales, type FichaFit } from "./report-sections";
import { fromRoot, KITCHEN_CONFIG } from "./project-root";
import {
  buildModel,
  FICHA_SCALES_PATH,
  reportPathFor,
  validateHtml,
  validateModel,
} from "../generate-kitchen-report";

/**
 * Após sincronizar preços, regenera o relatório executivo (HTML + PDF)
 * com os valores atualizados. Usado pelo launcher do Chefe e por
 * `npm run kitchen:costing:update`.
 *
 * Nota: este módulo importa generate-kitchen-report — quem o chamar a partir
 * de update-costing deve usar `await import(...)` dinâmico para evitar
 * dependência circular estática.
 */

const DEFAULT_LAYOUTS: LayoutName[] = [
  "portrait",
  "landscape",
  "readable",
  "readable-tight",
];

function loadFichaScales(): Record<string, FichaFit> {
  try {
    const raw = JSON.parse(readFileSync(FICHA_SCALES_PATH, "utf-8")) as {
      scales?: Record<string, FichaFit>;
    };
    return raw.scales ?? {};
  } catch {
    return {};
  }
}

export interface ReportWriteResult {
  htmlPaths: string[];
  pdfPaths: string[];
  pdfErrors: string[];
}

/** Escreve os HTML de todos os layouts (ou os indicados). */
export function writeHtmlReports(
  layouts: LayoutName[] = DEFAULT_LAYOUTS,
): { htmlPaths: string[]; modelProblems: string[] } {
  mkdirSync(PATHS.reportsDir, { recursive: true });
  const { model } = buildModel();
  const modelProblems = validateModel(model);
  if (modelProblems.length > 0) {
    return { htmlPaths: [], modelProblems };
  }

  const scales = loadFichaScales();
  const htmlPaths: string[] = [];

  for (const layout of layouts) {
    setFichaScales(layout === "readable-tight" ? scales : {});
    const html = renderReport(model, layout);
    const htmlProblems = validateHtml(html, layout);
    if (htmlProblems.length > 0) {
      modelProblems.push(...htmlProblems.map((p) => `[${layout}] ${p}`));
      continue;
    }
    const path = reportPathFor(layout);
    writeFileSync(path, html, "utf-8");
    htmlPaths.push(path);
  }

  return { htmlPaths, modelProblems };
}

/** Candidatos a browser Chromium no Windows (Edge / Chrome). */
function findChromium(): string | null {
  if (process.platform !== "win32") return null;
  const candidates = [
    join(
      process.env["PROGRAMFILES(X86)"] ?? "C:\\Program Files (x86)",
      "Microsoft\\Edge\\Application\\msedge.exe",
    ),
    join(
      process.env.PROGRAMFILES ?? "C:\\Program Files",
      "Microsoft\\Edge\\Application\\msedge.exe",
    ),
    join(process.env.LOCALAPPDATA ?? "", "Microsoft\\Edge\\Application\\msedge.exe"),
    join(
      process.env.PROGRAMFILES ?? "C:\\Program Files",
      "Google\\Chrome\\Application\\chrome.exe",
    ),
    join(
      process.env["PROGRAMFILES(X86)"] ?? "C:\\Program Files (x86)",
      "Google\\Chrome\\Application\\chrome.exe",
    ),
    join(process.env.LOCALAPPDATA ?? "", "Google\\Chrome\\Application\\chrome.exe"),
  ];
  for (const c of candidates) {
    if (c && existsSync(c)) return c;
  }
  return null;
}

/**
 * Exporta um HTML para PDF via Edge/Chrome headless (sem Puppeteer).
 * Funciona no runtime portátil do Chefe.
 */
export function exportPdfViaChromium(htmlPath: string): string {
  const chromium = findChromium();
  if (!chromium) {
    throw new Error(
      "Edge/Chrome não encontrado — abra o HTML no browser e imprima para PDF (Ctrl+P).",
    );
  }
  const pdfPath = htmlPath.replace(/\.html$/i, ".pdf");
  const fileUrl = pathToFileURL(htmlPath).href;
  const result = spawnSync(
    chromium,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-pdf-header-footer",
      `--print-to-pdf=${pdfPath}`,
      fileUrl,
    ],
    { encoding: "utf-8", timeout: 120_000 },
  );
  if (result.status !== 0 || !existsSync(pdfPath)) {
    const detail = (result.stderr || result.stdout || "").trim().slice(0, 400);
    throw new Error(
      `Falha ao gerar PDF com ${chromium}${detail ? `: ${detail}` : ""}`,
    );
  }
  return pdfPath;
}

/**
 * Regenera HTML + PDF após sync. O layout principal operacional é V3.1
 * (readable-tight); os outros são regenerados em conjunto para não divergirem.
 */
export function generatePostSyncReports(
  layouts: LayoutName[] = DEFAULT_LAYOUTS,
): ReportWriteResult {
  const { htmlPaths, modelProblems } = writeHtmlReports(layouts);
  if (modelProblems.length > 0) {
    throw new Error(
      `Validação do relatório falhou:\n${modelProblems.map((p) => `  - ${p}`).join("\n")}`,
    );
  }

  const pdfPaths: string[] = [];
  const pdfErrors: string[] = [];

  const preferredOrder = [...htmlPaths].sort((a, b) => {
    const score = (p: string) =>
      p.includes("v3-1") ? 0 : p.includes("v3-") ? 1 : p.includes("v2-") ? 2 : 3;
    return score(a) - score(b);
  });

  for (const htmlPath of preferredOrder) {
    try {
      pdfPaths.push(exportPdfViaChromium(htmlPath));
    } catch (err: unknown) {
      pdfErrors.push(
        `${htmlPath}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return { htmlPaths, pdfPaths, pdfErrors };
}

/** Caminho relativo amigável para mensagens ao Chefe. */
export function relativeToProject(abs: string): string {
  const root = fromRoot(".").replace(/[\\/]+$/u, "");
  return abs.startsWith(root) ? abs.slice(root.length).replace(/^[\\/]/u, "") : abs;
}

export function reportsDirRelative(): string {
  return KITCHEN_CONFIG.paths.reportsDir;
}
