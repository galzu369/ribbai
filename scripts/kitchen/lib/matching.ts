import type { AliasEntry } from "./config";
import { WEIGHT_VOLUME_UNITS } from "./config";
import type { Article, Pricebook } from "./pricebook";
import type { FichaBlock, FichaRow } from "./ficha-parser";

/**
 * Matching em camadas — SEM fuzzy matching. Prioridade:
 *   NO_COST -> SUBRECIPE -> EXACT -> ALIAS/PENDING -> NORMALIZED (único) -> AMBIGUOUS/UNMATCHED
 * Um alias pode redirecionar para um artigo do Preçário OU para uma subreceita
 * (a resolução do alvo do alias tenta primeiro o índice de subreceitas).
 */

const CONNECTOR_STOPWORDS = new Set(["de", "da", "do", "das", "dos", "em"]);

export function normalizeName(s: string): string {
  const stripped = s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[.,:;!?]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return stripped
    .split(" ")
    .filter((w) => w.length > 0 && !CONNECTOR_STOPWORDS.has(w))
    .join(" ");
}

export type MatchStatus =
  | "NO_COST"
  | "SUBRECIPE"
  | "EXACT"
  | "ALIAS"
  | "PENDING"
  | "NORMALIZED"
  | "AMBIGUOUS"
  | "UNMATCHED";

export type MatchFlag = "UNIT_WARNING" | "MISSING_QTY";

export interface MatchResult {
  status: MatchStatus;
  /** Artigo do Preçário (estados EXACT/ALIAS/NORMALIZED). */
  article?: Article;
  /** nodeId da subreceita (estado SUBRECIPE). */
  targetNode?: string;
  /** Candidatos quando AMBIGUOUS. */
  candidates?: string[];
  flags: MatchFlag[];
  note?: string;
}

export interface MatchContext {
  pricebook: Pricebook;
  /** Resolve nome -> nodeId de subreceita (ou null), com regras dose/batch. */
  resolveSubrecipe: (requester: FichaBlock, name: string) => string | null;
  aliases: AliasEntry[];
}

function findAlias(
  aliases: AliasEntry[],
  ingredientNorm: string,
  sheetName: string,
): AliasEntry | undefined {
  const scoped = aliases.find(
    (a) => a.ficha === sheetName && normalizeName(a.ingredient) === ingredientNorm,
  );
  if (scoped) return scoped;
  return aliases.find(
    (a) => a.ficha === null && normalizeName(a.ingredient) === ingredientNorm,
  );
}

function articleFlags(article: Article, row: FichaRow): MatchFlag[] {
  const flags: MatchFlag[] = [];
  const unit = article.unit?.toLowerCase() ?? "";
  if (!WEIGHT_VOLUME_UNITS.has(unit)) flags.push("UNIT_WARNING");
  if (row.qty === null) flags.push("MISSING_QTY");
  return flags;
}

export function classifyRow(
  row: FichaRow,
  block: FichaBlock,
  ctx: MatchContext,
): MatchResult {
  if (row.isNoCost) return { status: "NO_COST", flags: [] };

  const norm = normalizeName(row.name);
  const qtyFlags: MatchFlag[] = row.qty === null ? ["MISSING_QTY"] : [];

  const targetNode = ctx.resolveSubrecipe(block, row.name);
  if (targetNode) return { status: "SUBRECIPE", targetNode, flags: qtyFlags };

  const exact = ctx.pricebook.exact.get(row.name.trim());
  if (exact) return { status: "EXACT", article: exact, flags: articleFlags(exact, row) };

  const alias = findAlias(ctx.aliases, norm, block.sheetName);
  if (alias) {
    if (!alias.confirmed || alias.article === null) {
      return { status: "PENDING", flags: [], note: alias.note };
    }
    // o alvo do alias pode ser uma subreceita ou um artigo do Preçário
    const aliasSub = ctx.resolveSubrecipe(block, alias.article);
    if (aliasSub) {
      return { status: "SUBRECIPE", targetNode: aliasSub, flags: qtyFlags, note: alias.note };
    }
    const exactTarget = ctx.pricebook.exact.get(alias.article);
    const candidates = exactTarget
      ? [exactTarget]
      : ctx.pricebook.normalized.get(normalizeName(alias.article)) ?? [];
    if (candidates.length !== 1) {
      throw new Error(
        `Alias confirmado "${alias.ingredient}" -> "${alias.article}" não resolve num alvo único (Preçário/subreceitas) — corrigir ingredient-aliases.json`,
      );
    }
    return {
      status: "ALIAS",
      article: candidates[0],
      flags: articleFlags(candidates[0], row),
      note: alias.note,
    };
  }

  const candidates = ctx.pricebook.normalized.get(norm) ?? [];
  if (candidates.length === 1) {
    const article = candidates[0];
    return { status: "NORMALIZED", article, flags: articleFlags(article, row) };
  }
  if (candidates.length > 1) {
    return {
      status: "AMBIGUOUS",
      candidates: candidates.map((c) => c.name),
      flags: [],
    };
  }
  return { status: "UNMATCHED", flags: [] };
}
