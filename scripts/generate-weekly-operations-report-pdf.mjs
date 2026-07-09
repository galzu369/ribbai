import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import puppeteer from "puppeteer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const defaultHtmlPath = path.join(
  rootDir,
  "reports",
  "weekly",
  "relatorio-semanal-operacoes-ribbai-2026-06-03_2026-06-08.html"
);

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((arg) => arg.startsWith("--") && arg.includes("="))
    .map((arg) => {
      const [key, ...valueParts] = arg.slice(2).split("=");
      return [key, valueParts.join("=")];
    })
);

const htmlPath = args.html
  ? path.resolve(rootDir, args.html)
  : defaultHtmlPath;

const defaultPdfPath = path.join(
  rootDir,
  "reports",
  "weekly",
  "relatorio-semanal-operacoes-ribbai-2026-06-03_2026-06-08.pdf"
);

const pdfPath = args.output ? path.resolve(rootDir, args.output) : defaultPdfPath;

const browser = await puppeteer.launch({ headless: true });

try {
  const page = await browser.newPage();
  await page.setCacheEnabled(false);

  const htmlUrl = new URL(pathToFileURL(htmlPath).href);
  htmlUrl.searchParams.set("v", String(Date.now()));

  await page.goto(htmlUrl.href, {
    waitUntil: "networkidle0",
  });

  await page.pdf({
    path: pdfPath,
    format: "A4",
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: "<div></div>",
    footerTemplate: `
      <div style="font-family: Arial, sans-serif; font-size: 8px; color: #657085; width: 100%; padding: 0 13mm; display: flex; justify-content: space-between;">
        <span>RIBBAI OPS · Relatório Semanal</span>
        <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
      </div>
    `,
    margin: {
      top: "10mm",
      right: "0mm",
      bottom: "12mm",
      left: "0mm",
    },
  });

  console.warn(`Weekly operations PDF generated: ${pdfPath}`);
} finally {
  await browser.close();
}
