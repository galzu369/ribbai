import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import {
  buildMonthlyOvertimeReports,
  extractOvertimeEntriesFromFiles,
  findDailyReportFiles,
} from "./lib/overtime-report-parser.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const sourceRootDir = path.join(rootDir, "docs", "operational-records");
const outputDir = path.join(rootDir, "reports", "overtime");

const pageWidth = 595.28;
const pageHeight = 841.89;
const margin = 42;
const contentWidth = pageWidth - margin * 2;
const colors = {
  ink: rgb(0.12, 0.15, 0.2),
  muted: rgb(0.39, 0.44, 0.52),
  border: rgb(0.83, 0.86, 0.9),
  header: rgb(0.08, 0.15, 0.28),
  headerText: rgb(1, 1, 1),
  soft: rgb(0.95, 0.97, 0.99),
  accent: rgb(0.72, 0.17, 0.13),
};

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
  const period = args.period ?? (args.month?.includes("-") ? args.month : undefined);

  if (period && !/^\d{4}-\d{2}$/.test(period)) {
    throw new Error("Invalid period. Use --month=YYYY-MM or --period=YYYY-MM.");
  }

  if (!period && args.year && args.month) {
    const year = Number(args.year);
    const month = Number(args.month);

    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      throw new Error("Invalid --year/--month values.");
    }

    return {
      period: `${year}-${String(month).padStart(2, "0")}`,
    };
  }

  return { period };
}

function safeText(value) {
  return String(value).replace(/\s+/g, " ").trim();
}

function formatGeneratedAt(date = new Date()) {
  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Lisbon",
  }).format(date);
}

function relativePath(filePath) {
  return path.relative(rootDir, filePath).replaceAll(path.sep, "/");
}

function wrapText(text, font, size, maxWidth) {
  const words = safeText(text).split(" ");
  const lines = [];
  let line = "";

  for (const word of words) {
    const nextLine = line ? `${line} ${word}` : word;

    if (font.widthOfTextAtSize(nextLine, size) <= maxWidth) {
      line = nextLine;
      continue;
    }

    if (line) {
      lines.push(line);
    }

    line = word;
  }

  if (line) {
    lines.push(line);
  }

  return lines;
}

function drawText(page, text, x, y, options) {
  page.drawText(safeText(text), {
    x,
    y,
    size: options.size,
    font: options.font,
    color: options.color ?? colors.ink,
  });
}

function createPdfContext(pdfDoc, fonts) {
  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  function addPage() {
    page = pdfDoc.addPage([pageWidth, pageHeight]);
    y = pageHeight - margin;
    return page;
  }

  function ensureSpace(requiredHeight) {
    if (y - requiredHeight < margin) {
      addPage();
    }
  }

  return {
    get page() {
      return page;
    },
    get y() {
      return y;
    },
    set y(value) {
      y = value;
    },
    fonts,
    addPage,
    ensureSpace,
  };
}

function drawDocumentHeader(ctx, report) {
  const { page, fonts } = ctx;

  page.drawRectangle({
    x: 0,
    y: pageHeight - 142,
    width: pageWidth,
    height: 142,
    color: colors.header,
  });
  drawText(page, "RIBBAI OPS", margin, pageHeight - 64, {
    font: fonts.bold,
    size: 12,
    color: colors.headerText,
  });
  drawText(page, "Monthly Overtime Report", margin, pageHeight - 94, {
    font: fonts.bold,
    size: 27,
    color: colors.headerText,
  });
  drawText(page, report.monthLabel, margin, pageHeight - 118, {
    font: fonts.regular,
    size: 13,
    color: rgb(0.86, 0.9, 0.95),
  });
  drawText(page, `Generated ${formatGeneratedAt()}`, pageWidth - margin - 160, pageHeight - 64, {
    font: fonts.regular,
    size: 9,
    color: rgb(0.86, 0.9, 0.95),
  });

  ctx.y = pageHeight - 174;
}

function drawSummaryCards(ctx, report) {
  const { page, fonts } = ctx;
  const cards = [
    ["Team monthly overtime", report.totalHours],
    ["Staff with overtime", String(report.staffCount)],
    ["Daily reports scanned", String(report.filesScanned)],
  ];
  const gap = 12;
  const cardWidth = (contentWidth - gap * 2) / 3;
  const cardHeight = 72;

  cards.forEach(([label, value], index) => {
    const x = margin + index * (cardWidth + gap);

    page.drawRectangle({
      x,
      y: ctx.y - cardHeight,
      width: cardWidth,
      height: cardHeight,
      color: colors.soft,
      borderColor: colors.border,
      borderWidth: 1,
    });
    drawText(page, label, x + 14, ctx.y - 24, {
      font: fonts.regular,
      size: 9,
      color: colors.muted,
    });
    drawText(page, value, x + 14, ctx.y - 52, {
      font: fonts.bold,
      size: 22,
      color: colors.ink,
    });
  });

  ctx.y -= cardHeight + 34;
}

function drawSectionTitle(ctx, title, subtitle) {
  const { page, fonts } = ctx;

  ctx.ensureSpace(48);
  drawText(page, title, margin, ctx.y, {
    font: fonts.bold,
    size: 15,
    color: colors.ink,
  });
  ctx.y -= 16;

  if (subtitle) {
    drawText(page, subtitle, margin, ctx.y, {
      font: fonts.regular,
      size: 9,
      color: colors.muted,
    });
    ctx.y -= 20;
  } else {
    ctx.y -= 10;
  }
}

function drawOvertimeTable(ctx, report) {
  const { page, fonts } = ctx;
  const rowHeight = 28;
  const headerHeight = 38;
  const staffWidth = 132;
  const totalWidth = 70;
  const weekWidth = (contentWidth - staffWidth - totalWidth) / report.weeks.length;

  ctx.ensureSpace(headerHeight + rowHeight * 2);

  page.drawRectangle({
    x: margin,
    y: ctx.y - headerHeight,
    width: contentWidth,
    height: headerHeight,
    color: colors.header,
  });

  drawText(page, "Staff member", margin + 8, ctx.y - 17, {
    font: fonts.bold,
    size: 9,
    color: colors.headerText,
  });

  report.weeks.forEach((week, index) => {
    const x = margin + staffWidth + index * weekWidth;
    drawText(page, week.label, x + 5, ctx.y - 15, {
      font: fonts.bold,
      size: 8,
      color: colors.headerText,
    });
    drawText(page, week.dateRangeLabel, x + 5, ctx.y - 29, {
      font: fonts.regular,
      size: 6.5,
      color: rgb(0.86, 0.9, 0.95),
    });
  });

  drawText(page, "Monthly total", margin + contentWidth - totalWidth + 8, ctx.y - 17, {
    font: fonts.bold,
    size: 8,
    color: colors.headerText,
  });

  ctx.y -= headerHeight;

  report.staffRows.forEach((row, rowIndex) => {
    ctx.ensureSpace(rowHeight + 8);

    const fill = rowIndex % 2 === 0 ? rgb(1, 1, 1) : colors.soft;
    page.drawRectangle({
      x: margin,
      y: ctx.y - rowHeight,
      width: contentWidth,
      height: rowHeight,
      color: fill,
      borderColor: colors.border,
      borderWidth: 0.5,
    });
    drawText(page, row.staffMember, margin + 8, ctx.y - 18, {
      font: fonts.bold,
      size: 9,
      color: colors.ink,
    });

    report.weeks.forEach((week, index) => {
      const x = margin + staffWidth + index * weekWidth;
      drawText(page, row.weeklyHours[week.key], x + 5, ctx.y - 18, {
        font: fonts.regular,
        size: 8.5,
        color: colors.ink,
      });
    });

    drawText(page, row.totalHours, margin + contentWidth - totalWidth + 8, ctx.y - 18, {
      font: fonts.bold,
      size: 9,
      color: colors.accent,
    });

    ctx.y -= rowHeight;
  });

  ctx.y -= 28;
}

function drawEvidenceEntries(ctx, report) {
  const { fonts } = ctx;

  drawSectionTitle(
    ctx,
    "Source Evidence",
    "Each row below shows the sentence used to calculate overtime totals."
  );

  for (const entry of report.entries) {
    const evidenceLines = wrapText(entry.evidence, fonts.regular, 8, contentWidth - 140);
    const sourceLines = wrapText(`${relativePath(entry.sourceFile)}:${entry.sourceLine}`, fonts.regular, 7, contentWidth - 140);
    const blockHeight = 38 + evidenceLines.length * 10 + sourceLines.length * 9;

    ctx.ensureSpace(blockHeight);

    ctx.page.drawRectangle({
      x: margin,
      y: ctx.y - blockHeight,
      width: contentWidth,
      height: blockHeight,
      color: colors.soft,
      borderColor: colors.border,
      borderWidth: 0.5,
    });

    drawText(ctx.page, `${entry.date} · ${entry.staffMember} · ${entry.formattedHours}`, margin + 10, ctx.y - 17, {
      font: fonts.bold,
      size: 9,
      color: colors.ink,
    });

    let textY = ctx.y - 31;
    for (const line of evidenceLines) {
      drawText(ctx.page, line, margin + 10, textY, {
        font: fonts.regular,
        size: 8,
        color: colors.ink,
      });
      textY -= 10;
    }

    for (const line of sourceLines) {
      drawText(ctx.page, line, margin + 10, textY - 2, {
        font: fonts.regular,
        size: 7,
        color: colors.muted,
      });
      textY -= 9;
    }

    ctx.y -= blockHeight + 8;
  }
}

function drawFooter(pdfDoc, fonts, report) {
  const pages = pdfDoc.getPages();

  pages.forEach((page, index) => {
    page.drawLine({
      start: { x: margin, y: 28 },
      end: { x: pageWidth - margin, y: 28 },
      thickness: 0.5,
      color: colors.border,
    });
    drawText(page, `RIBBAI OPS · Monthly Overtime Report · ${report.monthKey}`, margin, 16, {
      font: fonts.regular,
      size: 7,
      color: colors.muted,
    });
    drawText(page, `Page ${index + 1} of ${pages.length}`, pageWidth - margin - 54, 16, {
      font: fonts.regular,
      size: 7,
      color: colors.muted,
    });
  });
}

async function renderReportPdf(report) {
  const pdfDoc = await PDFDocument.create();
  const fonts = {
    regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
    bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
  };
  const ctx = createPdfContext(pdfDoc, fonts);

  drawDocumentHeader(ctx, report);
  drawSummaryCards(ctx, report);
  drawSectionTitle(ctx, "Overtime Totals", "Weekly and monthly totals are displayed in hours.");
  drawOvertimeTable(ctx, report);
  drawEvidenceEntries(ctx, report);
  drawFooter(pdfDoc, fonts, report);

  return pdfDoc.save();
}

async function main() {
  const { period } = parseArgs();
  const files = await findDailyReportFiles(sourceRootDir);
  const entries = await extractOvertimeEntriesFromFiles(files);
  const reports = buildMonthlyOvertimeReports(entries, files.length).filter(
    (report) => !period || report.monthKey === period
  );

  if (reports.length === 0) {
    const periodMessage = period ? ` for ${period}` : "";
    console.log(`No overtime entries found${periodMessage}.`);
    return;
  }

  await mkdir(outputDir, { recursive: true });

  for (const report of reports) {
    const outputPath = path.join(outputDir, `ribbai-overtime-report-${report.monthKey}.pdf`);
    const pdfBytes = await renderReportPdf(report);
    await writeFile(outputPath, pdfBytes);
    console.log(`PDF generated: ${outputPath}`);
  }
}

await main();
