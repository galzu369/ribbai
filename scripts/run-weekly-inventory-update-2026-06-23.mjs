import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

import { PrismaClient } from "@prisma/client";

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

const DATE = "2026-06-23";
const WEEK_NUMBER = 26;
const YEAR = 2026;
const REFERENCE_ID = `WEEKLY-COUNT-${DATE}`;

const monthDirectoryNames = [
  "01-january",
  "02-february",
  "03-march",
  "04-april",
  "05-may",
  "06-june",
  "07-july",
  "08-august",
  "09-september",
  "10-october",
  "11-november",
  "12-december",
];

function formatQuantity(value) {
  return Number(value).toLocaleString("pt-PT", {
    maximumFractionDigits: 3,
  });
}

function toMarkdownTable(headers, rows) {
  const headerLine = `| ${headers.join(" | ")} |`;
  const sepLine = `| ${headers.map(() => "---").join(" | ")} |`;
  const rowLines = rows.map((row) => `| ${row.join(" | ")} |`);
  return [headerLine, sepLine, ...rowLines].join("\n");
}

function runCommand(command, args, { cwd } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      shell: process.platform === "win32",
      stdio: "inherit",
      env: process.env,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Command failed (${code}): ${command} ${args.join(" ")}`));
    });
  });
}

async function generateSimpleWeeklySummary(outputDir) {
  const weekly = await prisma.weeklyInventory.findUnique({
    where: {
      weekNumber_year: {
        weekNumber: WEEK_NUMBER,
        year: YEAR,
      },
    },
    include: {
      items: {
        include: {
          item: true,
        },
      },
    },
  });

  if (!weekly) {
    throw new Error("Weekly inventory not found after applying JSON.");
  }

  const rows = weekly.items
    .map((line) => {
      return [
        line.item.subCategory ?? line.item.category,
        line.item.name,
        line.item.sku,
        `${formatQuantity(line.systemQuantity)} ${line.item.unit}`,
        `${formatQuantity(line.actualQuantity)} ${line.item.unit}`,
        `${line.variance.greaterThan(0) ? "+" : ""}${formatQuantity(line.variance)} ${
          line.item.unit
        }`,
      ];
    })
    .sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));

  const content = [
    `# Weekly Inventory Summary - ${DATE}`,
    "",
    "## Resumo",
    "",
    toMarkdownTable(
      ["Indicador", "Valor"],
      [
        ["Semana", `${WEEK_NUMBER}/${YEAR}`],
        ["Itens contados", String(weekly.items.length)],
        ["Valor total", formatQuantity(weekly.totalValue ?? 0)],
        ["Variancia total", formatQuantity(weekly.variance ?? 0)],
        ["Referencia", REFERENCE_ID],
      ]
    ),
    "",
    "## Diferencas por artigo",
    "",
    rows.length === 0
      ? "Sem diferencas registadas nesta contagem."
      : toMarkdownTable(
          ["Categoria", "Artigo", "SKU", "Stock anterior", "Contagem atual", "Diferenca"],
          rows
        ),
    "",
  ].join("\n");

  const filePath = path.join(outputDir, `${DATE}-weekly-inventory-summary.md`);
  await writeFile(filePath, content, "utf8");
  return { filePath };
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");

  const reportDate = new Date(`${DATE}T12:00:00.000Z`);
  const year = reportDate.getUTCFullYear();
  const month = reportDate.getUTCMonth() + 1;
  const outputDir = path.join(
    rootDir,
    "docs",
    "operational-records",
    String(year),
    monthDirectoryNames[month - 1],
    "inventory-updates"
  );
  await mkdir(outputDir, { recursive: true });

  try {
    await runCommand(
      "node",
      [
        "scripts/apply-weekly-inventory-from-json.mjs",
        `--json=docs/operational-records/2026/06-june/inventory-updates/2026-06-23-weekly-count.json`,
        `--date=${DATE}`,
        `--weekNumber=${WEEK_NUMBER}`,
        `--year=${YEAR}`,
        ...(force ? ["--force"] : []),
      ],
      { cwd: rootDir }
    );

    await generateSimpleWeeklySummary(outputDir);

    await runCommand(
      "npm",
      ["run", "reports:inventory:update", "--", `--date=${DATE}`, `--referenceId=${REFERENCE_ID}`],
      { cwd: rootDir }
    );

    await runCommand(
      "npm",
      ["run", "reports:consumables:monthly", "--", "--year=2026", "--month=6", "--preview"],
      { cwd: rootDir }
    );

    console.warn(`Weekly inventory artifacts generated in: ${outputDir}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

