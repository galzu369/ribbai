import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import puppeteer from "puppeteer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

function parseArgs(argv) {
  const args = {};

  for (const raw of argv.slice(2)) {
    if (!raw.startsWith("--")) continue;
    const [key, ...rest] = raw.slice(2).split("=");
    const value = rest.join("=");
    args[key] = value === "" ? true : value;
  }

  return args;
}

const monthNames = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

function getMonthFolderName(monthIndex0) {
  const month = monthIndex0 + 1;
  const monthStr = String(month).padStart(2, "0");
  return `${monthStr}-${monthNames[monthIndex0]}`;
}

function toPtDate(isoDate) {
  const [y, m, d] = isoDate.split("-");
  return `${d}-${m}-${y}`;
}

const args = parseArgs(process.argv);
const date = typeof args.date === "string" ? args.date : "2026-06-03";

if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  throw new Error(`Invalid --date. Expected YYYY-MM-DD, got: ${date}`);
}

const [yearStr, monthStr] = date.split("-");
const year = Number(yearStr);
const monthIndex0 = Number(monthStr) - 1;
const dailyDir = path.join(
  rootDir,
  "docs",
  "operational-records",
  String(year),
  getMonthFolderName(monthIndex0),
  "daily"
);

const sourcePath = path.join(dailyDir, `${date}-registo-diario-operacional.html`);
const outputPath = path.join(dailyDir, `${date}-registo-diario-operacional.pdf`);
const datePt = toPtDate(date);

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
      <div style="font-family: Arial, sans-serif; font-size: 8px; color: #657085; width: 100%; padding: 0 14mm; display: flex; justify-content: space-between;">
        <span>RIBBAI OPS · Relatório Diário Operacional · ${datePt}</span>
        <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
      </div>
    `,
    margin: {
      top: "16mm",
      right: "14mm",
      bottom: "18mm",
      left: "14mm",
    },
  });
} finally {
  await browser.close();
}

console.log(`PDF generated: ${outputPath}`);
