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

const monthDirectoryNames = [
  "01-January",
  "02-February",
  "03-March",
  "04-April",
  "05-May",
  "06-June",
  "07-july",
  "08-August",
  "09-September",
  "10-October",
  "11-November",
  "12-December",
];

function parseArgs() {
  const rawArgs = process.argv.slice(2);
  const args = Object.fromEntries(
    rawArgs
      .filter((arg) => arg.startsWith("--") && arg.includes("="))
      .map((arg) => {
        const [key, value] = arg.slice(2).split("=");
        return [key, value];
      })
  );

  // Validate required arguments
  if (!args.date) {
    throw new Error("--date is required (format: YYYY-MM-DD)");
  }
  
  if (!args.json) {
    throw new Error("--json is required (path to weekly count JSON file)");
  }

  const date = new Date(`${args.date}T12:00:00.000Z`);
  if (isNaN(date.getTime())) {
    throw new Error("Invalid date format. Use YYYY-MM-DD");
  }

  // Calculate week number
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const weekNumber = Math.ceil((date - startOfYear + startOfYear.getDay() * 86400000) / 604800000);

  return {
    date: args.date,
    dateObject: date,
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    weekNumber: Number(args.weekNumber) || weekNumber,
    jsonPath: args.json,
    force: rawArgs.includes("--force"),
    skipSnapshot: rawArgs.includes("--skip-snapshot"),
    skipReports: rawArgs.includes("--skip-reports"),
  };
}

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
  console.log(`🔄 Running: ${command} ${args.join(" ")}`);
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
        console.log(`✅ Completed: ${command} ${args.join(" ")}`);
        resolve();
        return;
      }
      reject(new Error(`Command failed (${code}): ${command} ${args.join(" ")}`));
    });
  });
}

async function generateWeeklySummary(outputDir, referenceId, weekNumber, year) {
  console.log("📝 Generating weekly summary...");
  
  const weekly = await prisma.weeklyInventory.findUnique({
    where: {
      weekNumber_year: {
        weekNumber: weekNumber,
        year: year,
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

  const criticalCount = weekly.items.filter(item => {
    const currentStock = Number(item.actualQuantity);
    const threshold = Number(item.item.reorderPoint ?? item.item.minimumStock ?? 0);
    return currentStock === 0 || currentStock <= threshold;
  }).length;

  const content = [
    `# Weekly Inventory Summary - ${weekly.weekStartDate.toLocaleDateString("pt-PT")}`,
    "",
    "## Resumo da Contagem",
    "",
    toMarkdownTable(
      ["Indicador", "Valor"],
      [
        ["Semana", `${weekNumber}/${year}`],
        ["Data da contagem", weekly.weekEndDate.toLocaleDateString("pt-PT")],
        ["Itens contados", String(weekly.items.length)],
        ["Itens críticos", String(criticalCount)],
        ["Valor total", `€${formatQuantity(weekly.totalValue ?? 0)}`],
        ["Variância total", formatQuantity(weekly.variance ?? 0)],
        ["Referência", referenceId],
      ]
    ),
    "",
    "## Diferenças por artigo",
    "",
    rows.length === 0
      ? "Sem diferenças registadas nesta contagem."
      : toMarkdownTable(
          ["Categoria", "Artigo", "SKU", "Stock anterior", "Contagem atual", "Diferença"],
          rows
        ),
    "",
    "## Próximos passos",
    "",
    "- [x] Aplicação da contagem semanal na base de dados",
    "- [x] Geração do resumo semanal",
    "- [x] Atualização dos relatórios de inventário", 
    "- [x] Geração do snapshot semanal para Gestão",
    "- [ ] Revisão de itens críticos",
    "- [ ] Planeamento de encomendas",
    "",
    `*Documento gerado automaticamente em ${new Date().toLocaleString("pt-PT")}*`,
  ].join("\n");

  const filePath = path.join(outputDir, `${weekly.weekEndDate.toISOString().split('T')[0]}-weekly-inventory-summary.md`);
  await writeFile(filePath, content, "utf8");
  console.log(`📄 Weekly summary saved: ${filePath}`);
  return { filePath };
}

async function main() {
  console.log("🚀 RIBBAI Weekly Inventory Update with Snapshot Generation");
  console.log("=" .repeat(65));
  
  const params = parseArgs();
  const REFERENCE_ID = `WEEKLY-COUNT-${params.date}`;
  
  console.log(`📅 Date: ${params.date}`);
  console.log(`📊 Week: ${params.weekNumber}/${params.year}`);
  console.log(`📁 JSON: ${params.jsonPath}`);
  console.log(`🆔 Reference: ${REFERENCE_ID}`);
  console.log("");

  const outputDir = path.join(
    rootDir,
    "docs",
    "operational-records",
    String(params.year),
    monthDirectoryNames[params.month - 1],
    "inventory-updates"
  );
  await mkdir(outputDir, { recursive: true });

  try {
    // Step 1: Apply weekly inventory from JSON
    console.log("📊 Step 1: Applying weekly inventory count...");
    await runCommand(
      "node",
      [
        "scripts/apply-weekly-inventory-from-json.mjs",
        `--json=${params.jsonPath}`,
        `--date=${params.date}`,
        `--weekNumber=${params.weekNumber}`,
        `--year=${params.year}`,
        ...(params.force ? ["--force"] : []),
      ],
      { cwd: rootDir }
    );

    // Step 2: Generate weekly summary
    console.log("\n📝 Step 2: Generating weekly summary...");
    await generateWeeklySummary(outputDir, REFERENCE_ID, params.weekNumber, params.year);

    // Step 3: Generate weekly snapshot for management (NEW!)
    if (!params.skipSnapshot) {
      console.log("\n📸 Step 3: Generating weekly consumables snapshot...");
      await runCommand(
        "node",
        [
          "scripts/generate-weekly-consumables-snapshot.mjs",
          `--year=${params.year}`,
          `--month=${params.month}`,
          `--date=${params.date}`,
        ],
        { cwd: rootDir }
      );
    } else {
      console.log("\n⏭️  Step 3: Skipping snapshot generation (--skip-snapshot)");
    }

    // Step 4: Update monthly live document (NEW!)
    if (!params.skipSnapshot) {
      console.log("\n📋 Step 4: Updating monthly live document...");
      await runCommand(
        "node",
        [
          "scripts/generate-monthly-consumables-live.mjs",
          `--year=${params.year}`,
          `--month=${params.month}`,
        ],
        { cwd: rootDir }
      );
    }

    // Step 5: Generate standard reports
    if (!params.skipReports) {
      console.log("\n📊 Step 5: Generating inventory update report...");
      await runCommand(
        "npm",
        ["run", "reports:inventory:update", "--", `--date=${params.date}`, `--referenceId=${REFERENCE_ID}`],
        { cwd: rootDir }
      );

      console.log("\n📈 Step 6: Updating monthly consumables preview...");
      await runCommand(
        "npm",
        ["run", "reports:consumables:monthly", "--", `--year=${params.year}`, `--month=${params.month}`, "--preview"],
        { cwd: rootDir }
      );
    } else {
      console.log("\n⏭️  Step 5-6: Skipping standard reports (--skip-reports)");
    }

    console.log("\n" + "=" .repeat(65));
    console.log("✅ WEEKLY INVENTORY UPDATE COMPLETED SUCCESSFULLY");
    console.log("=" .repeat(65));
    console.log(`📁 Artifacts generated in: ${outputDir}`);
    console.log(`📸 Snapshot saved in: ${path.join(rootDir, "docs", "operational-records", String(params.year), monthDirectoryNames[params.month - 1], "Relatorio-Mensal-Consumiveis", "Snapshots-Semanais")}`);
    console.log(`📋 Live document updated in: ${path.join(rootDir, "docs", "operational-records", String(params.year), monthDirectoryNames[params.month - 1], "Relatorio-Mensal-Consumiveis")}`);
    
    console.log("\n🎯 What happened:");
    console.log("  1. ✅ Weekly count applied to database");
    console.log("  2. ✅ Weekly summary document generated");
    if (!params.skipSnapshot) {
      console.log("  3. ✅ Professional snapshot PDF created for Management");
      console.log("  4. ✅ Monthly live document updated with latest data");
    }
    if (!params.skipReports) {
      console.log("  5. ✅ Standard inventory update reports generated");
      console.log("  6. ✅ Monthly consumables preview updated");
    }
    console.log("\n📧 The weekly snapshot is ready to be sent to Management/Administration.");

  } catch (error) {
    console.error("\n💥 Weekly inventory update failed:");
    console.error(error.message);
    console.error("\nPlease check the error above and try again.");
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});