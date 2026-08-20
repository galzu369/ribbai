import { accessSync, constants, existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PATHS } from "./config";
import { findLockedWorkbooks } from "./preflight";
import { ENGINE_VERSION, KITCHEN_CONFIG, PROJECT_ROOT } from "./project-root";

interface Check {
  label: string;
  result: string;
  ok: boolean;
}

function pad(label: string): string {
  return `${label} ${".".repeat(Math.max(2, 42 - label.length))}`;
}

function check(label: string, fn: () => string | true): Check {
  try {
    const value = fn();
    return { label, result: value === true ? "PASS" : value, ok: true };
  } catch (err: unknown) {
    return { label, result: `FAIL — ${err instanceof Error ? err.message : err}`, ok: false };
  }
}

function mustExist(path: string, what: string): true {
  if (!existsSync(path)) throw new Error(`${what} não encontrado: ${path}`);
  return true;
}

/** Um caminho absoluto em config seria a forma mais fácil de quebrar a portabilidade. */
function configHasNoAbsolutePaths(): true {
  const raw = readFileSync(join(PROJECT_ROOT, "config", "kitchen-costing.json"), "utf-8");
  const offenders = [...raw.matchAll(/"[^"]*(?:[A-Za-z]:[\\/]|\\\\\\\\)[^"]*"/gu)].map((m) => m[0]);
  if (offenders.length > 0) {
    throw new Error(`configuração com caminho absoluto: ${offenders.join(", ")}`);
  }
  return true;
}

export function runInstallCheck(menuItemsDir: string): boolean {
  const checks: Check[] = [];

  checks.push(check("Windows detected", () => (process.platform === "win32" ? true : "AVISO — não é Windows")));
  checks.push(check("Project root detected", () => PROJECT_ROOT));
  checks.push(check("Root marker", () => mustExist(join(PROJECT_ROOT, ".ribbai-root"), "marcador .ribbai-root")));
  checks.push(check("Configuration located", () => mustExist(join(PROJECT_ROOT, "config", "kitchen-costing.json"), "config")));
  checks.push(check("Relative configuration", configHasNoAbsolutePaths));
  checks.push(check("Engine version", () => ENGINE_VERSION));
  checks.push(check("Price list located", () => mustExist(PATHS.pricebookXlsx, "Preçário")));
  checks.push(check("Garnishes workbook located", () => mustExist(PATHS.garnishesXlsx, "workbook de Guarnições")));
  checks.push(check("Technical sheets directory", () => mustExist(menuItemsDir, "pasta de fichas")));

  const workbooks = existsSync(menuItemsDir)
    ? readdirSync(menuItemsDir).filter(
        (f) =>
          f.toLowerCase().endsWith(".xlsx") &&
          !f.startsWith("~$") &&
          /^Fichas Técnicas /u.test(f),
      )
    : [];
  checks.push(check("Technical workbooks found", () => String(workbooks.length + 1)));
  checks.push(check("Mappings located", () => mustExist(PATHS.aliasesJson, "ingredient-aliases.json")));

  checks.push(
    check("Write permissions", () => {
      accessSync(PATHS.pricebookXlsx, constants.W_OK);
      accessSync(menuItemsDir, constants.W_OK);
      return true;
    }),
  );

  const allWorkbooks = [PATHS.pricebookXlsx, PATHS.garnishesXlsx, ...workbooks.map((f) => join(menuItemsDir, f))];
  const locked = findLockedWorkbooks(allWorkbooks);
  checks.push(
    check("Workbook locks", () =>
      locked.length === 0 ? "0" : `${locked.length} aberto(s) no Excel: ${locked.map((l) => l.path).join(", ")}`,
    ),
  );
  if (locked.length > 0) checks[checks.length - 1].ok = false;

  const runtimeDir = join(PROJECT_ROOT, KITCHEN_CONFIG.paths.runtimeDir);
  checks.push(check("Sync engine bundle", () => mustExist(join(runtimeDir, "kitchen-costing-sync.cjs"), "bundle")));
  checks.push(
    check("Portable Node runtime", () =>
      existsSync(join(runtimeDir, "node", "node.exe")) ? true : "AVISO — ausente, usa o Node do sistema",
    ),
  );
  checks.push(check("Sync launcher", () => mustExist(join(PROJECT_ROOT, "ATUALIZAR-FICHAS-TECNICAS.cmd"), "launcher")));

  console.log("=".repeat(60));
  console.log("RIBBAÍ — KITCHEN COSTING INSTALLATION HEALTH CHECK");
  console.log("=".repeat(60));
  console.log("");
  for (const c of checks) console.log(`${pad(c.label)} ${c.result}`);
  console.log("");

  const failed = checks.filter((c) => !c.ok);
  if (failed.length === 0) {
    console.log("Resultado: SISTEMA PRONTO A UTILIZAR.");
    console.log("");
    return true;
  }
  console.log(`Resultado: ${failed.length} verificação(ões) falharam — resolver antes de usar.`);
  console.log("");
  return false;
}
