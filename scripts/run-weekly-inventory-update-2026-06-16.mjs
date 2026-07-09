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

const DATE = "2026-06-16";
const COUNTED_AT = new Date("2026-06-16T12:00:00.000Z");
const REFERENCE_ID = "WEEKLY-COUNT-2026-06-16";
const REFERENCE_TYPE = "WEEKLY_COUNT";

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

function formatDate(date) {
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
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

function getStockStatus(item) {
  const currentStock = Number(item.currentStock);
  const criticalThreshold = Number(item.reorderPoint ?? item.minimumStock ?? 0);

  if (currentStock === 0 || currentStock <= criticalThreshold) {
    return "Critico";
  }

  return "Saudavel";
}

async function generateAlertSummary(outputDir) {
  const monitoredCategories = ["Consumiveis", "Produtos de Limpeza"];
  const items = await prisma.inventoryItem.findMany({
    where: {
      category: {
        in: monitoredCategories,
      },
      status: "ACTIVE",
    },
    orderBy: [{ category: "asc" }, { subCategory: "asc" }, { name: "asc" }],
  });

  const critical = items.filter(
    (item) => Number(item.currentStock) === 0 || Number(item.currentStock) <= Number(item.reorderPoint)
  );

  const rows = critical.map((item) => [
    "Critico",
    item.name,
    item.sku,
    `${formatQuantity(item.currentStock)} ${item.unit}`,
    `${formatQuantity(item.reorderPoint)} ${item.unit}`,
    Number(item.currentStock) === 0
      ? "Reposicao imediata / validar urgencia."
      : "Priorizar reposicao ou validar consumo.",
  ]);

  const content = [
    `# Alert Summary - ${DATE} (Contagem Semanal)`,
    "",
    "## Alertas atuais",
    "",
    rows.length === 0
      ? "Sem alertas de stock baixo ou rutura registados com base no reorder point atual."
      : toMarkdownTable(
          ["Estado", "Artigo", "SKU", "Stock atual", "Limiar critico", "Acao recomendada"],
          rows
        ),
    "",
    "## Nota",
    "",
    `Os limiares sao calculados com base em \`InventoryItem.reorderPoint\`. A lista de \"alertas esperados\" fornecida operacionalmente pode divergir caso os thresholds na BD sejam diferentes.`,
    "",
  ].join("\n");

  const filePath = path.join(outputDir, `${DATE}-weekly-alert-summary.md`);
  await writeFile(filePath, content, "utf8");
  return { filePath, critical, items };
}

async function generateDashboardMetrics(outputDir, items) {
  const statuses = items.reduce(
    (acc, item) => {
      const status = getStockStatus(item);
      acc[status] = (acc[status] ?? 0) + 1;
      return acc;
    },
    { Saudavel: 0, Critico: 0 }
  );

  const categories = new Map();
  for (const item of items) {
    const category = item.subCategory ?? item.category;
    const status = getStockStatus(item);
    const existing = categories.get(category) ?? {
      category,
      items: 0,
      Saudavel: 0,
      Critico: 0,
    };
    existing.items += 1;
    existing[status] += 1;
    categories.set(category, existing);
  }

  const categoryRows = [...categories.values()].sort((a, b) => a.category.localeCompare(b.category));
  const content = [
    `# Dashboard Metrics Refresh - ${DATE} (Contagem Semanal)`,
    "",
    "## Stock Health",
    "",
    toMarkdownTable(
      ["Estado", "Artigos"],
      [
        ["Saudavel", String(statuses.Saudavel ?? 0)],
        ["Critico", String(statuses.Critico ?? 0)],
      ]
    ),
    "",
    "## Categorias monitorizadas",
    "",
    toMarkdownTable(
      ["Categoria", "Artigos", "Saudavel", "Critico"],
      categoryRows.map((row) => [
        row.category,
        String(row.items),
        String(row.Saudavel),
        String(row.Critico),
      ])
    ),
    "",
    "## Nota de gestao",
    "",
    "Contagem semanal oficial registada para reconciliar o stock atual com a contagem fisica. Monitorizar consumos anormais (especialmente Rolos de Cozinha).",
    "",
  ].join("\n");

  const filePath = path.join(outputDir, `${DATE}-weekly-dashboard-metrics-refresh.md`);
  await writeFile(filePath, content, "utf8");
  return { filePath };
}

async function generateWeeklyChangeSummary(outputDir) {
  const weekly = await prisma.weeklyInventory.findUnique({
    where: {
      weekNumber_year: {
        weekNumber: 25,
        year: 2026,
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
    throw new Error("Weekly inventory not found after recording.");
  }

  const items = weekly.items
    .map((line) => ({
      item: line.item,
      systemQuantity: Number(line.systemQuantity),
      actualQuantity: Number(line.actualQuantity),
      variance: Number(line.variance),
      status: getStockStatus(line.item),
    }))
    .sort((a, b) => (a.item.subCategory ?? a.item.category).localeCompare(b.item.subCategory ?? b.item.category));

  const itemsWithVariance = items.filter((row) => row.variance !== 0);
  const inboundEstimated = itemsWithVariance.filter((row) => row.variance > 0).length;
  const outboundEstimated = itemsWithVariance.filter((row) => row.variance < 0).length;

  const priorTransactions = await prisma.inventoryTransaction.findMany({
    where: {
      itemId: {
        in: items.map((row) => row.item.id),
      },
      transactionDate: {
        lt: COUNTED_AT,
      },
    },
    select: {
      itemId: true,
    },
  });
  const existingItemIds = new Set(priorTransactions.map((tx) => tx.itemId));
  const newItems = items.filter((row) => !existingItemIds.has(row.item.id));

  const diffTable = toMarkdownTable(
    ["Categoria", "Artigo", "SKU", "Stock anterior", "Contagem atual", "Diferenca", "Estado"],
    itemsWithVariance.map((row) => [
      row.item.subCategory ?? row.item.category,
      row.item.name,
      row.item.sku,
      `${formatQuantity(row.systemQuantity)} ${row.item.unit}`,
      `${formatQuantity(row.actualQuantity)} ${row.item.unit}`,
      `${row.variance > 0 ? "+" : ""}${formatQuantity(row.variance)} ${row.item.unit}`,
      row.status,
    ])
  );

  const noDiffList = items.filter((row) => row.variance === 0);

  const content = [
    `# Weekly Inventory Change Summary - ${DATE}`,
    "",
    "## Resumo",
    "",
    toMarkdownTable(
      ["Indicador", "Valor"],
      [
        ["Artigos contados", String(items.length)],
        ["Artigos com diferenca", String(itemsWithVariance.length)],
        ["Entradas estimadas", String(inboundEstimated)],
        ["Saidas estimadas", String(outboundEstimated)],
        ["Novos artigos no catalogo", String(newItems.length)],
        ["Referencia", REFERENCE_ID],
      ]
    ),
    "",
    "## Diferencas por artigo",
    "",
    itemsWithVariance.length === 0 ? "Sem diferencas registadas nesta contagem." : diffTable,
    "",
    "## Artigos sem diferenca",
    "",
    noDiffList.length === 0
      ? "Nenhum."
      : noDiffList.map((row) => `- ${row.item.name}: ${formatQuantity(row.actualQuantity)} ${row.item.unit}`).join("\n"),
    "",
    "## Nota operacional",
    "",
    "Foi identificado consumo muito elevado de Rolos de Cozinha nas ultimas semanas. Medidas: sensibilizacao da equipa, utilizacao de toalhas reutilizaveis para secagem das maos, monitorizacao mais rigorosa do consumo semanal.",
    "",
  ].join("\n");

  const filePath = path.join(outputDir, `${DATE}-weekly-inventory-change-summary.md`);
  await writeFile(filePath, content, "utf8");
  return { filePath, weekly, items };
}

async function generateConsumptionTrendAnalysis(outputDir, weeklyItems) {
  const lines = [];

  for (const row of weeklyItems) {
    const itemId = row.item.id;
    const snapshots = await prisma.weeklyInventoryItem.findMany({
      where: {
        itemId,
        countedAt: {
          lte: COUNTED_AT,
        },
      },
      select: {
        countedAt: true,
        actualQuantity: true,
      },
      orderBy: {
        countedAt: "desc",
      },
      take: 4,
    });

    if (snapshots.length < 2) {
      continue;
    }

    const ordered = snapshots
      .filter((s) => s.countedAt)
      .map((s) => ({ date: s.countedAt, qty: Number(s.actualQuantity) }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    if (ordered.length < 2) {
      continue;
    }

    const startDate = ordered[0].date;
    const endDate = ordered[ordered.length - 1].date;
    const transactions = await prisma.inventoryTransaction.findMany({
      where: {
        itemId,
        type: {
          in: ["IN", "OUT"],
        },
        transactionDate: {
          gt: startDate,
          lte: endDate,
        },
      },
      select: {
        type: true,
        quantity: true,
        transactionDate: true,
      },
      orderBy: { transactionDate: "asc" },
    });

    const intervalConsumptions = [];
    for (let i = 1; i < ordered.length; i += 1) {
      const prev = ordered[i - 1];
      const curr = ordered[i];
      const inbound = transactions
        .filter((tx) => tx.type === "IN" && tx.transactionDate > prev.date && tx.transactionDate <= curr.date)
        .reduce((sum, tx) => sum + Number(tx.quantity), 0);
      const outbound = transactions
        .filter((tx) => tx.type === "OUT" && tx.transactionDate > prev.date && tx.transactionDate <= curr.date)
        .reduce((sum, tx) => sum + Number(tx.quantity), 0);
      const consumption = prev.qty + inbound - outbound - curr.qty;
      intervalConsumptions.push({ prev, curr, inbound, outbound, consumption });
    }

    const last = intervalConsumptions[intervalConsumptions.length - 1];
    const prior = intervalConsumptions.slice(0, -1);
    const priorAvg =
      prior.length === 0 ? null : prior.reduce((sum, x) => sum + x.consumption, 0) / prior.length;
    const abnormal =
      priorAvg !== null && priorAvg > 0 ? last.consumption > priorAvg * 1.75 : false;

    lines.push({
      category: row.item.subCategory ?? row.item.category,
      name: row.item.name,
      sku: row.item.sku,
      unit: row.item.unit,
      prevDate: formatDate(last.prev.date),
      currDate: formatDate(last.curr.date),
      opening: last.prev.qty,
      closing: last.curr.qty,
      inbound: last.inbound,
      outbound: last.outbound,
      consumption: last.consumption,
      abnormal: abnormal ? "Sim" : "Nao",
      basis: priorAvg === null ? "Base insuficiente" : `Media historica: ${formatQuantity(priorAvg)} ${row.item.unit}`,
    });
  }

  lines.sort((a, b) => a.category.localeCompare(b.category));

  const content = [
    `# Consumption Trend Analysis - ${DATE} (Contagem Semanal)`,
    "",
    "Consumo estimado desde a contagem anterior por SKU, usando: abertura + entradas (IN) − saidas (OUT) − fecho.",
    "",
    lines.length === 0
      ? "Dados insuficientes (necessarias pelo menos 2 contagens por item)."
      : toMarkdownTable(
          [
            "Categoria",
            "Artigo",
            "SKU",
            "Periodo",
            "Abertura",
            "Fecho",
            "Entradas",
            "Saidas",
            "Consumo",
            "Anormal",
            "Base",
          ],
          lines.map((row) => [
            row.category,
            row.name,
            row.sku,
            `${row.prevDate} → ${row.currDate}`,
            `${formatQuantity(row.opening)} ${row.unit}`,
            `${formatQuantity(row.closing)} ${row.unit}`,
            `${formatQuantity(row.inbound)} ${row.unit}`,
            `${formatQuantity(row.outbound)} ${row.unit}`,
            `${formatQuantity(row.consumption)} ${row.unit}`,
            row.abnormal,
            row.basis,
          ])
        ),
    "",
    "## Observacao operacional",
    "",
    "- Rolos de Cozinha: consumo elevado reportado nas ultimas semanas; manter monitorizacao e medidas de reducao.",
    "",
  ].join("\n");

  const filePath = path.join(outputDir, `${DATE}-weekly-consumption-trend-analysis.md`);
  await writeFile(filePath, content, "utf8");
  return { filePath };
}

async function generatePostUpdateChecklist(outputDir, { critical }) {
  const expectedRuptures = new Set(["CONS-OPS-KITCHEN-ROLLS", "CLEAN-ALCOHOL"]);
  const actualRuptures = new Set(
    critical.filter((item) => Number(item.currentStock) === 0).map((item) => item.sku)
  );
  const missingExpected = [...expectedRuptures].filter((sku) => !actualRuptures.has(sku));

  const content = [
    `# Validacoes - ${DATE} (Contagem Semanal)`,
    "",
    "## 1) Ruturas de stock",
    "",
    critical.filter((item) => Number(item.currentStock) === 0).length === 0
      ? "Nenhuma rutura identificada."
      : critical
          .filter((item) => Number(item.currentStock) === 0)
          .map((item) => `- ${item.name} (${item.sku}) → 0 ${item.unit}`)
          .join("\n"),
    "",
    "## 2) Niveis criticos (por reorder point)",
    "",
    `- Critico: ${critical.length}`,
    "",
    "## 3) Consumos anormais",
    "",
    "Ver `Consumption Trend Analysis` para sinalizacao automatica (quando existe base historica suficiente).",
    "",
    "## 4) Comparacao com contagem anterior",
    "",
    "Ver `Weekly Inventory Change Summary` (diferencas por SKU).",
    "",
    "## 5) Dashboards e relatorios",
    "",
    "- Dashboard Metrics Refresh: gerado em markdown.\n- Inventory Update Report: gerado via script PDF/HTML.\n- Monthly Inventory Report (preview): gerado via script PDF/HTML.",
    "",
    "## Nota sobre alertas esperados",
    "",
    missingExpected.length === 0
      ? "As ruturas esperadas foram identificadas."
      : `As seguintes ruturas eram esperadas mas nao foram detetadas com o estado atual da BD: ${missingExpected.join(
          ", "
        )}. Isto pode ocorrer se algum SKU nao estiver a ser monitorizado ou se o registo nao tiver sido aplicado na BD certa.`,
    "",
  ].join("\n");

  const filePath = path.join(outputDir, `${DATE}-weekly-validations.md`);
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
      "npx",
      [
        "tsx",
        "scripts/database/record-weekly-inventory-count-2026-06-16.ts",
        ...(force ? ["--force"] : []),
      ],
      { cwd: rootDir }
    );

    const alert = await generateAlertSummary(outputDir);
    await generateDashboardMetrics(outputDir, alert.items);
    const summary = await generateWeeklyChangeSummary(outputDir);
    await generateConsumptionTrendAnalysis(outputDir, summary.items);
    await generatePostUpdateChecklist(outputDir, alert);

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

