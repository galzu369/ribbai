import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import puppeteer from "puppeteer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const sourcePath = path.join(
  rootDir,
  "docs",
  "executive",
  "RIBBAI_3.0_EXECUTIVE_REPORT.html"
);

const outputPath = path.join(
  rootDir,
  "docs",
  "executive",
  "RIBB-AI_3.0_Executive_Project_and_Strategic_Value_Report.pdf"
);

const browser = await puppeteer.launch({
  headless: true,
});

try {
  const page = await browser.newPage();

  // Força reload completo para garantir estilos actualizados
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
      <div style="font-family: Arial, sans-serif; font-size: 8px; color: #6b7280; width: 100%; padding: 0 16mm; display: flex; justify-content: space-between;">
        <span>RIBB-A.I. 3.0 – Executive Project &amp; Strategic Value Report</span>
        <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
      </div>
    `,
    margin: {
      top: "16mm",
      right: "12mm",
      bottom: "18mm",
      left: "12mm",
    },
  });
} finally {
  await browser.close();
}

console.log(`PDF generated: ${outputPath}`);

