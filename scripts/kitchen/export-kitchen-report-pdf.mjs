import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import puppeteer from "puppeteer";
import { fromRoot, KITCHEN_CONFIG } from "./lib/project-root.mjs";

/**
 * Exporta o relatório de costing para PDF.
 *   --layout=portrait  (default) → V1 A4 vertical
 *   --layout=landscape           → V2 A4 horizontal
 *
 * A orientação vem do próprio CSS (`@page size: A4 landscape`) via
 * preferCSSPageSize, e a escala fica a 1 — nunca se encolhe o documento para
 * caber, que anularia o objetivo da V2.
 */
const layoutArg = process.argv
  .slice(2)
  .find((a) => a.startsWith("--layout="))
  ?.split("=")[1];
const SUFFIX = {
  portrait: "",
  landscape: "-v2-landscape",
  readable: "-v3-landscape-readable",
  "readable-tight": "-v3-1-landscape-readable",
};
if (layoutArg !== undefined && !(layoutArg in SUFFIX)) {
  console.error(`Layout desconhecido: "${layoutArg}". Usar ${Object.keys(SUFFIX).join(", ")}.`);
  process.exit(2);
}
const layout = layoutArg ?? "portrait";

const base = path.join(
  fromRoot(KITCHEN_CONFIG.paths.reportsDir),
  "ribbai-kitchen-menu-costing-technical-sheets",
);
const suffix = SUFFIX[layout];
const htmlPath = `${base}${suffix}.html`;
const pdfPath = htmlPath.replace(/\.html$/, ".pdf");

if (!existsSync(htmlPath)) {
  console.error(
    `Relatório HTML não encontrado: ${htmlPath}\nCorre primeiro: npm run kitchen:report${layout === "landscape" ? ":landscape" : ""}`,
  );
  process.exit(1);
}

const browser = await puppeteer.launch({ headless: true, protocolTimeout: 300000 });
try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle0" });
  await page.pdf({
    path: pdfPath,
    format: "A4",
    landscape: layout !== "portrait",
    preferCSSPageSize: true,
    printBackground: true,
    scale: 1,
    displayHeaderFooter: false,
  });
} finally {
  await browser.close();
}

console.log(`✓ PDF gerado (${layout}): ${pdfPath}`);
