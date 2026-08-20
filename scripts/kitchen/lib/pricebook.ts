import { PRICEBOOK_FIRST_ROW, PRICEBOOK_SHEET_NAME } from "./config";
import { parseSharedStrings, resolveCellText } from "./shared-strings";
import { parseCells, type ParsedCell } from "./xlsx-sheet";
import { listSheets, partText, type Archive } from "./xlsx-zip";
import { normalizeName } from "./matching";

export interface Article {
  row: number;
  zone: string | null;
  name: string;
  unit: string | null;
  /** Preço s/ IVA — SEMPRE o <v> em cache (algumas linhas têm E como fórmula =G/1.06). */
  netPrice: number;
  /** Taxa de IVA (0.06 / 0.13 / 0.23). */
  iva: number;
  supplier: string | null;
}

export interface Pricebook {
  articles: Article[];
  /** Nome exato (trim) -> artigo. */
  exact: Map<string, Article>;
  /** Nome normalizado -> artigos candidatos (>1 = ambíguo). */
  normalized: Map<string, Article[]>;
  warnings: string[];
}

function cellText(cell: ParsedCell | undefined, strings: string[]): string | null {
  if (!cell || cell.vRaw === null) return null;
  return resolveCellText(cell.t, cell.vRaw, strings);
}

function cellNumber(cell: ParsedCell | undefined): number | null {
  if (!cell || cell.vRaw === null || cell.t === "s" || cell.t === "str") return null;
  const n = Number(cell.vRaw);
  return Number.isFinite(n) ? n : null;
}

export function parsePricebook(archive: Archive): Pricebook {
  const sheet = listSheets(archive).find((s) => s.name === PRICEBOOK_SHEET_NAME);
  if (!sheet) {
    throw new Error(`Folha "${PRICEBOOK_SHEET_NAME}" não encontrada no Preçário`);
  }
  const xml = partText(archive, sheet.target);
  const strings = parseSharedStrings(partText(archive, "xl/sharedStrings.xml"));
  const cells = parseCells(xml);

  const byRow = new Map<number, Map<string, ParsedCell>>();
  for (const cell of cells.values()) {
    let row = byRow.get(cell.row);
    if (!row) byRow.set(cell.row, (row = new Map()));
    row.set(cell.col, cell);
  }

  const articles: Article[] = [];
  const warnings: string[] = [];
  for (const [rowNum, row] of [...byRow.entries()].sort((a, b) => a[0] - b[0])) {
    if (rowNum < PRICEBOOK_FIRST_ROW) continue;
    const name = cellText(row.get("C"), strings)?.trim();
    if (!name) continue;
    const netPrice = cellNumber(row.get("E"));
    const iva = cellNumber(row.get("F"));
    if (netPrice === null || iva === null) {
      warnings.push(
        `Preçário linha ${rowNum} ("${name}"): sem Preço s/IVA ou IVA numérico — artigo ignorado`,
      );
      continue;
    }
    articles.push({
      row: rowNum,
      zone: cellText(row.get("B"), strings),
      name,
      unit: cellText(row.get("D"), strings)?.trim() || null,
      netPrice,
      iva,
      supplier: cellText(row.get("H"), strings),
    });
  }

  const exact = new Map<string, Article>();
  const normalized = new Map<string, Article[]>();
  for (const article of articles) {
    if (exact.has(article.name)) {
      warnings.push(
        `Preçário: artigo duplicado "${article.name}" (linhas ${exact.get(article.name)?.row} e ${article.row}) — usada a primeira ocorrência`,
      );
    } else {
      exact.set(article.name, article);
    }
    const key = normalizeName(article.name);
    const list = normalized.get(key);
    if (list) list.push(article);
    else normalized.set(key, [article]);
  }

  return { articles, exact, normalized, warnings };
}
