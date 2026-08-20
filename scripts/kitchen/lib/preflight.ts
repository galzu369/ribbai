import { closeSync, existsSync, openSync } from "node:fs";
import { basename, dirname, join } from "node:path";

/**
 * Um workbook aberto no Excel não pode ser reescrito: o Excel mantém o
 * ficheiro bloqueado e deixa um ficheiro-sentinela `~$Nome.xlsx` ao lado. Se a
 * sincronização avançasse, uns workbooks ficariam gravados e outros não —
 * exatamente o estado inconsistente que este sistema existe para evitar.
 */
export interface LockedFile {
  path: string;
  reason: "lock-file" | "write-denied";
}

function lockSentinelFor(path: string): string {
  return join(dirname(path), `~$${basename(path)}`);
}

function canOpenForWriting(path: string): boolean {
  try {
    closeSync(openSync(path, "r+"));
    return true;
  } catch {
    return false;
  }
}

export function findLockedWorkbooks(paths: string[]): LockedFile[] {
  const locked: LockedFile[] = [];
  for (const path of paths) {
    if (!existsSync(path)) continue;
    if (existsSync(lockSentinelFor(path))) {
      locked.push({ path, reason: "lock-file" });
    } else if (!canOpenForWriting(path)) {
      locked.push({ path, reason: "write-denied" });
    }
  }
  return locked;
}

export function formatLockedMessage(locked: LockedFile[]): string {
  const lines = [
    "",
    "✗ Não foi possível iniciar a sincronização porque existem ficheiros Excel abertos.",
    "",
    "  Ficheiros bloqueados:",
    ...locked.map(
      (l) =>
        `    ${l.path}${l.reason === "lock-file" ? "  (aberto no Excel)" : "  (sem permissão de escrita)"}`,
    ),
    "",
    "  Feche os ficheiros no Excel e execute novamente.",
    "  Nenhum ficheiro foi alterado.",
    "",
  ];
  return lines.join("\n");
}
