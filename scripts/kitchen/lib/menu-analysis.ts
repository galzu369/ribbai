import type { MenuAlias, MenuItem } from "./config";
import type { GarnishAllergenProfile, GlutenStatus } from "./allergens";
import { glutenStatus } from "./allergens";
import type { AllergenCode } from "./allergens";
import type { FichaBlock } from "./ficha-parser";
import { normalizeName, type MatchResult } from "./matching";
import type { BlockComputation } from "./recompute";
import type { NodeRole } from "./subrecipes";

/**
 * Economia do Menu: liga cada item do menu à(s) sua(s) ficha(s) técnica(s) e
 * calcula Food Cost, Margem Bruta sobre Mercadoria e Markup.
 *
 * TERMINOLOGIA (deliberada): "Margem Bruta sobre Mercadoria" = Preço Venda
 * s/IVA − Custo Mercadoria s/IVA. NÃO é lucro líquido nem rentabilidade
 * operacional — não inclui mão de obra, energia, renda, comissões, desperdício,
 * amortizações nem impostos.
 */

/** Categoria do menu -> workbook das fichas técnicas. */
export const CATEGORY_WORKBOOK: Record<string, string> = {
  Petiscos: "Petiscos",
  Sopas: "Petiscos",
  Peixe: "Peixe",
  Carne: "Carne",
  Vegetariano: "Vegetariano",
  Hambúrgueres: "Hambúrgueres",
  Pokes: "Pokes",
  Tostas: "Tostas",
  "Açaí Bowls": "Açaí Bowls",
  Saladas: "Saladas",
  "Sobremesas Caseiras": "Sobremesas Caseiras",
  "Acompanhamentos Extras": "Acompanhamentos",
};

export type MenuItemStatus =
  | "COSTED"
  | "PARTIAL"
  | "MISSING_TECHNICAL_SHEET"
  | "MISSING_PRICE"
  | "AMBIGUOUS";

export type AlertCode =
  | "HIGH_FOOD_COST"
  | "LOW_GROSS_MARGIN"
  | "MISSING_COST"
  | "MISSING_SELLING_PRICE"
  | "MISSING_TECHNICAL_SHEET"
  | "UNIT_MISMATCH"
  | "AMBIGUOUS_INGREDIENT"
  | "UNMATCHED_INGREDIENT"
  | "ALLERGEN_DATA_INCOMPLETE"
  | "COST_REVIEW_CANDIDATE"
  | "DATA_QUALITY_ISSUE";

export interface Alert {
  code: AlertCode;
  item: string;
  /** Razão objetiva, sempre com o dado que a originou. */
  reason: string;
  severity: "info" | "warning" | "critical";
}

export interface MenuItemAnalysis {
  name: string;
  category: string;
  priceCIva: number | null;
  priceSIva: number | null;
  vatRate: number;
  /** nodeIds das fichas (1 normalmente; 9 no caso do Açaí Bowl). */
  nodes: string[];
  variantCount: number;
  cost: number | null;
  costMin: number | null;
  costMax: number | null;
  foodCostPct: number | null;
  grossMarginEur: number | null;
  grossMarginPct: number | null;
  markup: number | null;
  status: MenuItemStatus;
  allergens: AllergenCode[];
  allergenComplete: boolean;
  gf: GlutenStatus;
  /** Problemas de costing herdados das fichas (linhas por resolver, etc.). */
  issues: string[];
  note?: string;
}

export interface CategoryStats {
  category: string;
  items: number;
  costed: number;
  avgCost: number | null;
  avgPriceSIva: number | null;
  avgFoodCostPct: number | null;
  medianFoodCostPct: number | null;
  avgGrossMarginEur: number | null;
  avgGrossMarginPct: number | null;
  avgMarkup: number | null;
}

export interface MenuKpis {
  totalItems: number;
  costedItems: number;
  costingCoveragePct: number;
  priceCoveragePct: number;
  allergenCoveragePct: number;
  gfCoveragePct: number;
  dataCompletenessPct: number;
  avgCost: number | null;
  medianCost: number | null;
  minCost: { item: string; value: number } | null;
  maxCost: { item: string; value: number } | null;
  avgPriceSIva: number | null;
  avgPriceCIva: number | null;
  medianPriceSIva: number | null;
  minPriceSIva: number | null;
  maxPriceSIva: number | null;
  avgFoodCostPct: number | null;
  medianFoodCostPct: number | null;
  minFoodCost: { item: string; value: number } | null;
  maxFoodCost: { item: string; value: number } | null;
  avgGrossMarginEur: number | null;
  medianGrossMarginPct: number | null;
  avgGrossMarginPct: number | null;
  maxGrossMarginEur: { item: string; value: number } | null;
  minGrossMarginEur: { item: string; value: number } | null;
  avgMarkup: number | null;
  medianMarkup: number | null;
}

export interface HealthScore {
  score: number;
  components: { label: string; score: number; weight: number; detail: string }[];
}

export interface SubrecipeImpact {
  nodeId: string;
  label: string;
  cost: number;
  usedInNodes: string[];
  usedInMenuItems: string[];
}

export interface IngredientExposure {
  article: string;
  usedInBlocks: number;
  usedInMenuItems: number;
  totalCostContribution: number;
}

export interface MenuAnalysis {
  items: MenuItemAnalysis[];
  categories: CategoryStats[];
  kpis: MenuKpis;
  alerts: Alert[];
  /** Nós com papel "menu" que não têm item correspondente no menu oficial. */
  orphanNodes: { nodeId: string; reason: string }[];
  subrecipeImpact: SubrecipeImpact[];
  ingredientExposure: IngredientExposure[];
  foodCostBuckets: { label: string; count: number; items: string[] }[];
  health: HealthScore;
}

// ------------------------------------------------------------------ helpers

const avg = (xs: number[]): number | null =>
  xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length;

const median = (xs: number[]): number | null => {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
};

const extreme = (
  entries: { item: string; value: number }[],
  dir: "min" | "max",
): { item: string; value: number } | null => {
  if (entries.length === 0) return null;
  return entries.reduce((a, b) =>
    dir === "max" ? (b.value > a.value ? b : a) : b.value < a.value ? b : a,
  );
};

/** Título da ficha sem sufixos entre parênteses, para matching com o menu. */
function fichaTitleKeys(block: FichaBlock): string[] {
  const keys = new Set<string>();
  keys.add(normalizeName(block.sheetName.replace(/\s*\([^)]*\)\s*$/u, "")));
  if (block.title) {
    const stripped = block.title.replace(/\s*\([^)]*\)\s*$/u, "").trim();
    keys.add(normalizeName(stripped));
    keys.add(normalizeName(stripped.split(" - ")[0]));
    // "HAMBÚRGUER RIBBAÍ" -> também indexar sem o prefixo do tipo
    const withoutPrefix = stripped.replace(
      /^(HAMBÚRGUER|TOSTA|SALADA|MOLHO|PREGO|CROQUETES?)\s+/iu,
      "",
    );
    keys.add(normalizeName(withoutPrefix));
  }
  return [...keys].filter((k) => k.length > 0);
}

export interface AnalysisInput {
  blocks: FichaBlock[];
  roles: Map<string, NodeRole>;
  comps: Map<string, BlockComputation>;
  matches: Map<string, MatchResult[]>;
  allergenProfiles: Map<string, GarnishAllergenProfile>;
  usedIn: Map<string, string[]>;
  menu: MenuItem[];
  menuAliases: MenuAlias[];
  salesVatRate: number;
}

/** Escala analítica de food cost — instrumento de análise, não política oficial. */
export const FOOD_COST_BUCKETS = [
  { label: "< 20%", min: 0, max: 0.2 },
  { label: "20–25%", min: 0.2, max: 0.25 },
  { label: "25–30%", min: 0.25, max: 0.3 },
  { label: "30–35%", min: 0.3, max: 0.35 },
  { label: "35–40%", min: 0.35, max: 0.4 },
  { label: "> 40%", min: 0.4, max: Infinity },
];

export function analyseMenu(input: AnalysisInput): MenuAnalysis {
  const {
    blocks,
    roles,
    comps,
    matches,
    allergenProfiles,
    usedIn,
    menu,
    menuAliases,
    salesVatRate,
  } = input;

  const byNode = new Map(blocks.map((b) => [b.nodeId, b]));
  const menuBlocks = blocks.filter(
    (b) => roles.get(b.nodeId) === "menu" || roles.get(b.nodeId) === "side",
  );

  // índice de fichas de menu por workbook + chave normalizada
  const fichaIndex = new Map<string, string[]>();
  for (const block of menuBlocks) {
    for (const key of fichaTitleKeys(block)) {
      const k = `${block.workbook}|${key}`;
      const list = fichaIndex.get(k);
      if (list) list.push(block.nodeId);
      else fichaIndex.set(k, [block.nodeId]);
    }
  }
  const aliasByMenu = new Map(menuAliases.map((a) => [normalizeName(a.menu), a]));

  const claimed = new Set<string>();
  const items: MenuItemAnalysis[] = [];
  const alerts: Alert[] = [];

  for (const mi of menu) {
    const workbook = CATEGORY_WORKBOOK[mi.category];
    const key = normalizeName(mi.name);
    let nodes: string[] = [];
    let status: MenuItemStatus = "COSTED";

    const alias = aliasByMenu.get(key);
    if (alias) {
      const target = alias.node;
      const resolved = byNode.has(target)
        ? [target]
        : blocks.filter((b) => b.nodeId.startsWith(`${target}#`)).map((b) => b.nodeId);
      nodes = resolved;
    } else if (workbook) {
      // Açaí Bowls: um item de menu = todas as combinações do workbook
      if (workbook === "Açaí Bowls") {
        nodes = menuBlocks.filter((b) => b.workbook === workbook).map((b) => b.nodeId);
      } else {
        nodes = fichaIndex.get(`${workbook}|${key}`) ?? [];
      }
    }

    if (nodes.length === 0) {
      status = "MISSING_TECHNICAL_SHEET";
      alerts.push({
        code: "MISSING_TECHNICAL_SHEET",
        item: mi.name,
        reason: `Sem ficha técnica correspondente em "${workbook ?? "?"}" para o item de menu "${mi.name}" (${mi.category}).`,
        severity: "critical",
      });
    } else if (nodes.length > 1 && workbook !== "Açaí Bowls") {
      status = "AMBIGUOUS";
      alerts.push({
        code: "AMBIGUOUS_INGREDIENT",
        item: mi.name,
        reason: `"${mi.name}" corresponde a ${nodes.length} fichas: ${nodes.join(", ")}. Registar em menu-item-aliases.json.`,
        severity: "warning",
      });
    }
    for (const n of nodes) claimed.add(n);

    const nodeComps = nodes
      .map((n) => comps.get(n))
      .filter((c): c is BlockComputation => Boolean(c));
    // custo do item de menu = custo da unidade vendável (dose), nunca o do lote
    const costs = nodeComps.map((c) => c.portionCost);
    const cost = avg(costs);
    const costMin = costs.length > 0 ? Math.min(...costs) : null;
    const costMax = costs.length > 0 ? Math.max(...costs) : null;

    const priceCIva = mi.priceCIva;
    const priceSIva = priceCIva / (1 + salesVatRate);

    // problemas de costing herdados das fichas
    const issues: string[] = [];
    for (const n of nodes) {
      const block = byNode.get(n);
      const rowMatches = matches.get(n) ?? [];
      if (!block) continue;
      if (block.rows.length === 0) issues.push(`ficha sem ingredientes (${n})`);
      rowMatches.forEach((m, i) => {
        const rowName = block.rows[i].name;
        if (["UNMATCHED", "AMBIGUOUS", "PENDING"].includes(m.status)) {
          issues.push(`"${rowName}" sem preço (${m.status})`);
        }
        if (m.flags.includes("MISSING_QTY")) {
          issues.push(`"${rowName}" sem quantidade`);
        }
        if (m.flags.includes("UNIT_WARNING")) {
          issues.push(`"${rowName}" comprado à unidade/pack (validar conversão)`);
        }
      });
    }
    if (status === "COSTED" && issues.length > 0) status = "PARTIAL";

    // alergénios agregados das variantes
    const allergenSet = new Set<AllergenCode>();
    let allergenComplete = nodes.length > 0;
    let gf: GlutenStatus = "GF_CANDIDATE";
    for (const n of nodes) {
      const profile = allergenProfiles.get(n);
      if (!profile) continue;
      for (const a of profile.allergens) allergenSet.add(a);
      if (!profile.complete) allergenComplete = false;
      const nodeGf = glutenStatus(profile);
      if (nodeGf === "CONTAINS_GLUTEN") gf = "CONTAINS_GLUTEN";
      else if (nodeGf === "INDETERMINATE" && gf !== "CONTAINS_GLUTEN") {
        gf = "INDETERMINATE";
      }
    }
    if (nodes.length === 0) {
      allergenComplete = false;
      gf = "INDETERMINATE";
    }

    const hasCost = cost !== null && cost > 0;
    const foodCostPct = hasCost && priceSIva > 0 ? (cost as number) / priceSIva : null;
    const grossMarginEur = hasCost ? priceSIva - (cost as number) : null;
    const grossMarginPct =
      grossMarginEur !== null && priceSIva > 0 ? grossMarginEur / priceSIva : null;
    const markup = hasCost ? priceSIva / (cost as number) : null;

    if (nodes.length > 0 && !hasCost) {
      status = "PARTIAL";
      alerts.push({
        code: "MISSING_COST",
        item: mi.name,
        reason: `Ficha "${nodes[0]}" com Custo Mercadoria = €0,00 (sem ingredientes custeados) — Food Cost e margem não calculáveis.`,
        severity: "critical",
      });
    }

    items.push({
      name: mi.name,
      category: mi.category,
      priceCIva,
      priceSIva,
      vatRate: salesVatRate,
      nodes,
      variantCount: nodes.length,
      cost,
      costMin,
      costMax,
      foodCostPct,
      grossMarginEur,
      grossMarginPct,
      markup,
      status,
      allergens: [...allergenSet],
      allergenComplete,
      gf,
      issues: [...new Set(issues)],
      note: mi.note,
    });
  }

  // nós de menu sem item correspondente
  const orphanNodes = menuBlocks
    .filter((b) => !claimed.has(b.nodeId))
    .map((b) => ({
      nodeId: b.nodeId,
      reason:
        roles.get(b.nodeId) === "side"
          ? "dose de acompanhamento usada noutras fichas (não vendida isoladamente com este nome)"
          : "ficha técnica sem item correspondente no menu oficial",
    }));
  for (const orphan of orphanNodes) {
    alerts.push({
      code: "DATA_QUALITY_ISSUE",
      item: orphan.nodeId,
      reason: `Ficha "${orphan.nodeId}" não está associada a nenhum item do menu — ${orphan.reason}.`,
      severity: "info",
    });
  }

  // ---------------------------------------------------------------- KPIs
  const costedItems = items.filter((i) => i.foodCostPct !== null);
  const fcValues = costedItems.map((i) => i.foodCostPct as number);
  const gmEurValues = costedItems.map((i) => i.grossMarginEur as number);
  const gmPctValues = costedItems.map((i) => i.grossMarginPct as number);
  const markupValues = costedItems.map((i) => i.markup as number);
  const costValues = costedItems.map((i) => i.cost as number);
  const priceSValues = items.map((i) => i.priceSIva as number);

  const withAllergens = items.filter((i) => i.allergenComplete).length;
  const gfDetermined = items.filter((i) => i.gf !== "INDETERMINATE").length;
  const withSheet = items.filter((i) => i.nodes.length > 0).length;
  const withPrice = items.filter((i) => i.priceCIva !== null).length;
  const withCategory = items.filter((i) => i.category.length > 0).length;

  const kpis: MenuKpis = {
    totalItems: items.length,
    costedItems: costedItems.length,
    costingCoveragePct: (costedItems.length / items.length) * 100,
    priceCoveragePct: (withPrice / items.length) * 100,
    allergenCoveragePct: (withAllergens / items.length) * 100,
    gfCoveragePct: (gfDetermined / items.length) * 100,
    dataCompletenessPct:
      ((withSheet + costedItems.length + withPrice + withAllergens + withCategory) /
        (items.length * 5)) *
      100,
    avgCost: avg(costValues),
    medianCost: median(costValues),
    minCost: extreme(
      costedItems.map((i) => ({ item: i.name, value: i.cost as number })),
      "min",
    ),
    maxCost: extreme(
      costedItems.map((i) => ({ item: i.name, value: i.cost as number })),
      "max",
    ),
    avgPriceSIva: avg(priceSValues),
    avgPriceCIva: avg(items.map((i) => i.priceCIva as number)),
    medianPriceSIva: median(priceSValues),
    minPriceSIva: priceSValues.length > 0 ? Math.min(...priceSValues) : null,
    maxPriceSIva: priceSValues.length > 0 ? Math.max(...priceSValues) : null,
    avgFoodCostPct: avg(fcValues),
    medianFoodCostPct: median(fcValues),
    minFoodCost: extreme(
      costedItems.map((i) => ({ item: i.name, value: i.foodCostPct as number })),
      "min",
    ),
    maxFoodCost: extreme(
      costedItems.map((i) => ({ item: i.name, value: i.foodCostPct as number })),
      "max",
    ),
    avgGrossMarginEur: avg(gmEurValues),
    avgGrossMarginPct: avg(gmPctValues),
    medianGrossMarginPct: median(gmPctValues),
    maxGrossMarginEur: extreme(
      costedItems.map((i) => ({ item: i.name, value: i.grossMarginEur as number })),
      "max",
    ),
    minGrossMarginEur: extreme(
      costedItems.map((i) => ({ item: i.name, value: i.grossMarginEur as number })),
      "min",
    ),
    avgMarkup: avg(markupValues),
    medianMarkup: median(markupValues),
  };

  // ------------------------------------------------------------ categorias
  const categoryNames = [...new Set(items.map((i) => i.category))];
  const categories: CategoryStats[] = categoryNames.map((category) => {
    const list = items.filter((i) => i.category === category);
    const costedList = list.filter((i) => i.foodCostPct !== null);
    return {
      category,
      items: list.length,
      costed: costedList.length,
      avgCost: avg(costedList.map((i) => i.cost as number)),
      avgPriceSIva: avg(list.map((i) => i.priceSIva as number)),
      avgFoodCostPct: avg(costedList.map((i) => i.foodCostPct as number)),
      medianFoodCostPct: median(costedList.map((i) => i.foodCostPct as number)),
      avgGrossMarginEur: avg(costedList.map((i) => i.grossMarginEur as number)),
      avgGrossMarginPct: avg(costedList.map((i) => i.grossMarginPct as number)),
      avgMarkup: avg(costedList.map((i) => i.markup as number)),
    };
  });

  // --------------------------------------------------------------- alertas
  const medianFc = kpis.medianFoodCostPct ?? 0;
  for (const item of costedItems) {
    const fc = item.foodCostPct as number;
    if (fc > 0.4) {
      alerts.push({
        code: "HIGH_FOOD_COST",
        item: item.name,
        reason: `Food Cost ${(fc * 100).toFixed(1)}% (mediana do menu ${(medianFc * 100).toFixed(1)}%) — custo €${(item.cost as number).toFixed(2)} sobre venda s/IVA €${(item.priceSIva as number).toFixed(2)}.`,
        severity: fc > 0.6 ? "critical" : "warning",
      });
    }
    if ((item.grossMarginPct as number) < 0.6) {
      alerts.push({
        code: "LOW_GROSS_MARGIN",
        item: item.name,
        reason: `Margem Bruta sobre Mercadoria ${((item.grossMarginPct as number) * 100).toFixed(1)}% (€${(item.grossMarginEur as number).toFixed(2)}) — abaixo de 60% do preço s/IVA.`,
        severity: (item.grossMarginPct as number) < 0.4 ? "critical" : "warning",
      });
    }
    if (fc > medianFc * 2 && medianFc > 0) {
      alerts.push({
        code: "COST_REVIEW_CANDIDATE",
        item: item.name,
        reason: `Food Cost ${(fc * 100).toFixed(1)}% é mais do dobro da mediana do menu (${(medianFc * 100).toFixed(1)}%) — rever quantidades da ficha ou preço.`,
        severity: "warning",
      });
    }
  }
  for (const item of items) {
    if (!item.allergenComplete && item.nodes.length > 0) {
      alerts.push({
        code: "ALLERGEN_DATA_INCOMPLETE",
        item: item.name,
        reason: `Perfil de alergénios incompleto — ingredientes processados por validar com o rótulo/fornecedor.`,
        severity: "warning",
      });
    }
    for (const issue of item.issues) {
      if (issue.includes("sem preço")) {
        alerts.push({
          code: "UNMATCHED_INGREDIENT",
          item: item.name,
          reason: `Ingrediente ${issue} — custo do item subavaliado.`,
          severity: "warning",
        });
      } else if (issue.includes("sem quantidade")) {
        alerts.push({
          code: "DATA_QUALITY_ISSUE",
          item: item.name,
          reason: `Ingrediente ${issue} na ficha — contribui €0,00 para o custo.`,
          severity: "warning",
        });
      } else if (issue.includes("unidade/pack")) {
        alerts.push({
          code: "UNIT_MISMATCH",
          item: item.name,
          reason: `Ingrediente ${issue}.`,
          severity: "info",
        });
      }
    }
  }

  // --------------------------------------------- impacto das subreceitas
  const menuItemByNode = new Map<string, string[]>();
  for (const item of items) {
    for (const n of item.nodes) {
      const list = menuItemByNode.get(n);
      if (list) list.push(item.name);
      else menuItemByNode.set(n, [item.name]);
    }
  }
  const subrecipeImpact: SubrecipeImpact[] = [];
  for (const [nodeId, users] of usedIn) {
    const comp = comps.get(nodeId);
    const block = byNode.get(nodeId);
    if (!comp || !block) continue;
    const menuItems = new Set<string>();
    const visit = (n: string, depth: number): void => {
      if (depth > 6) return;
      for (const name of menuItemByNode.get(n) ?? []) menuItems.add(name);
      for (const parent of usedIn.get(n) ?? []) visit(parent, depth + 1);
    };
    visit(nodeId, 0);
    subrecipeImpact.push({
      nodeId,
      label: block.title ?? block.sheetName,
      cost: comp.total,
      usedInNodes: users,
      usedInMenuItems: [...menuItems].sort((a, b) => a.localeCompare(b, "pt")),
    });
  }
  subrecipeImpact.sort(
    (a, b) => b.usedInMenuItems.length - a.usedInMenuItems.length || b.cost - a.cost,
  );

  // ------------------------------------------- exposição a ingredientes
  const exposureMap = new Map<
    string,
    { blocks: Set<string>; contribution: number }
  >();
  for (const block of blocks) {
    const comp = comps.get(block.nodeId);
    const rowMatches = matches.get(block.nodeId) ?? [];
    if (!comp) continue;
    comp.rows.forEach((rc, i) => {
      const m = rowMatches[i];
      if (!m?.article) return;
      let entry = exposureMap.get(m.article.name);
      if (!entry) {
        entry = { blocks: new Set(), contribution: 0 };
        exposureMap.set(m.article.name, entry);
      }
      entry.blocks.add(block.nodeId);
      entry.contribution += rc.g;
    });
  }
  const ingredientExposure: IngredientExposure[] = [...exposureMap.entries()]
    .map(([article, e]) => {
      const menuItemsUsing = new Set<string>();
      for (const nodeId of e.blocks) {
        const visit = (n: string, depth: number): void => {
          if (depth > 6) return;
          for (const name of menuItemByNode.get(n) ?? []) menuItemsUsing.add(name);
          for (const parent of usedIn.get(n) ?? []) visit(parent, depth + 1);
        };
        visit(nodeId, 0);
      }
      return {
        article,
        usedInBlocks: e.blocks.size,
        usedInMenuItems: menuItemsUsing.size,
        totalCostContribution: e.contribution,
      };
    })
    .sort(
      (a, b) => b.usedInMenuItems - a.usedInMenuItems || b.usedInBlocks - a.usedInBlocks,
    );

  // --------------------------------------------------------------- buckets
  const foodCostBuckets = FOOD_COST_BUCKETS.map((b) => {
    const list = costedItems.filter(
      (i) => (i.foodCostPct as number) >= b.min && (i.foodCostPct as number) < b.max,
    );
    return { label: b.label, count: list.length, items: list.map((i) => i.name) };
  });

  // ---------------------------------------------------- health (analítico)
  const pctScore = (v: number): number => Math.max(0, Math.min(100, v));
  const fcInBand = costedItems.filter(
    (i) => (i.foodCostPct as number) <= 0.35,
  ).length;
  const gmConsistent = costedItems.filter(
    (i) => (i.grossMarginPct as number) >= 0.65,
  ).length;
  const components: HealthScore["components"] = [
    {
      label: "Cobertura de costing",
      score: pctScore(kpis.costingCoveragePct),
      weight: 0.3,
      detail: `${kpis.costedItems}/${kpis.totalItems} itens com custo calculado`,
    },
    {
      label: "Food Cost dentro da banda analítica (≤35%)",
      score: costedItems.length > 0 ? pctScore((fcInBand / costedItems.length) * 100) : 0,
      weight: 0.25,
      detail: `${fcInBand}/${costedItems.length} itens com Food Cost ≤ 35%`,
    },
    {
      label: "Consistência da Margem Bruta (≥65%)",
      score:
        costedItems.length > 0 ? pctScore((gmConsistent / costedItems.length) * 100) : 0,
      weight: 0.25,
      detail: `${gmConsistent}/${costedItems.length} itens com Margem Bruta ≥ 65%`,
    },
    {
      label: "Cobertura de preços de venda",
      score: pctScore(kpis.priceCoveragePct),
      weight: 0.1,
      detail: `${withPrice}/${items.length} itens com preço de venda`,
    },
    {
      label: "Completude dos dados",
      score: pctScore(kpis.dataCompletenessPct),
      weight: 0.1,
      detail: `ficha + custo + preço + alergénios + categoria`,
    },
  ];
  const health: HealthScore = {
    score: Math.round(
      components.reduce((acc, c) => acc + c.score * c.weight, 0),
    ),
    components,
  };

  return {
    items,
    categories,
    kpis,
    alerts,
    orphanNodes,
    subrecipeImpact,
    ingredientExposure,
    foodCostBuckets,
    health,
  };
}
