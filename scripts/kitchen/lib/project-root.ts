import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { z } from "zod";

const ROOT_MARKER = ".ribbai-root";
const CONFIG_RELATIVE = "config/kitchen-costing.json";

function ascendToMarker(start: string): string | null {
  let dir = resolve(start);
  for (;;) {
    if (existsSync(join(dir, ROOT_MARKER))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/**
 * Procura o marcador a partir do ficheiro em execução e só depois do cwd. Esta
 * ordem é o que mantém o sistema portátil: quando o Chefe faz duplo clique no
 * launcher, o cwd pode ser qualquer pasta, mas o binário está sempre dentro da
 * árvore do projeto.
 */
function findProjectRoot(): string {
  const candidates = [
    process.argv[1] ? dirname(resolve(process.argv[1])) : null,
    process.cwd(),
  ].filter((c): c is string => c !== null);

  for (const candidate of candidates) {
    const found = ascendToMarker(candidate);
    if (found) return found;
  }
  throw new Error(
    `Não foi possível localizar a raiz do projeto: nenhum ficheiro "${ROOT_MARKER}" ` +
      `encontrado a partir de ${candidates.join(" nem ")}.\n` +
      `Copie a pasta RIBBAI completa, sem alterar a estrutura interna.`,
  );
}

export const PROJECT_ROOT = findProjectRoot();

export function fromRoot(relative: string): string {
  if (isAbsolute(relative)) {
    throw new Error(`Caminho absoluto não é permitido na configuração: ${relative}`);
  }
  return join(PROJECT_ROOT, relative);
}

const kitchenConfigSchema = z.object({
  version: z.string(),
  engine: z.string().optional(),
  description: z.string().optional(),
  paths: z.object({
    priceList: z.string(),
    garnishesWorkbook: z.string(),
    menuItemsDir: z.string(),
    mappingsDir: z.string(),
    menuDir: z.string(),
    reportsDir: z.string(),
    backupsDir: z.string(),
    logsDir: z.string(),
    archiveDir: z.string(),
    documentationDir: z.string(),
    runtimeDir: z.string(),
  }),
});

export type KitchenConfig = z.infer<typeof kitchenConfigSchema>;

function loadKitchenConfig(): KitchenConfig {
  const path = fromRoot(CONFIG_RELATIVE);
  if (!existsSync(path)) {
    throw new Error(`Configuração em falta: ${CONFIG_RELATIVE} (esperado em ${path})`);
  }
  const raw: unknown = JSON.parse(readFileSync(path, "utf-8"));
  const parsed = kitchenConfigSchema.parse(raw);
  for (const [key, value] of Object.entries(parsed.paths)) {
    if (isAbsolute(value) || /^[A-Za-z]:/u.test(value)) {
      throw new Error(
        `config/kitchen-costing.json: "${key}" tem um caminho absoluto ("${value}"). ` +
          `Todos os caminhos têm de ser relativos à raiz do projeto.`,
      );
    }
  }
  return parsed;
}

export const KITCHEN_CONFIG = loadKitchenConfig();

export const ENGINE_VERSION = KITCHEN_CONFIG.version;
