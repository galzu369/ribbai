import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { PrismaClient } from "@prisma/client";
import puppeteer from "puppeteer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const DEFAULT_DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5432/ribbai_ops?schema=public";
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
    },
  },
});

const inventoryCategories = ["Consumiveis", "Produtos de Limpeza"];

const monthConfigs = [
  {
    id: "2026-06",
    label: "Junho 2026",
    dates: ["02/06", "09/06", "16/06", "23/06", "30/06"],
  },
  {
    id: "2026-07",
    label: "Julho 2026",
    dates: ["07/07", "14/07", "21/07", "28/07"],
  },
  {
    id: "2026-08",
    label: "Agosto 2026",
    dates: ["04/08", "11/08", "18/08", "25/08"],
  },
  {
    id: "2026-09",
    label: "Setembro 2026",
    dates: ["01/09", "08/09", "15/09", "22/09", "29/09"],
  },
  {
    id: "2026-10",
    label: "Outubro 2026",
    dates: ["06/10", "13/10", "20/10", "27/10"],
  },
  {
    id: "2026-11",
    label: "Novembro 2026",
    dates: ["03/11", "10/11", "17/11", "24/11"],
  },
  {
    id: "2026-12",
    label: "Dezembro 2026",
    dates: ["01/12", "08/12", "15/12", "22/12", "29/12"],
  },
];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getFamilyLabel(item) {
  const raw = item.subCategory ?? item.category ?? "";
  if (
    raw === "Consumiveis" ||
    raw === "Consumiveis de Servico" ||
    raw === "Consumiveis Operacionais"
  ) {
    return "Consumiveis Operacionais";
  }
  if (raw === "Embalagens" || raw === "Embalagens Take Away") {
    return "Embalagens Take Away";
  }
  return raw || "Outros";
}

function buildHtml(items, css) {
  const groups = new Map();
  for (const item of items) {
    const family = getFamilyLabel(item);
    if (!groups.has(family)) {
      groups.set(family, []);
    }
    groups.get(family).push(item);
  }

  const monthSections = monthConfigs
    .map((month) => {
      const columnCount = 1 + month.dates.length;
      const headerCells = [
        '<th class="item-col">Item</th>',
        ...month.dates.map((d) => `<th>${escapeHtml(d)}</th>`),
      ].join("");

      const bodyRows = [];
      for (const [family, familyItems] of groups) {
        bodyRows.push(
          `<tr class="family-row"><td colspan="${columnCount}">${escapeHtml(family)}</td></tr>`
        );
        for (const item of familyItems) {
          const label = `${item.name} (${item.unit})`;
          const cells = [
            `<td class="item-cell">${escapeHtml(label)}</td>`,
            ...month.dates.map(() => '<td class="count-cell"></td>'),
          ].join("");
          bodyRows.push(`<tr class="item-row">${cells}</tr>`);
        }
      }

      return `
      <section class="month-section sheet">
        <header class="month-header">
          <div class="title-block">
            <div class="brand-mark">
              <span class="brand-monogram">RB</span>
              <span>RIBBAI OPS</span>
            </div>
            <h1>INVENTÁRIO SEMANAL</h1>
            <p class="subtitle">Contagem física de consumíveis e produtos de limpeza às terças-feiras.</p>
            <div class="month-pill">
              <span>Mês</span>
              <span>${escapeHtml(month.label)}</span>
            </div>
          </div>
          <aside class="meta-panel">
            <div class="meta-row">
              <span class="meta-label">Estabelecimento</span>
              <span class="meta-line"></span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Responsável</span>
              <span class="meta-line"></span>
            </div>
            <p class="meta-note">Utilizar esta folha para registar a contagem física de cada terça-feira do mês.</p>
          </aside>
        </header>

        <table class="count-table">
          <thead>
            <tr>
              ${headerCells}
            </tr>
          </thead>
          <tbody>
            ${bodyRows.join("\n")}
          </tbody>
        </table>

        <section class="footer-band">
          <div class="footer-field">
            <label>Assinatura do responsável</label>
            <div class="footer-line"></div>
          </div>
          <div class="footer-field">
            <label>Observações</label>
            <div class="footer-notes"></div>
          </div>
        </section>
      </section>
      `;
    })
    .join("\n");

  return `<!doctype html>
<html lang="pt-PT">
  <head>
    <meta charset="utf-8" />
    <title>Inventário Semanal - Contagem Física (Jun-Dez 2026)</title>
    <style>
${css}
    </style>
  </head>
  <body>
${monthSections}
  </body>
</html>`;
}

async function main() {
  try {
    // Carregar lista canónica de artigos para o inventário semanal
    const configPath = path.join(
      rootDir,
      "config",
      "inventory-weekly-master-list.json"
    );
    const rawConfig = await readFile(configPath, "utf8");
    const config = JSON.parse(rawConfig);

    // Cada entrada canónica gera exatamente uma linha na folha.
    // Itens marcados como alias de outro SKU (aliasOf) não geram linha própria;
    // a contagem física deve ser feita no artigo canónico correspondente.
    const items = config.items
      .filter((entry) => !entry.aliasOf)
      .map((entry) => ({
        name: entry.name,
        unit: entry.unit,
        category: entry.family,
        subCategory: entry.family,
      }));

    const cssPath = path.join(
      rootDir,
      "pdf",
      "styles",
      "weekly-inventory-count-sheet.css"
    );
    const css = await readFile(cssPath, "utf8");

    const html = buildHtml(items, css);

    const outputDir = path.join(
      rootDir,
      "docs",
      "operational-records",
      "2026",
      "inventory-count-sheets"
    );
    await mkdir(outputDir, { recursive: true });

    const filePrefix = "2026-06-12-inventario-semanal-contagem-fisica";
    const htmlPath = path.join(outputDir, `${filePrefix}.html`);
    const pdfPath = path.join(outputDir, `${filePrefix}.pdf`);

    await writeFile(htmlPath, html, "utf8");

    const browser = await puppeteer.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle0" });

      await page.pdf({
        path: pdfPath,
        format: "A4",
        landscape: true,
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: "<div></div>",
        footerTemplate: `
          <div style="font-family: Arial, sans-serif; font-size: 8px; color: #687085; width: 100%; padding: 0 14mm; display: flex; justify-content: space-between;">
            <span>RIBBAI OPS · Inventário Semanal · Jun-Dez 2026</span>
            <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
          </div>
        `,
        margin: {
          top: "12mm",
          right: "12mm",
          bottom: "14mm",
          left: "12mm",
        },
      });
    } finally {
      await browser.close();
    }

    console.warn(`Weekly inventory count sheet generated at: ${pdfPath}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

