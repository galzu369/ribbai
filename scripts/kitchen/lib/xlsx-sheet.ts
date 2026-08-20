import { decodeXml, encodeXml, refCol, refRow } from "./xml-utils";

/**
 * Edição cirúrgica de xl/worksheets/sheetN.xml por manipulação de string.
 * Regra de ouro: só a célula alvo muda; todos os restantes bytes ficam intactos.
 * Todas as células alvo já existem no template (com estilo) — não há inserção.
 */

export interface ParsedCell {
  ref: string;
  col: string;
  row: number;
  /** Bytes crus dos atributos depois de r="...", ex.: ` s="30" t="s"`. */
  attrs: string;
  style: string | null;
  t: string | null;
  /** Elemento <f> completo (bytes crus) ou null. */
  fRaw: string | null;
  /** Texto da fórmula, descodificado; "" para shared followers <f t="shared" si="n"/>. */
  fText: string | null;
  fShared: boolean;
  /** Conteúdo cru de <v> ou null. */
  vRaw: string | null;
  /** Elemento <c> completo. */
  raw: string;
  start: number;
  end: number;
}

const CELL_RE = /<c r="([A-Z]+\d+)"((?:\s+[a-zA-Z0-9:_-]+="[^"]*")*)\s*(?:\/>|>([\s\S]*?)<\/c>)/g;

function parseCellMatch(m: RegExpMatchArray): ParsedCell {
  const [raw, ref, attrs, inner = ""] = m;
  const style = /\ss="(\d+)"/.exec(attrs)?.[1] ?? null;
  const t = /\st="([^"]+)"/.exec(attrs)?.[1] ?? null;
  const fMatch = /<f(\s[^>]*)?(?:\/>|>([\s\S]*?)<\/f>)/.exec(inner);
  const fRaw = fMatch ? fMatch[0] : null;
  const fAttrs = fMatch?.[1] ?? "";
  const fText = fMatch ? decodeXml(fMatch[2] ?? "") : null;
  const fShared = fMatch ? /\st="shared"/.test(fAttrs) : false;
  const vMatch = /<v>([\s\S]*?)<\/v>/.exec(inner);
  let vRaw = vMatch ? vMatch[1] : null;
  let effectiveT = t;
  if (t === "inlineStr") {
    // <is><t>…</t></is> — expor o texto como string literal (t="str")
    let text = "";
    for (const tm of inner.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)) {
      text += decodeXml(tm[1]);
    }
    vRaw = text;
    effectiveT = "str";
  }
  return {
    ref,
    col: refCol(ref),
    row: refRow(ref),
    attrs,
    style,
    t: effectiveT,
    fRaw,
    fText,
    fShared,
    vRaw,
    raw,
    start: m.index ?? 0,
    end: (m.index ?? 0) + raw.length,
  };
}

export function parseCells(xml: string): Map<string, ParsedCell> {
  const out = new Map<string, ParsedCell>();
  for (const m of xml.matchAll(CELL_RE)) {
    const cell = parseCellMatch(m);
    out.set(cell.ref, cell);
  }
  return out;
}

export function getCell(xml: string, ref: string): ParsedCell | null {
  for (const m of xml.matchAll(CELL_RE)) {
    if (m[1] === ref) return parseCellMatch(m);
  }
  return null;
}

function mustGetCell(xml: string, ref: string): ParsedCell {
  const cell = getCell(xml, ref);
  if (!cell) {
    throw new Error(
      `Célula ${ref} não existe na folha — o template não tem a estrutura esperada`,
    );
  }
  return cell;
}

/** Atributos preservando o estilo mas SEM o atributo t (valor numérico). */
function numericAttrs(cell: ParsedCell): string {
  return cell.style !== null ? ` s="${cell.style}"` : "";
}

function replaceSpan(xml: string, cell: ParsedCell, replacement: string): string {
  return xml.slice(0, cell.start) + replacement + xml.slice(cell.end);
}

/** Substitui a célula por valor numérico simples (remove qualquer fórmula, ex.: link externo stale). */
export function writeValueCell(xml: string, ref: string, valueStr: string): string {
  const cell = mustGetCell(xml, ref);
  return replaceSpan(xml, cell, `<c r="${ref}"${numericAttrs(cell)}><v>${valueStr}</v></c>`);
}

/** Substitui a célula por fórmula + valor em cache (fórmulas novas, planas). */
export function writeFormulaValueCell(
  xml: string,
  ref: string,
  formulaText: string,
  valueStr: string,
): string {
  const cell = mustGetCell(xml, ref);
  return replaceSpan(
    xml,
    cell,
    `<c r="${ref}"${numericAttrs(cell)}><f>${encodeXml(formulaText)}</f><v>${valueStr}</v></c>`,
  );
}

/** Esvazia a célula mantendo o estilo (bordas/formato): <c r=".." s=".."/>. */
export function writeEmptyCell(xml: string, ref: string): string {
  const cell = mustGetCell(xml, ref);
  return replaceSpan(xml, cell, `<c r="${ref}"${numericAttrs(cell)}/>`);
}

/**
 * Atualiza só o <v> em cache preservando os bytes exatos do <f> existente
 * (crítico para shared formulas si=0/si=1: o <f> master e os followers não podem mudar).
 */
export function writeCachedValue(xml: string, ref: string, valueStr: string): string {
  const cell = mustGetCell(xml, ref);
  if (!cell.fRaw) {
    throw new Error(`writeCachedValue: célula ${ref} não tem fórmula — usar writeValueCell`);
  }
  return replaceSpan(
    xml,
    cell,
    `<c r="${ref}"${cell.attrs}>${cell.fRaw}<v>${valueStr}</v></c>`,
  );
}

/** Reescreve o texto de uma fórmula PLANA (não shared) + valor em cache. */
export function rewritePlainFormula(
  xml: string,
  ref: string,
  formulaText: string,
  valueStr: string,
): string {
  const cell = mustGetCell(xml, ref);
  if (cell.fShared) {
    throw new Error(`rewritePlainFormula: célula ${ref} tem fórmula shared — não tocar`);
  }
  return writeFormulaValueCell(xml, ref, formulaText, valueStr);
}

/** Substitui a célula por texto (inline string), preservando o estilo. */
export function writeInlineStringCell(xml: string, ref: string, text: string): string {
  const cell = mustGetCell(xml, ref);
  const attrs = cell.style !== null ? ` s="${cell.style}"` : "";
  return replaceSpan(
    xml,
    cell,
    `<c r="${ref}"${attrs} t="inlineStr"><is><t xml:space="preserve">${encodeXml(text)}</t></is></c>`,
  );
}

/**
 * Reescreve o texto do MASTER de uma shared formula, preservando os atributos
 * do <f> (t="shared" ref=".." si=".."). Os followers derivam do novo texto por
 * offset de linha, por isso corrigir o master corrige o grupo inteiro.
 */
export function rewriteSharedMasterFormula(
  xml: string,
  ref: string,
  formulaText: string,
  valueStr: string,
): string {
  const cell = mustGetCell(xml, ref);
  if (!cell.fShared || !cell.fText) {
    throw new Error(
      `rewriteSharedMasterFormula: célula ${ref} não é master de shared formula`,
    );
  }
  const fAttrs = /<f(\s[^>]*)?(?:\/>|>)/.exec(cell.fRaw as string)?.[1] ?? "";
  return replaceSpan(
    xml,
    cell,
    `<c r="${ref}"${cell.attrs}><f${fAttrs}>${encodeXml(formulaText)}</f><v>${valueStr}</v></c>`,
  );
}
