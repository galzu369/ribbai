import type { FichaBlock, FichaRow } from "./ficha-parser";
import type { MatchResult } from "./matching";
import { quoteSheetName } from "./xml-utils";

/**
 * Cálculo do custo por bloco, em ordem topológica (subreceitas primeiro).
 * Regras: custo SEMPRE s/IVA; G = C×D; total = Σ G; subreceita usa o
 * Custo Mercadoria s/Iva do bloco origem como Preço s/IVA.
 * Referências dentro do mesmo workbook mantêm fórmula Excel real; entre
 * workbooks o valor é gerido por script (sem external links).
 */

export interface RowComputation {
  row: FichaRow;
  match: MatchResult;
  writes: boolean;
  d: number | null;
  /** Fórmula intra-workbook para D (null = valor gerido por script). */
  dFormula: string | null;
  /** IVA desejado em E (null = não escrever/limpar conforme a política). */
  e: number | null;
  f: number | null;
  g: number;
}

export interface BlockComputation {
  nodeId: string;
  rows: RowComputation[];
  /**
   * Custo Mercadoria s/Iva do bloco, tal como a folha o calcula.
   * Para fichas de lote é o custo do LOTE INTEIRO, não de uma dose.
   */
  total: number;
  /** Rendimento declarado (null quando a ficha já é por dose). */
  yieldQuantity: number | null;
  yieldUnit: string | null;
  /**
   * Custo da unidade vendável: total ÷ rendimento quando há rendimento
   * declarado, senão igual a total. É este o custo que entra no menu.
   */
  portionCost: number;
  /** Preço de venda c/IVA (da própria ficha) e derivados, quando existem. */
  vendaC: number | null;
  vendaS: number | null;
  /** Divisor da fórmula "=G/1.13" (taxa 1+IVA de venda) usado na ficha. */
  vendaDivisor: number | null;
  /** Food cost da DOSE (usa portionCost), nunca o custo do lote. */
  foodCostRatio: number | null;
}

export type SheetComputation = BlockComputation;

const WRITE_STATUSES = new Set(["EXACT", "ALIAS", "NORMALIZED", "SUBRECIPE"]);

function existingNumber(vRaw: string | null): number {
  if (vRaw === null) return 0;
  const n = Number(vRaw);
  return Number.isFinite(n) ? n : 0;
}

/** Extrai o divisor de uma fórmula "REF/1.13"; null se não corresponder. */
export function vendaDivisorFromFormula(fText: string | null): number | null {
  if (!fText) return null;
  const m = /^[A-Z]+\d+\/([0-9]+(?:\.[0-9]+)?)$/.exec(fText.trim());
  if (!m) return null;
  const d = Number(m[1]);
  return Number.isFinite(d) && d > 0 ? d : null;
}

export function computeAll(
  blocks: FichaBlock[],
  matches: Map<string, MatchResult[]>,
  order: string[],
  /** nodeId -> rendimento declarado (fichas de lote de bloco único). */
  yields: Map<string, { yieldQuantity: number; yieldUnit: string }> = new Map(),
): Map<string, BlockComputation> {
  const byNode = new Map(blocks.map((b) => [b.nodeId, b]));
  const result = new Map<string, BlockComputation>();

  for (const nodeId of order) {
    const block = byNode.get(nodeId);
    if (!block) throw new Error(`Nó em ordem topológica inexistente: ${nodeId}`);
    const rowMatches = matches.get(nodeId) ?? [];
    if (rowMatches.length !== block.rows.length) {
      throw new Error(
        `${nodeId}: ${block.rows.length} linhas mas ${rowMatches.length} classificações`,
      );
    }

    const rows: RowComputation[] = [];
    let total = 0;
    for (let i = 0; i < block.rows.length; i++) {
      const row = block.rows[i];
      const match = rowMatches[i];
      const writes = WRITE_STATUSES.has(match.status);

      if (!writes) {
        const g = row.G.isDash ? 0 : existingNumber(row.G.vRaw);
        rows.push({ row, match, writes, d: null, dFormula: null, e: null, f: null, g });
        total += g;
        continue;
      }

      let d: number;
      let dFormula: string | null = null;
      let e: number | null = null;
      if (match.status === "SUBRECIPE") {
        const target = byNode.get(match.targetNode as string);
        const source = result.get(match.targetNode as string);
        if (!target || !source) {
          throw new Error(
            `Subreceita "${match.targetNode}" ainda não calculada ao processar "${nodeId}" — ordem topológica inválida`,
          );
        }
        // quem referencia uma ficha de lote quer uma unidade vendável dela
        d = source.portionCost;
        if (target.workbook === block.workbook && source.yieldQuantity === null) {
          dFormula =
            target.sheetName === block.sheetName
              ? target.sumRef
              : `${quoteSheetName(target.sheetName)}!${target.sumRef}`;
        }
      } else {
        const article = match.article;
        if (!article) {
          throw new Error(`${nodeId} linha ${row.row}: match ${match.status} sem artigo`);
        }
        d = article.netPrice;
        e = article.iva;
      }

      const eExisting =
        row.E.vRaw !== null && row.E.t !== "s" && row.E.t !== "str"
          ? Number(row.E.vRaw)
          : null;
      const effectiveE = e ?? (Number.isFinite(eExisting as number) ? (eExisting as number) : 0);
      const f = d + d * (effectiveE ?? 0);
      const g = row.qty !== null ? row.qty * d : 0;
      rows.push({ row, match, writes, d, dFormula, e, f, g });
      total += g;
    }

    const vendaC =
      block.vendaC && block.vendaC.cell.vRaw !== null
        ? Number(block.vendaC.cell.vRaw)
        : null;
    const vendaDivisor = vendaDivisorFromFormula(block.vendaS?.cell.fText ?? null);
    const vendaS =
      vendaC !== null && vendaDivisor !== null ? vendaC / vendaDivisor : null;

    const declared = yields.get(nodeId);
    const yieldQuantity = declared?.yieldQuantity ?? null;
    const portionCost = yieldQuantity !== null ? total / yieldQuantity : total;
    const foodCostRatio = vendaS !== null && vendaS > 0 ? portionCost / vendaS : null;

    result.set(nodeId, {
      nodeId,
      rows,
      total,
      yieldQuantity,
      yieldUnit: declared?.yieldUnit ?? null,
      portionCost,
      vendaC: vendaC !== null && Number.isFinite(vendaC) ? vendaC : null,
      vendaS,
      vendaDivisor,
      foodCostRatio,
    });
  }

  return result;
}
