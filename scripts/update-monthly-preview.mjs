import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawn } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

function parseArgs() {
  const rawArgs = process.argv.slice(2);
  const args = Object.fromEntries(
    rawArgs
      .filter((arg) => arg.startsWith("--") && arg.includes("="))
      .map((arg) => {
        const [key, ...rest] = arg.slice(2).split("=");
        return [key, rest.join("=")];
      })
  );

  const now = new Date();
  const year = Number(args.year ?? now.getFullYear());
  const month = Number(args.month ?? now.getMonth() + 1);

  if (!Number.isInteger(year) || year < 2000) {
    throw new Error("Invalid --year value.");
  }

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("Invalid --month value. Expected a value from 1 to 12.");
  }

  return { year, month };
}

export function updateMonthlyPreview({ year, month }) {
  const monthSlug = String(month).padStart(2, "0");
  console.log(
    `=== RIBBAI · Atualizar preview de relatorio mensal · ${monthSlug}/${year} ===`
  );

  const scriptPath = path.join(
    rootDir,
    "scripts",
    "generate-monthly-consumables-report-pdf.mjs"
  );

  const child = spawn(
    process.execPath,
    [scriptPath, `--year=${year}`, `--month=${month}`, "--preview"],
    {
      cwd: rootDir,
      stdio: "inherit",
    }
  );

  return new Promise((resolve, reject) => {
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(
            `generate-monthly-consumables-report-pdf.mjs (preview) exited with code ${
              code ?? "null"
            }.`
          )
        );
      }
    });
    child.on("error", reject);
  });
}

async function main() {
  const { year, month } = parseArgs();
  await updateMonthlyPreview({ year, month });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error("❌ Erro ao atualizar preview mensal:", error);
    process.exitCode = 1;
  });
}

