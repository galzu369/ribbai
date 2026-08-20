import { SUM_ROW_LABEL_PREFIX } from "./config";
import { resolveCellText } from "./shared-strings";
import { parseCells, type ParsedCell } from "./xlsx-sheet";
import { colIndex } from "./xml-utils";

export interface RowCell {
  exists: boolean;
  style: string | null;
  t: string | null;
  fRaw: string | null;
  fText: string | null;
  fShared: boolean;
  vRaw: string | null;
  /** true quando a célula contém o texto "-" (linha intencionalmente sem custo). */
  isDash: boolean;
}

export interface FichaRow {
  row: number;
  /** Nome do ingrediente (coluna de nomes do bloco). */
  name: string;
  /** Quantidade ou null se vazia. */
  qty: number | null;
  isNoCost: boolean;
  /** Refs reais das células deste bloco (ex.: D5 ou K5 no bloco I–N). */
  refs: { B: string; C: string; D: string; E: string; F: string; G: string };
  D: RowCell;
  E: RowCell;
  F: RowCell;
  G: RowCell;
}

export interface LabeledValue {
  row: number;
  ref: string;
  cell: RowCell;
}

/** Colunas semânticas B..G mapeadas para as colunas reais do bloco. */
export interface BlockCols {
  B: string;
  C: string;
  D: string;
  E: string;
  F: string;
  G: string;
}

/**
 * Um bloco de ficha técnica. Uma folha pode ter vários blocos lado a lado
 * (Acompanhamentos/Sobremesas: dose + batch; Açaí: grelha 3×3 de combinações).
 */
export interface FichaBlock {
  workbook: string;
  sheetName: string;
  target: string;
  blockIndex: number;
  /** Identidade global: "Workbook/Folha" ou "Workbook/Folha#N" para blocos >0. */
  nodeId: string;
  title: string | null;
  cols: BlockCols;
  headerRow: number;
  rows: FichaRow[];
  sumRow: number;
  sumRef: string;
  sumCell: RowCell;
  vendaC: LabeledValue | null;
  vendaS: LabeledValue | null;
  foodCost: LabeledValue | null;
}

/** Alias legado — o resto do código trata cada bloco como uma "ficha". */
export type Ficha = FichaBlock;

const EMPTY_CELL: RowCell = {
  exists: false,
  style: null,
  t: null,
  fRaw: null,
  fText: null,
  fShared: false,
  vRaw: null,
  isDash: false,
};

function toRowCell(cell: ParsedCell | undefined, strings: string[]): RowCell {
  if (!cell) return EMPTY_CELL;
  const text =
    cell.vRaw !== null ? resolveCellText(cell.t, cell.vRaw, strings) : null;
  return {
    exists: true,
    style: cell.style,
    t: cell.t,
    fRaw: cell.fRaw,
    fText: cell.fText,
    fShared: cell.fShared,
    vRaw: cell.vRaw,
    isDash: (cell.t === "s" || cell.t === "str") && text?.trim() === "-",
  };
}

function nextCol(col: string, offset: number): string {
  let n = colIndex(col) + offset;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

export function parseFichaBlocks(
  workbook: string,
  sheetName: string,
  target: string,
  xml: string,
  strings: string[],
): FichaBlock[] {
  const cells = parseCells(xml);
  const byPos = new Map<string, ParsedCell>();
  for (const cell of cells.values()) byPos.set(`${cell.col}${cell.row}`, cell);

  const textAt = (col: string, row: number): string | null => {
    const cell = byPos.get(`${col}${row}`);
    if (!cell || cell.vRaw === null) return null;
    return resolveCellText(cell.t, cell.vRaw, strings);
  };

  // âncoras: célula "Ingredientes"/"Ingrediente" — uma por bloco
  const anchors: { col: string; row: number }[] = [];
  for (const cell of cells.values()) {
    if (cell.t !== "s" && cell.t !== "str") continue;
    const text = textAt(cell.col, cell.row)?.trim().toLowerCase();
    if (text === "ingredientes" || text === "ingrediente") {
      anchors.push({ col: cell.col, row: cell.row });
    }
  }
  anchors.sort((a, b) => a.row - b.row || colIndex(a.col) - colIndex(b.col));

  const blocks: FichaBlock[] = [];
  for (const anchor of anchors) {
    const cols: BlockCols = {
      B: anchor.col,
      C: nextCol(anchor.col, 1),
      D: nextCol(anchor.col, 2),
      E: nextCol(anchor.col, 3),
      F: nextCol(anchor.col, 4),
      G: nextCol(anchor.col, 5),
    };
    const title = textAt(cols.B, anchor.row - 2)?.trim() ?? null;

    // linhas de ingredientes até à linha "Custo Mercadoria"
    let sumRow = -1;
    const rows: FichaRow[] = [];
    for (let r = anchor.row + 1; r <= anchor.row + 40; r++) {
      const label = textAt(cols.B, r)?.trim();
      if (label && label.toLowerCase().startsWith(SUM_ROW_LABEL_PREFIX)) {
        sumRow = r;
        break;
      }
      if (!label) continue;
      const cCell = byPos.get(`${cols.C}${r}`);
      let qty: number | null = null;
      if (cCell && cCell.vRaw !== null && cCell.t !== "s" && cCell.t !== "str") {
        const n = Number(cCell.vRaw);
        if (Number.isFinite(n)) qty = n;
      }
      const D = toRowCell(byPos.get(`${cols.D}${r}`), strings);
      const E = toRowCell(byPos.get(`${cols.E}${r}`), strings);
      const F = toRowCell(byPos.get(`${cols.F}${r}`), strings);
      const G = toRowCell(byPos.get(`${cols.G}${r}`), strings);
      rows.push({
        row: r,
        name: label,
        qty,
        // "-" em qualquer uma das colunas de preço/custo marca a linha como
        // intencionalmente sem custo (Água, Óleo AR). Nem todos os workbooks
        // usam o traço nas mesmas colunas.
        isNoCost: D.isDash || G.isDash,
        refs: {
          B: `${cols.B}${r}`,
          C: `${cols.C}${r}`,
          D: `${cols.D}${r}`,
          E: `${cols.E}${r}`,
          F: `${cols.F}${r}`,
          G: `${cols.G}${r}`,
        },
        D,
        E,
        F,
        G,
      });
    }
    if (sumRow === -1) {
      throw new Error(
        `${workbook}/${sheetName} (bloco ${cols.B}${anchor.row}): linha "Custo Mercadoria s/Iva" não encontrada`,
      );
    }
    const sumCell = toRowCell(byPos.get(`${cols.G}${sumRow}`), strings);
    if (!sumCell.exists || !sumCell.fRaw) {
      throw new Error(
        `${workbook}/${sheetName}: célula do total ${cols.G}${sumRow} sem fórmula SUM`,
      );
    }

    // linhas rotuladas a seguir ao total
    let vendaC: LabeledValue | null = null;
    let vendaS: LabeledValue | null = null;
    let foodCost: LabeledValue | null = null;
    for (let r = sumRow + 1; r <= sumRow + 5; r++) {
      const label = textAt(cols.B, r)?.trim().toLowerCase() ?? "";
      const lv = (): LabeledValue => ({
        row: r,
        ref: `${cols.G}${r}`,
        cell: toRowCell(byPos.get(`${cols.G}${r}`), strings),
      });
      if (label.startsWith("preço venda c/")) vendaC = lv();
      else if (label.startsWith("preço venda s/")) vendaS = lv();
      else if (label.startsWith("% food cost")) foodCost = lv();
    }

    const blockIndex = blocks.length;
    blocks.push({
      workbook,
      sheetName,
      target,
      blockIndex,
      nodeId:
        blockIndex === 0
          ? `${workbook}/${sheetName}`
          : `${workbook}/${sheetName}#${blockIndex}`,
      title,
      cols,
      headerRow: anchor.row,
      rows,
      sumRow,
      sumRef: `${cols.G}${sumRow}`,
      sumCell,
      vendaC,
      vendaS,
      foodCost,
    });
  }

  if (blocks.length === 0) {
    throw new Error(`${workbook}/${sheetName}: nenhum bloco de ficha encontrado`);
  }
  return blocks;
}

/** Compatibilidade: parse de folha de bloco único (Guarnições, testes). */
export function parseFicha(
  sheetName: string,
  target: string,
  xml: string,
  strings: string[],
): FichaBlock {
  return parseFichaBlocks("Guarnições", sheetName, target, xml, strings)[0];
}
