import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import puppeteer from "puppeteer";

import { buildWeeklyLeaderboardReport } from "./lib/leaderboard-report-parser.mjs";
import { renderWeeklyLeaderboardHtml } from "./lib/leaderboard-report-template.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const sourceRootDir = path.join(rootDir, "docs", "operational-records");
const outputDir = path.join(rootDir, "reports", "leaderboard");

function parseArgs() {
  const rawArgs = process.argv.slice(2);
  const args = Object.fromEntries(
    rawArgs
      .filter((arg) => arg.startsWith("--") && arg.includes("="))
      .map((arg) => {
        const [key, ...valueParts] = arg.slice(2).split("=");
        return [key, valueParts.join("=")];
      })
  );

  return {
    from: args.from,
    to: args.to,
    output: args.output,
    htmlOnly: rawArgs.includes("--html-only"),
  };
}

function assertValidDate(value, name) {
  if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid --${name}. Use YYYY-MM-DD.`);
  }
}

function buildOutputBaseName(report) {
  return `${report.period.from}_${report.period.to}-ranking-semanal-ribbai`;
}

const args = parseArgs();
assertValidDate(args.from, "from");
assertValidDate(args.to, "to");

const report = await buildWeeklyLeaderboardReport(sourceRootDir, {
  from: args.from,
  to: args.to,
});

if (!report.dailyReports.length) {
  throw new Error("No daily operational reports found for the selected period.");
}

await mkdir(outputDir, { recursive: true });

const outputBaseName = args.output
  ? path.basename(args.output, path.extname(args.output))
  : buildOutputBaseName(report);
const htmlPath = path.join(outputDir, `${outputBaseName}.html`);
const pdfPath = args.output ? path.resolve(rootDir, args.output) : path.join(outputDir, `${outputBaseName}.pdf`);
const html = renderWeeklyLeaderboardHtml(report);

await writeFile(htmlPath, html, "utf8");

if (!args.htmlOnly) {
  const browser = await puppeteer.launch({
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(htmlPath).href, {
      waitUntil: "networkidle0",
    });

    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate: `
        <div style="font-family: Arial, sans-serif; font-size: 8px; color: #657085; width: 100%; padding: 0 14mm; display: flex; justify-content: space-between;">
          <span>RIBBAI OPS · Ranking Semanal · ${report.period.label}</span>
          <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
        </div>
      `,
      margin: {
        top: "14mm",
        right: "14mm",
        bottom: "18mm",
        left: "14mm",
      },
    });
  } finally {
    await browser.close();
  }
}

console.warn(`Leaderboard HTML generated: ${htmlPath}`);

if (!args.htmlOnly) {
  console.warn(`Leaderboard PDF generated: ${pdfPath}`);
}
