import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import puppeteer from "puppeteer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const sourcePath = path.join(rootDir, "docs", "RIBBAI_OPS_HAS_BORN.html");
const outputPath = path.join(rootDir, "docs", "RIBBAI OPS has born.pdf");

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
      <div style="font-family: Arial, sans-serif; font-size: 8px; color: #6b7280; width: 100%; padding: 0 16mm; display: flex; justify-content: space-between;">
        <span>RIBBAI OPS has born</span>
        <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
      </div>
    `,
    margin: {
      top: "18mm",
      right: "16mm",
      bottom: "18mm",
      left: "16mm",
    },
  });
} finally {
  await browser.close();
}

console.log(`PDF generated: ${outputPath}`);
