import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import puppeteer from "puppeteer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const sourcePath = path.join(rootDir, "pdf", "templates", "closing-checklist.html");
const outputDir = path.join(rootDir, "docs", "operational-records", "checklists");
const outputPath = path.join(outputDir, "closing-checklist-ribbai.pdf");

await mkdir(outputDir, { recursive: true });

const browser = await puppeteer.launch({
  headless: true,
});

try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(sourcePath).href, {
    waitUntil: "networkidle0",
  });

  await page.pdf({
    path: outputPath,
    format: "A4",
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: "<div></div>",
    footerTemplate: `
      <div style="font-family: Arial, sans-serif; font-size: 8px; color: #687085; width: 100%; padding: 0 13mm; display: flex; justify-content: space-between;">
        <span>RIBBAI OPS · Checklist de Fecho</span>
        <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
      </div>
    `,
    margin: {
      top: "14mm",
      right: "13mm",
      bottom: "16mm",
      left: "13mm",
    },
  });
} finally {
  await browser.close();
}

console.warn(`PDF generated: ${outputPath}`);
