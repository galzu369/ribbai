import type { FichaBlock } from "./ficha-parser";
import type { MatchResult } from "./matching";
import { normalizeName } from "./matching";

/**
 * Índice e resolução de subreceitas sobre múltiplos workbooks.
 *
 * Papéis dos blocos:
 *  - garnish  (Guarnições) — subreceita clássica;
 *  - side     (Acompanhamentos, bloco 0) — dose vendável E subreceita;
 *  - batch    (bloco ≥1 de folhas duplas) — receita interna por lote;
 *  - menu     — item final; nunca é alvo de subreceita.
 *
 * Regra dose/batch: uma referência vinda de FORA da folha resolve para a dose;
 * uma referência DENTRO da própria folha (ex.: "Arroz (dose)" 0,12 no bloco
 * esquerdo do Arroz) resolve para o batch (custo por kg / por lote).
 */

export type NodeRole = "garnish" | "side" | "batch" | "menu";

export interface SubrecipeEntry {
  dose?: string;
  batch?: string;
  sheetKey: string; // `${workbook}/${sheetName}` para a regra interna
}

export type SubrecipeIndex = Map<string, SubrecipeEntry>;

/** Remove o sufixo "(dose)" usado nas fichas de menu para referir subreceitas. */
export function stripDoseSuffix(name: string): string {
  return name.replace(/\s*\((dose|DOSE|Dose)\)\s*$/u, "").trim();
}

function titleKeys(title: string | null): string[] {
  if (!title) return [];
  const keys = new Set<string>();
  const stripped = title.replace(/\s*\([^)]*\)\s*$/u, "").trim();
  if (stripped) keys.add(normalizeName(stripped));
  const beforeDash = stripped.split(" - ")[0]?.trim();
  if (beforeDash) keys.add(normalizeName(beforeDash));
  return [...keys].filter((k) => k.length > 0);
}

export function buildSubrecipeIndex(
  blocks: FichaBlock[],
  roles: Map<string, NodeRole>,
): SubrecipeIndex {
  const index: SubrecipeIndex = new Map();
  const add = (key: string, block: FichaBlock, kind: "dose" | "batch") => {
    if (!key) return;
    const sheetKey = `${block.workbook}/${block.sheetName}`;
    let entry = index.get(key);
    if (!entry) {
      entry = { sheetKey };
      index.set(key, entry);
    }
    if (entry.sheetKey !== sheetKey) {
      throw new Error(
        `Índice de subreceitas ambíguo: "${key}" aponta a "${entry.sheetKey}" e "${sheetKey}"`,
      );
    }
    const existing = entry[kind];
    if (existing && existing !== block.nodeId) {
      throw new Error(
        `Índice de subreceitas ambíguo: "${key}" (${kind}) -> "${existing}" e "${block.nodeId}"`,
      );
    }
    entry[kind] = block.nodeId;
  };

  for (const block of blocks) {
    const role = roles.get(block.nodeId);
    if (role === "menu") continue;
    const kind: "dose" | "batch" = role === "batch" ? "batch" : "dose";
    add(normalizeName(stripDoseSuffix(block.sheetName)), block, kind);
    for (const key of titleKeys(block.title)) add(key, block, kind);
  }
  return index;
}

/**
 * Resolve um nome de ingrediente para um nodeId de subreceita, ou null.
 * `requesterNode` evita auto-referências (ex.: "Arroz sushi" dentro da folha
 * Arroz Sushi é a matéria-prima, não a guarnição).
 */
export function resolveSubrecipeTarget(
  index: SubrecipeIndex,
  requester: FichaBlock,
  ingredientName: string,
): string | null {
  const key = normalizeName(stripDoseSuffix(ingredientName));
  const entry = index.get(key);
  if (!entry) return null;
  const requesterSheetKey = `${requester.workbook}/${requester.sheetName}`;
  if (entry.sheetKey === requesterSheetKey) {
    // dentro da própria folha: só faz sentido apontar ao batch
    return entry.batch && entry.batch !== requester.nodeId ? entry.batch : null;
  }
  return entry.dose ?? entry.batch ?? null;
}

/**
 * Ordena os nós por dependência (subreceitas primeiro) com deteção de ciclos.
 * matches: nodeId -> MatchResult[] das linhas desse bloco.
 */
export function buildDependencyOrder(
  blocks: FichaBlock[],
  matches: Map<string, MatchResult[]>,
): string[] {
  const deps = new Map<string, string[]>();
  for (const block of blocks) {
    const rowMatches = matches.get(block.nodeId) ?? [];
    deps.set(
      block.nodeId,
      rowMatches
        .filter((m) => m.status === "SUBRECIPE" && m.targetNode)
        .map((m) => m.targetNode as string),
    );
  }

  const order: string[] = [];
  const state = new Map<string, "visiting" | "done">();
  const stack: string[] = [];

  const visit = (node: string): void => {
    const s = state.get(node);
    if (s === "done") return;
    if (s === "visiting") {
      const cycleStart = stack.indexOf(node);
      const cycle = [...stack.slice(cycleStart), node].join(" -> ");
      throw new Error(
        `Referência circular entre subreceitas detetada: ${cycle}. Corrigir as fichas antes de calcular custos.`,
      );
    }
    state.set(node, "visiting");
    stack.push(node);
    for (const dep of deps.get(node) ?? []) visit(dep);
    stack.pop();
    state.set(node, "done");
    order.push(node);
  };

  for (const block of blocks) visit(block.nodeId);
  return order;
}
