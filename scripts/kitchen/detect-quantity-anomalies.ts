import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { loadMenu, loadMenuAliases, loadRecipeYields, PATHS } from "./lib/config";
import {
  buildUsedInMap,
  computeAllergenProfiles,
  loadAllergenMap,
} from "./lib/allergens";
import { analyseMenu } from "./lib/menu-analysis";
import { loadAllWorkbookBytes, runPipeline } from "./update-costing";

/**
 * Deteção de possíveis erros de escala/unidade nas quantidades das fichas.
 *
 * NÃO corrige nada — produz apenas uma lista para revisão humana. As heurísticas
 * são deliberadamente conservadoras e cada alerta indica a evidência que o gerou.
 */

const REPORT_PATH = join(PATHS.reportsDir, "quantity-anomalies.md");

type Confidence = "alta" | "média" | "baixa";

interface Anomaly {
  node: string;
  ingredient: string;
  ref: string;
  qty: number;
  reason: string;
  confidence: Confidence;
  lineCost: number;
}

const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
};

const eur = (n: number): string => `${n.toFixed(2).replace(".", ",")} €`;
const qtyFmt = (n: number): string =>
  n.toLocaleString("pt-PT", { maximumFractionDigits: 4 });

function main(): void {
  const p = runPipeline(loadAllWorkbookBytes());
  const declaredYields = loadRecipeYields();
  const profiles = computeAllergenProfiles(
    p.blocks,
    p.matches,
    p.order,
    loadAllergenMap(),
  );
  const { salesVatRate, items: menuItems } = loadMenu();
  const analysis = analyseMenu({
    blocks: p.blocks,
    roles: p.roles,
    comps: p.comps,
    matches: p.matches,
    allergenProfiles: profiles,
    usedIn: buildUsedInMap(p.blocks, p.matches),
    menu: menuItems,
    menuAliases: loadMenuAliases(),
    salesVatRate,
  });

  // preço de venda s/IVA por nó (via item de menu)
  const priceByNode = new Map<string, number>();
  for (const item of analysis.items) {
    if (item.priceSIva === null) continue;
    for (const n of item.nodes) priceByNode.set(n, item.priceSIva);
  }

  /**
   * Comparar quantidades só dentro da mesma classe de base: uma guarnição de
   * 1 kg ou um lote de 15 doses usa naturalmente muito mais de cada ingrediente
   * do que uma dose individual. Misturar as duas classes produziria falsos
   * positivos em quase todas as receitas-mãe.
   */
  const baseClass = (nodeId: string): "recipe" | "portion" => {
    const role = p.roles.get(nodeId);
    return role === "garnish" || role === "batch" ? "recipe" : "portion";
  };

  /**
   * Quantidade comparável: numa ficha de lote com rendimento declarado, a
   * quantidade por dose é qty ÷ rendimento. Sem esta normalização, um lote de
   * 50 doses apareceria sempre como anomalia face às fichas de dose.
   */
  const perPortionQty = (nodeId: string, qty: number): number => {
    const y = declaredYields.get(nodeId);
    return y ? qty / y.yieldQuantity : qty;
  };

  const qtyByArticle = new Map<string, { node: string; qty: number }[]>();
  for (const block of p.blocks) {
    const matches = p.matches.get(block.nodeId) ?? [];
    block.rows.forEach((row, i) => {
      const article = matches[i]?.article?.name;
      if (!article || row.qty === null || row.qty <= 0) return;
      const key = `${baseClass(block.nodeId)}|${article}`;
      const qty = perPortionQty(block.nodeId, row.qty);
      const list = qtyByArticle.get(key);
      if (list) list.push({ node: block.nodeId, qty });
      else qtyByArticle.set(key, [{ node: block.nodeId, qty }]);
    });
  }

  const anomalies: Anomaly[] = [];
  const seen = new Set<string>();
  const push = (a: Anomaly): void => {
    const key = `${a.node}|${a.ref}`;
    if (seen.has(key)) return;
    seen.add(key);
    anomalies.push(a);
  };

  for (const block of p.blocks) {
    const comp = p.comps.get(block.nodeId);
    const matches = p.matches.get(block.nodeId) ?? [];
    if (!comp) continue;
    const priceS = priceByNode.get(block.nodeId) ?? null;

    comp.rows.forEach((rc, i) => {
      const row = rc.row;
      const article = matches[i]?.article?.name;
      if (row.qty === null || row.qty <= 0 || !rc.writes) return;

      // 1) quantidade muito acima da mediana das outras utilizações do mesmo artigo
      if (article) {
        const cls = baseClass(block.nodeId);
        const others = (qtyByArticle.get(`${cls}|${article}`) ?? []).filter(
          (x) => x.node !== block.nodeId,
        );
        if (others.length >= 2) {
          const med = median(others.map((x) => x.qty));
          const comparableQty = perPortionQty(block.nodeId, row.qty);
          if (med > 0 && comparableQty / med >= 5) {
            const ratio = comparableQty / med;
            const clsLabel = cls === "recipe" ? "receitas-mãe" : "doses";
            push({
              node: block.nodeId,
              ingredient: row.name,
              ref: row.refs.C,
              qty: row.qty,
              lineCost: rc.g,
              reason: `${qtyFmt(comparableQty)}${comparableQty !== row.qty ? ` por dose (${qtyFmt(row.qty)} ÷ rendimento)` : ""} é ${ratio.toFixed(0)}× a mediana deste artigo noutras ${others.length} ${clsLabel} (${qtyFmt(med)})`,
              confidence: ratio >= 20 ? "alta" : ratio >= 10 ? "média" : "baixa",
            });
          }
        }
      }

      // 2) linha que domina o custo do prato e pesa muito no preço de venda
      if (priceS !== null && comp.total > 0) {
        const shareOfDish = rc.g / comp.total;
        const shareOfPrice = rc.g / priceS;
        if (shareOfDish >= 0.5 && shareOfPrice >= 0.3) {
          push({
            node: block.nodeId,
            ingredient: row.name,
            ref: row.refs.C,
            qty: row.qty,
            lineCost: rc.g,
            reason: `linha representa ${(shareOfDish * 100).toFixed(0)}% do custo do prato e ${(shareOfPrice * 100).toFixed(0)}% do preço de venda s/IVA`,
            confidence: shareOfPrice >= 0.5 ? "alta" : "média",
          });
        }
      }
    });
  }

  // itens de menu com food cost implausível (sinal ao nível da ficha inteira)
  const highFcItems = analysis.items.filter(
    (i) => i.foodCostPct !== null && i.foodCostPct > 0.5,
  );

  /**
   * Possíveis fichas de LOTE a serem custeadas como dose. Sinais: linhas com
   * ≥1 kg/L de um artigo vendido a peso (uma dose raramente leva um quilo),
   * food cost muito alto, ou título a indicar um lote. Fichas com rendimento
   * já declarado são excluídas — essas já estão resolvidas.
   */
  interface BatchIssue {
    node: string;
    menuItem: string | null;
    batchCost: number;
    heavyLines: { name: string; qty: number; unit: string }[];
    foodCostPct: number | null;
    reasons: string[];
    confidence: Confidence;
  }
  const batchIssues: BatchIssue[] = [];
  for (const block of p.blocks) {
    const role = p.roles.get(block.nodeId);
    if (role !== "menu" && role !== "side") continue;
    if (declaredYields.has(block.nodeId)) continue; // já tem rendimento
    const comp = p.comps.get(block.nodeId);
    const matches = p.matches.get(block.nodeId) ?? [];
    if (!comp) continue;

    const heavyLines: BatchIssue["heavyLines"] = [];
    block.rows.forEach((row, i) => {
      const article = matches[i]?.article;
      if (!article || row.qty === null) return;
      const unit = (article.unit ?? "").toLowerCase();
      if (!["kg", "l", "lt"].includes(unit)) return; // contagens à unidade são normais
      if (row.qty >= 1) {
        heavyLines.push({ name: row.name, qty: row.qty, unit: article.unit ?? "" });
      }
    });

    const item = analysis.items.find((x) => x.nodes.includes(block.nodeId));
    const fc = item?.foodCostPct ?? null;
    const titleSuggestsBatch = /\b\d+\s*(KG|L|DOSES?|UNIDADES?)\b/i.test(
      block.title ?? "",
    );

    const reasons: string[] = [];
    if (heavyLines.length > 0) {
      reasons.push(
        `${heavyLines.length} ${heavyLines.length === 1 ? "linha" : "linhas"} com ≥1 ${heavyLines[0].unit} de um artigo vendido a peso (${heavyLines.map((h) => `${h.name} ${qtyFmt(h.qty)}`).join(", ")})`,
      );
    }
    if (fc !== null && fc > 0.5) {
      reasons.push(`food cost ${(fc * 100).toFixed(0)}% — custo perto ou acima do preço`);
    }
    if (titleSuggestsBatch) {
      reasons.push(`título da ficha sugere um lote ("${block.title}")`);
    }
    if (reasons.length === 0) continue;

    batchIssues.push({
      node: block.nodeId,
      menuItem: item?.name ?? null,
      batchCost: comp.total,
      heavyLines,
      foodCostPct: fc,
      reasons,
      confidence:
        reasons.length >= 2 ? "alta" : heavyLines.length >= 2 ? "média" : "baixa",
    });
  }
  batchIssues.sort(
    (a, b) =>
      ({ alta: 0, média: 1, baixa: 2 })[a.confidence] -
        ({ alta: 0, média: 1, baixa: 2 })[b.confidence] || b.batchCost - a.batchCost,
  );

  anomalies.sort(
    (a, b) =>
      ({ alta: 0, média: 1, baixa: 2 })[a.confidence] -
        ({ alta: 0, média: 1, baixa: 2 })[b.confidence] || b.lineCost - a.lineCost,
  );

  // ------------------------------------------------------------- relatório
  const lines: string[] = [];
  const today = new Date().toISOString().slice(0, 10);
  lines.push(`# Potential quantity / unit anomalies`);
  lines.push("");
  lines.push(`Gerado em ${today} por \`npm run kitchen:anomalies\`.`);
  lines.push("");
  lines.push(
    `**Nada nesta lista foi corrigido.** São sinais para revisão humana: uma quantidade fora de escala relativamente a outras fichas, ou uma linha que domina o custo de um prato. Um alerta não é prova de erro — algumas quantidades elevadas são legítimas (ex.: o ingrediente principal de um prato).`,
  );
  lines.push("");
  lines.push(`## Potential batch / yield costing issues`);
  lines.push("");
  lines.push(
    `Fichas de item de menu que podem representar um **lote** e estar a ser custeadas como uma dose. Resolve-se declarando o rendimento em \`mappings/recipe-yields.json\` (como já foi feito para a Sopa), não alterando quantidades.`,
  );
  lines.push("");
  if (batchIssues.length === 0) {
    lines.push(`Nenhuma ficha sinalizada.`);
  } else {
    lines.push(`| Ficha | Item de menu | Batch cost | Food cost | Razão | Confiança |`);
    lines.push(`| --- | --- | ---: | ---: | --- | --- |`);
    for (const b of batchIssues) {
      lines.push(
        `| \`${b.node}\` | ${b.menuItem ?? "—"} | ${eur(b.batchCost)} | ${b.foodCostPct === null ? "—" : `${(b.foodCostPct * 100).toFixed(1)}%`} | ${b.reasons.join("; ")} | ${b.confidence} |`,
      );
    }
  }
  lines.push("");
  lines.push(
    `Fichas com rendimento já declarado (excluídas desta lista): ${[...declaredYields.keys()].map((k) => `\`${k}\``).join(", ") || "nenhuma"}.`,
  );
  lines.push("");
  lines.push(`## Fichas com food cost implausível (> 50%)`);
  lines.push("");
  if (highFcItems.length === 0) {
    lines.push(`Nenhuma.`);
  } else {
    lines.push(`| Item | Categoria | Custo | Venda s/IVA | Food Cost |`);
    lines.push(`| --- | --- | ---: | ---: | ---: |`);
    for (const i of highFcItems) {
      lines.push(
        `| ${i.name} | ${i.category} | ${eur(i.cost as number)} | ${eur(i.priceSIva as number)} | ${((i.foodCostPct as number) * 100).toFixed(1)}% |`,
      );
    }
  }
  lines.push("");
  // detalhe completo dessas fichas — é aqui que se vê se a escala está coerente
  for (const item of highFcItems) {
    for (const nodeId of item.nodes) {
      const block = p.blocks.find((b) => b.nodeId === nodeId);
      const comp = p.comps.get(nodeId);
      if (!block || !comp) continue;
      lines.push(`### Detalhe — ${item.name} (\`${nodeId}\`)`);
      lines.push("");
      lines.push(`| Ingrediente | Célula | Quantidade | Preço s/IVA | Custo | % do custo |`);
      lines.push(`| --- | --- | ---: | ---: | ---: | ---: |`);
      for (const rc of comp.rows) {
        const share = comp.total > 0 ? (rc.g / comp.total) * 100 : 0;
        lines.push(
          `| ${rc.row.name} | ${rc.row.refs.C} | ${rc.row.qty === null ? "—" : qtyFmt(rc.row.qty)} | ${rc.d === null ? "—" : eur(rc.d)} | ${eur(rc.g)} | ${share.toFixed(1)}% |`,
        );
      }
      lines.push(`| **Total** | | | | **${eur(comp.total)}** | |`);
      lines.push("");
    }
  }
  lines.push(`## Linhas com quantidade potencialmente fora de escala`);
  lines.push("");
  lines.push(`| Ficha | Ingrediente | Célula | Quantidade | Custo da linha | Razão do alerta | Confiança |`);
  lines.push(`| --- | --- | --- | ---: | ---: | --- | --- |`);
  for (const a of anomalies) {
    lines.push(
      `| ${a.node} | ${a.ingredient} | ${a.ref} | ${qtyFmt(a.qty)} | ${eur(a.lineCost)} | ${a.reason} | ${a.confidence} |`,
    );
  }
  lines.push("");
  lines.push(`## Heurísticas usadas`);
  lines.push("");
  lines.push(
    `1. **Escala relativa** — a quantidade é ≥5× a mediana do mesmo artigo nas outras fichas (≥20× ⇒ confiança alta, ≥10× ⇒ média). Requer o artigo usado em pelo menos 3 fichas.`,
  );
  lines.push(
    `2. **Custo dominante** — a linha vale ≥50% do custo do prato **e** ≥30% do preço de venda s/IVA (≥50% do preço ⇒ confiança alta).`,
  );
  lines.push("");

  mkdirSync(PATHS.reportsDir, { recursive: true });
  writeFileSync(REPORT_PATH, lines.join("\n"), "utf-8");

  console.log(`\nPOTENTIAL BATCH / YIELD COSTING ISSUES\n`);
  if (batchIssues.length === 0) {
    console.log(`  Nenhuma ficha sinalizada.`);
  } else {
    for (const b of batchIssues) {
      console.log(`  [${b.confidence.padEnd(5)}] ${b.node} — ${b.reasons.join("; ")}`);
    }
  }

  console.log(`\nPOTENTIAL QUANTITY / UNIT ANOMALIES\n`);
  console.log(
    `  ${anomalies.length} linhas sinalizadas (${anomalies.filter((a) => a.confidence === "alta").length} alta, ${anomalies.filter((a) => a.confidence === "média").length} média, ${anomalies.filter((a) => a.confidence === "baixa").length} baixa)`,
  );
  console.log(`  ${highFcItems.length} itens com food cost > 50%\n`);
  for (const a of anomalies.slice(0, 20)) {
    console.log(
      `  [${a.confidence.padEnd(5)}] ${a.node} · ${a.ingredient} (${a.ref}) = ${qtyFmt(a.qty)} — ${a.reason}`,
    );
  }
  if (anomalies.length > 20) console.log(`  … +${anomalies.length - 20}`);
  console.log(`\n✓ Relatório: ${REPORT_PATH}`);
  console.log(`  Nada foi corrigido — lista para revisão humana.`);
}

main();
