import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { PATHS } from "./config";
import { ENGINE_VERSION, PROJECT_ROOT } from "./project-root";

export interface BackupResult {
  dir: string;
  files: { relativePath: string; sha256: string; bytes: number }[];
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function timestampFolder(now: Date): string {
  const p = (n: number): string => String(n).padStart(2, "0");
  return (
    `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}` +
    `_${p(now.getHours())}-${p(now.getMinutes())}-${p(now.getSeconds())}`
  );
}

/**
 * Copia o Preçário, os workbooks e os mappings para uma pasta datada, com um
 * manifesto de hashes que permite verificar depois que o rollback repõe
 * exatamente os mesmos bytes. Se o backup falhar, a sincronização não avança.
 */
export function createBackup(
  workbookPaths: string[],
  now: Date = new Date(),
): BackupResult {
  const dir = join(PATHS.backupsDir, timestampFolder(now));
  mkdirSync(dir, { recursive: true });

  const sources = [
    PATHS.pricebookXlsx,
    ...workbookPaths,
    PATHS.aliasesJson,
    join(PROJECT_ROOT, "config", "kitchen-costing.json"),
  ].filter((p) => existsSync(p));

  const files: BackupResult["files"] = [];
  for (const source of sources) {
    const bytes = readFileSync(source);
    const relativePath = relative(PROJECT_ROOT, source).replace(/\\/g, "/");
    const target = join(dir, basename(source));
    copyFileSync(source, target);
    files.push({ relativePath, sha256: sha256(bytes), bytes: bytes.length });
  }

  writeFileSync(
    join(dir, "manifest.json"),
    `${JSON.stringify(
      {
        engineVersion: ENGINE_VERSION,
        createdAt: now.toISOString(),
        computerName: process.env.COMPUTERNAME ?? "unknown",
        files,
      },
      null,
      2,
    )}\n`,
    "utf-8",
  );

  return { dir, files };
}
