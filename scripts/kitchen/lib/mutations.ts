import type { RecipeYield } from "./config";
import type { FichaBlock } from "./ficha-parser";
import type { BlockComputation } from "./recompute";
import {
  getCell,
  rewritePlainFormula,
  rewriteSharedMasterFormula,
  writeCachedValue,
  writeEmptyCell,
  writeFormulaValueCell,
  writeInlineStringCell,
  writeValueCell,
} from "./xlsx-sheet";
import { formatNumber } from "./xml-utils";

/**
 * Planeamento de mutações célula-a-célula. Uma mutação só é emitida quando o
 * estado atual difere do desejado — é isto que torna o processo idempotente.
 */

export interface CellMutation {
  workbook: string;
  sheet: string;
  part: string;
  ref: string;
  kind:
    | "price"
    | "iva"
    | "iva-clear"
    | "subrecipe-formula"
    | "subrecipe-value"
    | "cached-value"
    | "formula-create"
    | "formula-fix"
    | "yield-label"
    | "yield-value"
    | "yield-unit-cost";
  detail: string;
  apply: (xml: string) => string;
}

export interface MutationPolicy {
  /**
   * true (fichas de menu): preservar a coluna IVA tal como o autor a deixou nas
   * linhas de subreceita; false (Guarnições): limpar IVA de subreceitas.
   */
  preserveSubIva: boolean;
  /** Rendimento declarado para este bloco, quando existe. */
  recipeYield?: RecipeYield;
}

const YIELD_LABEL_PREFIX = "Rendimento";
const UNIT_COST_LABEL = "Custo por dose s/IVA";

function numEq(vRaw: string | null, desired: number): boolean {
  if (vRaw === null) return false;
  const n = Number(vRaw);
  return Number.isFinite(n) && formatNumber(n) === formatNumber(desired);
}

const hasExternalRef = (fText: string | null): boolean =>
  fText !== null && /\[\d+\]/.test(fText);

export function planBlockMutations(
  block: FichaBlock,
  comp: BlockComputation,
  policy: MutationPolicy,
  /** XML atual da folha — necessário só para materializar o rendimento. */
  sheetXml?: string,
): CellMutation[] {
  const muts: CellMutation[] = [];
  const { workbook, sheetName: sheet, target: part, cols } = block;
  const push = (
    ref: string,
    kind: CellMutation["kind"],
    detail: string,
    apply: (xml: string) => string,
  ): void => {
    muts.push({ workbook, sheet, part, ref, kind, detail, apply });
  };

  for (const rc of comp.rows) {
    if (!rc.writes) continue;
    const r = rc.row.row;
    const refs = rc.row.refs;
    const { D, E, F, G } = rc.row;
    const d = rc.d as number;
    const f = rc.f as number;
    const isSub = rc.match.status === "SUBRECIPE";

    // D — Preço s/IVA
    if (isSub && rc.dFormula !== null) {
      const wanted = rc.dFormula;
      if (D.fText !== wanted || !numEq(D.vRaw, d)) {
        push(
          refs.D,
          "subrecipe-formula",
          `${rc.row.name}: ${refs.D} = =${wanted} (${formatNumber(d)})`,
          (xml) => writeFormulaValueCell(xml, refs.D, wanted, formatNumber(d)),
        );
      }
    } else if (D.fRaw !== null || !numEq(D.vRaw, d)) {
      push(
        refs.D,
        isSub ? "subrecipe-value" : "price",
        `${rc.row.name}: ${refs.D} ${D.vRaw ?? "(vazio)"} -> ${formatNumber(d)}${D.fRaw ? " (fórmula substituída)" : ""}${isSub ? " [subreceita noutro workbook — valor gerido por script]" : ""}`,
        (xml) => writeValueCell(xml, refs.D, formatNumber(d)),
      );
    }

    // E — IVA
    if (isSub) {
      if (!policy.preserveSubIva && (E.fRaw !== null || E.vRaw !== null)) {
        push(
          refs.E,
          "iva-clear",
          `${rc.row.name}: ${refs.E} limpo (subreceita não tem IVA próprio)`,
          (xml) => writeEmptyCell(xml, refs.E),
        );
      }
    } else if (rc.e !== null) {
      const e = rc.e;
      if (E.fRaw !== null || !numEq(E.vRaw, e)) {
        push(
          refs.E,
          "iva",
          `${rc.row.name}: ${refs.E} ${E.vRaw ?? "(vazio)"} -> ${formatNumber(e)} (IVA do Preçário)`,
          (xml) => writeValueCell(xml, refs.E, formatNumber(e)),
        );
      }
    }

    // F — Preço c/IVA: preservar fórmula do template; só o cache muda.
    const fExpected = `${cols.D}${r}+(${cols.D}${r}*${cols.E}${r})`;
    if (!F.exists) {
      // sem célula F (colunas truncadas nalgumas linhas) — nada a fazer
    } else if (!F.fRaw) {
      push(refs.F, "formula-create", `${rc.row.name}: ${refs.F} = =${fExpected}`, (xml) =>
        writeFormulaValueCell(xml, refs.F, fExpected, formatNumber(f)),
      );
    } else {
      const m = F.fText
        ? new RegExp(`^${cols.D}(\\d+)\\+\\(${cols.D}(\\d+)\\*${cols.E}(\\d+)\\)$`).exec(
            F.fText,
          )
        : null;
      const wrongRefs =
        (m !== null &&
          (Number(m[1]) !== r || Number(m[2]) !== r || Number(m[3]) !== r)) ||
        hasExternalRef(F.fText);
      if (wrongRefs) {
        push(
          refs.F,
          "formula-fix",
          `${rc.row.name}: ${refs.F} fórmula corrigida "${F.fText}" -> "${fExpected}"`,
          (xml) =>
            F.fShared
              ? rewriteSharedMasterFormula(xml, refs.F, fExpected, formatNumber(f))
              : rewritePlainFormula(xml, refs.F, fExpected, formatNumber(f)),
        );
      } else if (!numEq(F.vRaw, f)) {
        push(refs.F, "cached-value", `${rc.row.name}: ${refs.F} cache -> ${formatNumber(f)}`, (xml) =>
          writeCachedValue(xml, refs.F, formatNumber(f)),
        );
      }
    }

    // G — Custo = C×D
    const gExpected = `${cols.C}${r}*${cols.D}${r}`;
    if (!G.exists) {
      // sem célula G — impossível custear; fica para o relatório
    } else if (!G.fRaw) {
      push(refs.G, "formula-create", `${rc.row.name}: ${refs.G} = =${gExpected}`, (xml) =>
        writeFormulaValueCell(xml, refs.G, gExpected, formatNumber(rc.g)),
      );
    } else {
      const gm = G.fText
        ? new RegExp(
            `^([A-Z]+)(\\d+)\\*([A-Z]+)(\\d+)$`,
          ).exec(G.fText)
        : null;
      const gCols = gm ? [gm[1], gm[3]].sort().join(",") : null;
      const expectedCols = [cols.C, cols.D].sort().join(",");
      const wrongRefs =
        (gm !== null &&
          (gCols !== expectedCols || Number(gm[2]) !== r || Number(gm[4]) !== r)) ||
        hasExternalRef(G.fText);
      if (wrongRefs) {
        push(
          refs.G,
          "formula-fix",
          `${rc.row.name}: ${refs.G} fórmula corrigida "${G.fText}" -> "${gExpected}"`,
          (xml) =>
            G.fShared
              ? rewriteSharedMasterFormula(xml, refs.G, gExpected, formatNumber(rc.g))
              : rewritePlainFormula(xml, refs.G, gExpected, formatNumber(rc.g)),
        );
      } else if (!numEq(G.vRaw, rc.g)) {
        push(refs.G, "cached-value", `${rc.row.name}: ${refs.G} cache -> ${formatNumber(rc.g)}`, (xml) =>
          writeCachedValue(xml, refs.G, formatNumber(rc.g)),
        );
      }
    }
  }

  // Total — Custo Mercadoria s/Iva: corrigir intervalos SUM errados (ex.: SUM(H5:H10))
  const first = block.rows[0]?.row ?? block.headerRow + 1;
  const last = block.rows.length > 0 ? block.rows[block.rows.length - 1].row : block.sumRow - 1;
  const sumExpected = `SUM(${cols.G}${first}:${cols.G}${last})`;
  const sumAltOk = first === last && block.sumCell.fText === `SUM(${cols.G}${first})`;
  const sumOk = block.sumCell.fText === sumExpected || sumAltOk;
  if (!sumOk) {
    push(
      block.sumRef,
      "formula-fix",
      `Custo Mercadoria: ${block.sumRef} fórmula corrigida "${block.sumCell.fText}" -> "${sumExpected}"`,
      (xml) => rewritePlainFormula(xml, block.sumRef, sumExpected, formatNumber(comp.total)),
    );
  } else if (!numEq(block.sumCell.vRaw, comp.total)) {
    push(block.sumRef, "cached-value", `Custo Mercadoria s/Iva: ${block.sumRef} cache -> ${formatNumber(comp.total)}`, (xml) =>
      writeCachedValue(xml, block.sumRef, formatNumber(comp.total)),
    );
  }

  // Rendimento materializado na própria folha (fichas de lote).
  // O custo por dose fica como fórmula que referencia a célula do rendimento,
  // para que alterar o rendimento na folha continue a dar o resultado certo.
  const cells = policy.recipeYield?.sheetCells;
  if (policy.recipeYield && cells && sheetXml !== undefined) {
    const y = policy.recipeYield;
    const currentXml = sheetXml;
    const yieldLabel = `${YIELD_LABEL_PREFIX} (${y.yieldUnit})`;
    const unitFormula = `${block.sumRef}/${cells.yieldValue}`;

    const labelIs = (ref: string, text: string): boolean => {
      const c = getCell(currentXml, ref);
      return c?.t === "str" && c.vRaw === text;
    };

    if (!labelIs(cells.yieldLabel, yieldLabel)) {
      push(
        cells.yieldLabel,
        "yield-label",
        `Rendimento: rótulo em ${cells.yieldLabel} = "${yieldLabel}"`,
        (xml) => writeInlineStringCell(xml, cells.yieldLabel, yieldLabel),
      );
    }
    const yieldCell = getCell(currentXml, cells.yieldValue);
    if (!numEq(yieldCell?.vRaw ?? null, y.yieldQuantity)) {
      push(
        cells.yieldValue,
        "yield-value",
        `Rendimento: ${cells.yieldValue} = ${y.yieldQuantity} ${y.yieldUnit}`,
        (xml) => writeValueCell(xml, cells.yieldValue, formatNumber(y.yieldQuantity)),
      );
    }
    if (!labelIs(cells.unitCostLabel, UNIT_COST_LABEL)) {
      push(
        cells.unitCostLabel,
        "yield-label",
        `Custo por dose: rótulo em ${cells.unitCostLabel}`,
        (xml) => writeInlineStringCell(xml, cells.unitCostLabel, UNIT_COST_LABEL),
      );
    }
    const unitCell = getCell(currentXml, cells.unitCostValue);
    if (unitCell?.fText !== unitFormula || !numEq(unitCell?.vRaw ?? null, comp.portionCost)) {
      push(
        cells.unitCostValue,
        "yield-unit-cost",
        `Custo por dose: ${cells.unitCostValue} = =${unitFormula} (${formatNumber(comp.portionCost)})`,
        (xml) =>
          writeFormulaValueCell(
            xml,
            cells.unitCostValue,
            unitFormula,
            formatNumber(comp.portionCost),
          ),
      );
    }
    // o % food cost da folha passa a usar o custo por dose, não o do lote
    if (block.foodCost) {
      const wanted = `${cells.unitCostValue}/${block.vendaS?.ref ?? ""}`;
      if (block.vendaS && block.foodCost.cell.fText !== wanted) {
        const ref = block.foodCost.ref;
        const value = comp.foodCostRatio ?? 0;
        push(
          ref,
          "formula-fix",
          `% food cost: ${ref} passa a usar o custo por dose (=${wanted})`,
          (xml) => rewritePlainFormula(xml, ref, wanted, formatNumber(value)),
        );
      }
    }
  }

  // Preço Venda s/IVA e % food cost — fórmulas do template, só cache
  if (block.vendaS?.cell.fRaw && comp.vendaS !== null) {
    if (!numEq(block.vendaS.cell.vRaw, comp.vendaS)) {
      const ref = block.vendaS.ref;
      const value = comp.vendaS;
      push(ref, "cached-value", `Preço Venda s/Iva: ${ref} cache -> ${formatNumber(value)}`, (xml) =>
        writeCachedValue(xml, ref, formatNumber(value)),
      );
    }
  }
  if (block.foodCost?.cell.fRaw && comp.foodCostRatio !== null) {
    if (!numEq(block.foodCost.cell.vRaw, comp.foodCostRatio)) {
      const ref = block.foodCost.ref;
      const value = comp.foodCostRatio;
      push(ref, "cached-value", `% food cost: ${ref} cache -> ${formatNumber(value)}`, (xml) =>
        writeCachedValue(xml, ref, formatNumber(value)),
      );
    }
  }

  return muts;
}
