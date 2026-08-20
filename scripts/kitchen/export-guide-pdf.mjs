import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import puppeteer from "puppeteer";
import { fromRoot, KITCHEN_CONFIG } from "./lib/project-root.mjs";

/**
 * Exporta o guia da cozinha (HTML) para PDF, para poder ser enviado ao Chefe de
 * Cozinha. A orientação e as margens vêm do @page do próprio CSS.
 */
const docsDir = fromRoot(KITCHEN_CONFIG.paths.documentationDir);
const htmlPath = join(docsDir, "GUIA-COZINHA.html");
const pdfPath = join(docsDir, "RIBBAI-Guia-Cozinha-Atualizacao-Precos.pdf");

if (!existsSync(htmlPath)) {
  console.error(`Guia HTML não encontrado: ${htmlPath}`);
  process.exit(1);
}

const browser = await puppeteer.launch({ headless: true, protocolTimeout: 300000 });
try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle0" });
  await page.pdf({
    path: pdfPath,
    format: "A4",
    preferCSSPageSize: true,
    printBackground: true,
    scale: 1,
    displayHeaderFooter: false,
  });
} finally {
  await browser.close();
}

console.log(`✓ PDF: ${pdfPath}`);
