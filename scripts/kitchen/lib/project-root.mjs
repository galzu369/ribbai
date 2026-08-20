import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Versão ESM da deteção de raiz de `project-root.ts`, para os scripts `.mjs`
 * que correm em Node puro (sem tsx). Mesmo marcador, mesmo config.
 */
const ROOT_MARKER = ".ribbai-root";

function ascendToMarker(start) {
  let dir = resolve(start);
  for (;;) {
    if (existsSync(join(dir, ROOT_MARKER))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function findProjectRoot() {
  const here = dirname(fileURLToPath(import.meta.url));
  for (const candidate of [here, process.cwd()]) {
    const found = ascendToMarker(candidate);
    if (found) return found;
  }
  throw new Error(
    `Não foi possível localizar a raiz do projeto: nenhum ficheiro "${ROOT_MARKER}" encontrado.\n` +
      `Copie a pasta RIBBAI completa, sem alterar a estrutura interna.`,
  );
}

export const PROJECT_ROOT = findProjectRoot();

export function fromRoot(relative) {
  if (isAbsolute(relative)) {
    throw new Error(`Caminho absoluto não é permitido na configuração: ${relative}`);
  }
  return join(PROJECT_ROOT, relative);
}

export const KITCHEN_CONFIG = JSON.parse(
  readFileSync(fromRoot("config/kitchen-costing.json"), "utf-8"),
);
