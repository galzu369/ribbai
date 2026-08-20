import { CELL_TOLERANCE, SUM_TOLERANCE } from "./config";
import type { FichaBlock, RowCell } from "./ficha-parser";
import { vendaDivisorFromFormula } from "./recompute";
import { partText, type Archive } from "./xlsx-zip";

/** Tokens de erro do Excel que nunca podem existir após o processamento. */
const ERROR_TOKEN_RE = /#(REF!|VALUE!|NAME\?|DIV\/0!|N\/A|NUM!|NULL!)/;

export function scanErrorTokens(archive: Archive, label = ""): string[] {
  const problems: string[] = [];
  for (const name of archive.keys()) {
    if (!/^xl\/(worksheets\/.*\.xml|workbook\.xml)$/.test(name)) continue;
    const text = partText(archive, name);
    const m = ERROR_TOKEN_RE.exec(text);
    if (m) problems.push(`${label}${name}: contém ${m[0]}`);
  }
  return problems;
}

export function structuralChecks(archive: Archive, label = ""): string[] {
  const problems: string[] = [];
  for (const name of archive.keys()) {
    if (name === "xl/calcChain.xml") problems.push(`${label}xl/calcChain.xml ainda existe`);
    if (name.startsWith("xl/externalLinks/")) problems.push(`${label}${name} ainda existe`);
  }
  const wb = partText(archive, "xl/workbook.xml");
  if (wb.includes("<externalReferences")) {
    problems.push(`${label}workbook.xml ainda tem <externalReferences>`);
  }
  if (!/fullCalcOnLoad="1"/.test(wb)) {
    problems.push(`${label}workbook.xml sem fullCalcOnLoad="1"`);
  }
  const rels = partText(archive, "xl/_rels/workbook.xml.rels");
  if (/externalLink/.test(rels)) {
    problems.push(`${label}workbook.xml.rels ainda referencia externalLink`);
  }
  const contentTypes = partText(archive, "[Content_Types].xml");
  if (/calcChain|externalLink/.test(contentTypes)) {
    problems.push(`${label}[Content_Types].xml ainda referencia calcChain/externalLink`);
  }
  for (const name of archive.keys()) {
    if (!name.startsWith("xl/worksheets/")) continue;
    const text = partText(archive, name);
    if (/<f[^>]*>[^<]*\[\d+\]/.test(text)) {
      problems.push(`${label}${name}: fórmula com referência externa [n] remanescente`);
    }
  }
  return problems;
}

export interface SubrecipeLinkCheck {
  node: string;
  row: number;
  targetNode: string;
}

const isText = (t: string | null): boolean => t === "s" || t === "str";

function num(cell: RowCell | null | undefined): number | null {
  if (!cell || cell.vRaw === null || isText(cell.t)) return null;
  const n = Number(cell.vRaw);
  return Number.isFinite(n) ? n : null;
}

/**
 * Validação financeira independente sobre os blocos re-parseados dos bytes
 * escritos: F = D+(D×E), G = C×D, total = ΣG, Venda s/IVA = Venda c/IVA ÷ 1,13,
 * % food cost = total ÷ Venda s/IVA, e D de subreceita = total do bloco origem.
 */
export function financialChecks(
  blocks: FichaBlock[],
  subrecipeLinks: SubrecipeLinkCheck[],
  /** nodeId -> rendimento, para validar o food cost das fichas de lote. */
  yields: Map<string, number> = new Map(),
): string[] {
  const problems: string[] = [];
  const byNode = new Map(blocks.map((b) => [b.nodeId, b]));

  for (const block of blocks) {
    let sum = 0;
    for (const row of block.rows) {
      const d = num(row.D);
      const e = num(row.E) ?? 0;
      const fv = num(row.F);
      const g = num(row.G);
      sum += g ?? 0;
      if (d === null) continue;
      if (fv !== null && Math.abs(fv - (d + d * e)) > CELL_TOLERANCE) {
        problems.push(
          `${block.nodeId} ${row.refs.F} ("${row.name}"): ${fv} != D+(D*E) = ${d + d * e}`,
        );
      }
      if (row.qty !== null && g !== null && Math.abs(g - row.qty * d) > CELL_TOLERANCE) {
        problems.push(
          `${block.nodeId} ${row.refs.G} ("${row.name}"): ${g} != C*D = ${row.qty * d}`,
        );
      }
    }
    const total = num(block.sumCell);
    if (total === null || Math.abs(total - sum) > SUM_TOLERANCE) {
      problems.push(`${block.nodeId} ${block.sumRef}: total ${total} != soma ${sum}`);
    }

    const vendaC = num(block.vendaC?.cell);
    const divisor = vendaDivisorFromFormula(block.vendaS?.cell.fText ?? null);
    const vendaS = num(block.vendaS?.cell);
    if (vendaC !== null && divisor !== null && vendaS !== null) {
      if (Math.abs(vendaS - vendaC / divisor) > CELL_TOLERANCE) {
        problems.push(
          `${block.nodeId} ${block.vendaS?.ref}: Venda s/IVA ${vendaS} != ${vendaC}/${divisor}`,
        );
      }
      // numerador do food cost: custo por dose nas fichas de lote, senão o total
      const yieldQty = yields.get(block.nodeId);
      const numerator =
        total !== null && yieldQty !== undefined ? total / yieldQty : total;
      const fc = num(block.foodCost?.cell);
      if (fc !== null && numerator !== null && Number.isFinite(numerator) && vendaS > 0) {
        if (Math.abs(fc - numerator / vendaS) > CELL_TOLERANCE) {
          problems.push(
            `${block.nodeId} ${block.foodCost?.ref}: food cost ${fc} != ${numerator}/${vendaS}`,
          );
        }
      }
    }
  }

  for (const link of subrecipeLinks) {
    const block = byNode.get(link.node);
    const target = byNode.get(link.targetNode);
    if (!block || !target) {
      problems.push(`Link de subreceita inválido: ${link.node} -> ${link.targetNode}`);
      continue;
    }
    const row = block.rows.find((r) => r.row === link.row);
    const d = row ? Number(row.D.vRaw) : NaN;
    const targetYield = yields.get(link.targetNode);
    const targetTotal = Number(target.sumCell.vRaw);
    // quem consome uma ficha de lote paga o custo da unidade vendável
    const expected =
      targetYield !== undefined ? targetTotal / targetYield : targetTotal;
    if (!Number.isFinite(d) || !Number.isFinite(expected) || Math.abs(d - expected) > 1e-9) {
      problems.push(
        `${link.node} linha ${link.row}: D=${d} != custo unitário de "${link.targetNode}" (${expected})`,
      );
    }
  }

  return problems;
}
