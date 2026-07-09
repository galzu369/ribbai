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

function runNodeScript(relativeScriptPath, extraArgs) {
  const scriptPath = path.join(rootDir, relativeScriptPath);
  const child = spawn(process.execPath, [scriptPath, ...extraArgs], {
    cwd: rootDir,
    stdio: "inherit",
  });

  return new Promise((resolve, reject) => {
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(
            `Script ${relativeScriptPath} exited with code ${code ?? "null"}.`
          )
        );
      }
    });
    child.on("error", reject);
  });
}

async function main() {
  const { year, month } = parseArgs();
  const monthSlug = String(month).padStart(2, "0");

  console.log(
    `=== RIBBAI · Fecho mensal de inventario · ${monthSlug}/${year} ===`
  );

  // 1) Gerar relatório mensal oficial (sem --preview).
  await runNodeScript("scripts/generate-monthly-consumables-report-pdf.mjs", [
    `--year=${year}`,
    `--month=${month}`,
  ]);

  // 2) Gerar snapshot de fim de mês a partir do relatório.
  await runNodeScript(
    "scripts/build-month-end-snapshot-from-monthly-report.mjs",
    [`--year=${year}`, `--month=${month}`]
  );

  console.log(
    `✔ Fecho mensal concluido para ${monthSlug}/${year}. Relatorio final e snapshot de fim de mes atualizados.`
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error("❌ Erro ao correr o fecho mensal:", error);
    process.exitCode = 1;
  });
}

