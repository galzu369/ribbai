import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

function extractYearMonth(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Invalid date format. Expected YYYY-MM-DD, got: ${date}`);
  }
  
  const [year, month] = date.split("-");
  return `${year}-${month}`;
}

function executeCommand(command, description) {
  console.log(`🔄 ${description}...`);
  try {
    const output = execSync(command, { 
      cwd: rootDir, 
      encoding: "utf-8",
      stdio: "pipe"
    });
    console.log(`✅ ${description} completed successfully`);
    if (output.trim()) {
      console.log(`   ${output.trim()}`);
    }
    return true;
  } catch (error) {
    console.error(`❌ ${description} failed:`);
    console.error(`   ${error.message}`);
    if (error.stdout) {
      console.error(`   Output: ${error.stdout.toString().trim()}`);
    }
    return false;
  }
}

async function main() {
  console.log("🚀 RIBBAI OPS - Daily Report Generator with Overtime Update");
  console.log("===========================================================\n");

  const args = parseArgs(process.argv);
  const date = typeof args.date === "string" ? args.date : "2026-07-01";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Invalid --date. Expected YYYY-MM-DD, got: ${date}`);
  }

  const period = extractYearMonth(date);

  console.log(`📅 Processing date: ${date}`);
  console.log(`📊 Period for overtime update: ${period}\n`);

  // Step 1: Generate daily operational report PDF
  const dailyPdfCommand = `node scripts/generate-daily-operational-report-pdf.mjs --date=${date}`;
  const dailySuccess = executeCommand(dailyPdfCommand, "Generating daily operational report PDF");

  if (!dailySuccess) {
    console.error("\n🛑 Failed to generate daily report. Stopping process.");
    process.exit(1);
  }

  console.log(""); // Empty line for readability

  // Step 2: Update monthly overtime report
  const overtimeCommand = `node scripts/generate-monthly-overtime-report-pdf.mjs --period=${period}`;
  const overtimeSuccess = executeCommand(overtimeCommand, `Updating monthly overtime report for ${period}`);

  if (!overtimeSuccess) {
    console.warn("\n⚠️ Failed to update overtime report, but daily report was generated successfully.");
    process.exit(1);
  }

  // Summary
  console.log("\n🎉 Process completed successfully!");
  console.log("📋 Summary:");
  console.log(`   ✅ Daily report PDF generated for ${date}`);
  console.log(`   ✅ Monthly overtime report updated for ${period}`);
  console.log(`   📁 Overtime report: reports/overtime/ribbai-overtime-report-${period}.pdf`);
}

// Handle errors
process.on("uncaughtException", (error) => {
  console.error("\n❌ Unexpected error:", error.message);
  process.exit(1);
});

process.on("unhandledRejection", (error) => {
  console.error("\n❌ Unhandled promise rejection:", error.message);
  process.exit(1);
});

// Run main function
await main();