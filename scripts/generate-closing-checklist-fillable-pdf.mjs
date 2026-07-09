import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const dataPath = path.join(rootDir, "pdf", "data", "closing-checklist.json");
const outputDir = path.join(rootDir, "docs", "operational-records", "checklists");
const outputPath = path.join(outputDir, "closing-checklist-ribbai-fillable.pdf");

const checklist = JSON.parse(await readFile(dataPath, "utf8"));

const colors = {
  navy: rgb(0.09, 0.13, 0.2),
  muted: rgb(0.41, 0.44, 0.52),
  beige: rgb(0.96, 0.92, 0.86),
  beigeSoft: rgb(0.99, 0.96, 0.92),
  grey: rgb(0.85, 0.87, 0.91),
  white: rgb(1, 1, 1),
};

const pdfDoc = await PDFDocument.create();
const form = pdfDoc.getForm();
const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

const pageSize = [595.28, 841.89];
const margin = 42;
const contentWidth = pageSize[0] - margin * 2;
const bottomLimit = 60;

let page = pdfDoc.addPage(pageSize);
let y = pageSize[1] - margin;
let pageNumber = 1;

function drawText(text, x, textY, options = {}) {
  page.drawText(String(text), {
    x,
    y: textY,
    size: options.size ?? 10,
    font: options.bold ? boldFont : regularFont,
    color: options.color ?? colors.navy,
  });
}

function wrapText(text, maxWidth, size = 11, font = regularFont) {
  const words = String(text).split(" ");
  const lines = [];
  let line = "";

  for (const word of words) {
    const nextLine = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(nextLine, size) <= maxWidth) {
      line = nextLine;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }

  if (line) lines.push(line);
  return lines;
}

function drawWrappedText(text, x, textY, maxWidth, size = 11, lineHeight = 15) {
  const lines = wrapText(text, maxWidth, size);
  lines.forEach((line, index) => drawText(line, x, textY - index * lineHeight, { size }));
  return lines.length * lineHeight;
}

function drawFooter(targetPage, number, total) {
  targetPage.drawLine({
    start: { x: margin, y: 36 },
    end: { x: pageSize[0] - margin, y: 36 },
    thickness: 0.5,
    color: colors.grey,
  });
  targetPage.drawText("RIBBAI OPS · Checklist de Fecho", {
    x: margin,
    y: 22,
    size: 8,
    font: regularFont,
    color: colors.muted,
  });
  targetPage.drawText(`Pagina ${number} de ${total}`, {
    x: pageSize[0] - margin - 70,
    y: 22,
    size: 8,
    font: regularFont,
    color: colors.muted,
  });
}

function drawPageHeader() {
  drawText(checklist.brand, margin, y, {
    size: 9,
    bold: true,
  });
  y -= 20;
  drawText(checklist.title, margin, y, {
    size: 28,
    bold: true,
  });
  y -= 18;
  drawText(checklist.subtitle, margin, y, {
    size: 11,
    color: colors.muted,
  });

  if (pageNumber === 1) {
    page.drawRectangle({
      x: pageSize[0] - margin - 150,
      y: pageSize[1] - margin - 74,
      width: 150,
      height: 74,
      borderColor: colors.grey,
      borderWidth: 1,
      color: colors.beigeSoft,
    });

    addTextField("date", "Data", pageSize[0] - margin - 138, pageSize[1] - margin - 24, 126);
    addTextField("weekday", "Dia", pageSize[0] - margin - 138, pageSize[1] - margin - 46, 126);
    addTextField("shift", "Turno", pageSize[0] - margin - 138, pageSize[1] - margin - 68, 126);
  } else {
    drawText("Continuacao", pageSize[0] - margin - 80, pageSize[1] - margin - 8, {
      size: 10,
      bold: true,
      color: colors.muted,
    });
  }

  y -= 26;
  page.drawLine({
    start: { x: margin, y },
    end: { x: pageSize[0] - margin, y },
    thickness: 1.5,
    color: colors.navy,
  });
  y -= 22;
}

function addPage() {
  page = pdfDoc.addPage(pageSize);
  pageNumber += 1;
  y = pageSize[1] - margin;
  drawPageHeader();
}

function ensureSpace(requiredHeight) {
  if (y - requiredHeight < bottomLimit) {
    addPage();
  }
}

function addTextField(name, label, x, fieldY, width, options = {}) {
  drawText(label, x, fieldY + 5, {
    size: options.labelSize ?? 7.5,
    bold: true,
    color: colors.muted,
  });

  const textField = form.createTextField(name);
  if (options.multiline) {
    textField.enableMultiline();
  }
  textField.addToPage(page, {
    x: x + (options.labelWidth ?? 42),
    y: fieldY,
    width: width - (options.labelWidth ?? 42),
    height: options.height ?? 16,
    textColor: colors.navy,
    borderColor: colors.navy,
    backgroundColor: colors.white,
    borderWidth: 0.75,
  });
  textField.setFontSize(options.fontSize ?? 10);

  return textField;
}

function addCheckBox(name, x, boxY) {
  const checkBox = form.createCheckBox(name);
  checkBox.addToPage(page, {
    x,
    y: boxY,
    width: 16,
    height: 16,
    borderColor: colors.navy,
    backgroundColor: colors.white,
    borderWidth: 1.5,
  });
  return checkBox;
}

function drawSection(section) {
  const taskHeights = section.tasks.map((task) => {
    const lines = wrapText(task.label, contentWidth - 56, 11.5);
    return Math.max(32, lines.length * 15 + 14);
  });
  const sectionHeight = 34 + taskHeights.reduce((total, height) => total + height, 0);

  ensureSpace(sectionHeight + 10);

  page.drawRectangle({
    x: margin,
    y: y - 28,
    width: contentWidth,
    height: 28,
    color: colors.navy,
  });
  drawText(section.title, margin + 42, y - 19, {
    size: 13,
    bold: true,
    color: colors.white,
  });
  page.drawEllipse({
    x: margin + 20,
    y: y - 14,
    xScale: 12,
    yScale: 12,
    color: colors.beige,
  });
  drawText(section.title.slice(0, 1), margin + 16.5, y - 18, {
    size: 10,
    bold: true,
    color: colors.navy,
  });

  y -= 28;

  section.tasks.forEach((task, index) => {
    const rowHeight = taskHeights[index];

    page.drawRectangle({
      x: margin,
      y: y - rowHeight,
      width: contentWidth,
      height: rowHeight,
      borderColor: colors.grey,
      borderWidth: 0.75,
      color: index % 2 === 0 ? colors.white : colors.beigeSoft,
    });

    addCheckBox(task.id, margin + 12, y - 24);
    drawWrappedText(task.label, margin + 40, y - 20, contentWidth - 56, 11.5, 15);
    y -= rowHeight;
  });

  y -= 10;
}

function drawAccountability() {
  ensureSpace(320);

  page.drawRectangle({
    x: margin,
    y: y - 306,
    width: contentWidth,
    height: 306,
    borderColor: colors.navy,
    borderWidth: 1.5,
    color: colors.beigeSoft,
  });

  drawText("Fecho e responsabilidade", margin + 14, y - 26, {
    size: 17,
    bold: true,
  });

  const leftX = margin + 14;
  const rightX = margin + contentWidth / 2 + 6;
  const boxWidth = contentWidth / 2 - 22;
  const topY = y - 58;

  page.drawRectangle({
    x: leftX,
    y: topY - 62,
    width: boxWidth,
    height: 62,
    borderColor: colors.grey,
    borderWidth: 0.75,
    color: colors.white,
  });
  addTextField("closing-start-time", "Inicio", leftX + 10, topY - 24, boxWidth - 20, {
    labelWidth: 42,
  });
  addTextField("closing-end-time", "Fim", leftX + 10, topY - 50, boxWidth - 20, {
    labelWidth: 42,
  });

  page.drawRectangle({
    x: rightX,
    y: topY - 92,
    width: boxWidth,
    height: 92,
    borderColor: colors.grey,
    borderWidth: 0.75,
    color: colors.white,
  });
  drawText("Responsaveis pelo fecho", rightX + 10, topY - 17, {
    size: 8,
    bold: true,
    color: colors.muted,
  });
  [1, 2, 3].forEach((number, index) => {
    addTextField(`responsible-${number}`, `${number}`, rightX + 10, topY - 42 - index * 22, boxWidth - 20, {
      labelWidth: 18,
    });
  });

  const obsY = y - 174;
  page.drawRectangle({
    x: leftX,
    y: obsY - 66,
    width: contentWidth - 28,
    height: 66,
    borderColor: colors.grey,
    borderWidth: 0.75,
    color: colors.white,
  });
  drawText("Observacoes", leftX + 10, obsY - 15, {
    size: 8,
    bold: true,
    color: colors.muted,
  });
  const observations = form.createTextField("observations");
  observations.enableMultiline();
  observations.addToPage(page, {
    x: leftX + 96,
    y: obsY - 58,
    width: contentWidth - 134,
    height: 46,
    textColor: colors.navy,
    borderColor: colors.navy,
    backgroundColor: colors.white,
    borderWidth: 0.75,
  });
  observations.setFontSize(10);

  drawText("Confirmacao final", leftX, y - 260, {
    size: 8,
    bold: true,
    color: colors.muted,
  });

  const confirmationY = y - 284;
  checklist.accountability.finalConfirmations.forEach((confirmation, index) => {
    const rowY = confirmationY - index * 22;
    addCheckBox(confirmation.id, leftX, rowY);
    drawWrappedText(confirmation.label, leftX + 26, rowY + 4, contentWidth - 54, 10.5, 13);
  });

  y -= 320;
}

drawPageHeader();

checklist.sections.forEach(drawSection);
drawAccountability();

const pages = pdfDoc.getPages();
pages.forEach((targetPage, index) => drawFooter(targetPage, index + 1, pages.length));
form.updateFieldAppearances(regularFont);

await mkdir(outputDir, { recursive: true });
await writeFile(outputPath, await pdfDoc.save());

console.warn(`Fillable PDF generated: ${outputPath}`);
