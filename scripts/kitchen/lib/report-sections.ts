import { ALLERGEN_CODES, ALLERGEN_NAMES, type GlutenStatus } from "./allergens";
import type { MenuItemAnalysis } from "./menu-analysis";
import {
  allergenBadge,
  allergenIcon,
  columnChart,
  escapeHtml,
  hBarChart,
  LAYOUTS,
  reportCss,
  scatterChart,
  type BarDatum,
  type ChartSpec,
  type LayoutName,
  type NodeView,
  type ReportModel,
} from "./report-html";

/**
 * Layout ativo durante a renderização. A V1 (portrait) e a V2 (landscape)
 * partilham exatamente estas secções e os mesmos dados — só as dimensões dos
 * gráficos e o CSS mudam.
 */
let CHART: ChartSpec = LAYOUTS.portrait.chart;
let LAYOUT: LayoutName = "portrait";

/**
 * Escala individual por ficha (nodeId → fator), para as poucas fichas que não
 * cabem numa página no tamanho base. Produzido por `npm run kitchen:report:fit`
 * e guardado em `mappings/ficha-layout-scales.json` — é um artefacto de layout,
 * não um dado de negócio.
 */
export interface FichaFit {
  /** Fator da tipografia (nunca abaixo de 0,88 — mínimo legível). */
  scale: number;
  /** Fator dos espaçamentos, reduzido primeiro e mais fundo que a tipografia. */
  density: number;
}

let FICHA_SCALES: Record<string, FichaFit> = {};

export function setFichaScales(scales: Record<string, FichaFit>): void {
  FICHA_SCALES = scales;
}

/** V3 e V3.1 partilham a tipografia ampliada e os rótulos abreviados. */
const isReadable = (): boolean =>
  LAYOUT === "readable" || LAYOUT === "readable-tight";

const e = escapeHtml;

const eur = (n: number, maxFrac = 2): string =>
  new Intl.NumberFormat("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: maxFrac,
  }).format(n) + " €";

const eurOrDash = (n: number | null, maxFrac = 2): string =>
  n === null ? "—" : eur(n, maxFrac);

const pct1 = (n: number): string =>
  new Intl.NumberFormat("pt-PT", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(n * 100) + "%";

const pctOrDash = (n: number | null): string => (n === null ? "—" : pct1(n));

const pct0 = (n: number): string => `${Math.round(n)}%`;

const qtyFmt = (n: number): string =>
  new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 3 }).format(n);

const markupFmt = (n: number | null): string =>
  n === null ? "—" : `${n.toFixed(2).replace(".", ",")}x`;

/** Escala analítica de food cost — NÃO é política oficial RIBBAÍ. */
function foodCostTier(fc: number | null): { label: string; cls: string } {
  if (fc === null) return { label: "—", cls: "info" };
  if (fc < 0.25) return { label: "Excelente", cls: "ok" };
  if (fc < 0.3) return { label: "Controlado", cls: "ok" };
  if (fc < 0.35) return { label: "Atenção", cls: "warn" };
  return { label: "Elevado", cls: "bad" };
}

function gfChip(gf: GlutenStatus): string {
  switch (gf) {
    case "CONTAINS_GLUTEN":
      return `<span class="chip bad">Contém glúten (GL)</span>`;
    case "GF_CANDIDATE":
      return `<span class="chip ok">GF✱ sem glúten identificado</span>`;
    case "INDETERMINATE":
      return `<span class="chip warn">⚠ GF indeterminado</span>`;
  }
}

function statusChip(status: MenuItemAnalysis["status"]): string {
  switch (status) {
    case "COSTED":
      return `<span class="chip ok">Costed</span>`;
    case "PARTIAL":
      return `<span class="chip warn">Parcial</span>`;
    case "MISSING_TECHNICAL_SHEET":
      return `<span class="chip bad">Sem ficha</span>`;
    case "MISSING_PRICE":
      return `<span class="chip bad">Sem preço</span>`;
    case "AMBIGUOUS":
      return `<span class="chip warn">Ambíguo</span>`;
  }
}

function secHead(num: string, title: string, right = ""): string {
  return `<div class="sec-head"><span class="num">${num}</span><h2>${e(title)}</h2>${
    right ? `<span class="right">${e(right)}</span>` : ""
  }</div>`;
}

/**
 * Ranking horizontal que, se for demasiado longo para uma página, é dividido em
 * blocos numerados. Todos os blocos partilham a mesma escala e a mesma legenda,
 * pelo que continuam diretamente comparáveis; a ordem original é mantida.
 */
function longRanking(opts: {
  title: string;
  sub: string;
  data: BarDatum[];
  valueFmt: (n: number) => string;
  ariaLabel: string;
  legend?: string;
  clampAt?: number;
}): string {
  const perPage = CHART.itemsPerChartPage;
  const total = opts.data.length;
  const scaleMax = Math.max(...opts.data.map((d) => d.value), 0);
  // linhas mais altas nas partes divididas, para o gráfico encher a página
  const spec =
    CHART.longRankingRowHeight !== undefined && perPage && total > perPage
      ? { ...CHART, rowHeight: CHART.longRankingRowHeight }
      : CHART;

  const card = (data: BarDatum[], partLabel: string, range: string): string =>
    `<div class="chart-card chart-block">
    <h4>${e(opts.title)}${partLabel}</h4>
    <div class="sub">${opts.sub}${range}</div>
    ${hBarChart(data, {
      valueFmt: opts.valueFmt,
      ariaLabel: opts.ariaLabel + partLabel,
      clampAt: opts.clampAt,
      scaleMax,
      spec,
    })}
    ${opts.legend ?? ""}
  </div>`;

  if (!perPage || total <= perPage) return card(opts.data, "", "");

  const parts = Math.ceil(total / perPage);
  const size = Math.ceil(total / parts);
  const blocks: string[] = [];
  for (let i = 0; i < parts; i++) {
    const slice = opts.data.slice(i * size, (i + 1) * size);
    if (slice.length === 0) continue;
    const from = i * size + 1;
    const to = i * size + slice.length;
    blocks.push(
      card(
        slice,
        ` — parte ${i + 1} de ${parts}`,
        ` · itens ${from}–${to} de ${total}, mesma escala em todas as partes`,
      ),
    );
  }
  return blocks.join("");
}

/**
 * Rótulo de coluna: na V3 usa a forma abreviada para a tabela caber na largura
 * útil sem encolher a letra. O significado completo fica no texto introdutório
 * da secção — nenhuma coluna é removida.
 */
const th = (full: string, short: string): string =>
  isReadable() ? e(short) : e(full);

const kpi = (v: string, l: string, opts: { na?: boolean; sub?: string; hi?: boolean } = {}): string =>
  `<div class="kpi${opts.na ? " na" : ""}${opts.hi ? " hi" : ""}"><div class="v">${v}</div><div class="l">${e(l)}</div>${
    opts.sub ? `<div class="sub">${e(opts.sub)}</div>` : ""
  }</div>`;

// --------------------------------------------------------------------- cover

function cover(m: ReportModel): string {
  const k = m.analysis.kpis;
  return `<div class="cover">
  <div class="brand">Ribbaí</div>
  <h1>Kitchen Costing<br>&amp; Menu Financial Health</h1>
  <div class="rule"></div>
  <div class="sub">Menu Costing · Fichas Técnicas · Food Cost · Margem Bruta · Alergénios</div>
  ${
    LAYOUT === "landscape"
      ? `<div class="edition">Versão 2 · Formato Horizontal</div>`
      : LAYOUT === "readable"
        ? `<div class="edition">Versão 3 · Formato Horizontal · Leitura Ampliada</div>`
        : LAYOUT === "readable-tight"
          ? `<div class="edition">Versão 3.1 · Fichas Indivisíveis</div>`
          : ""
  }
  <div class="headline">
    <div><div class="v">${k.totalItems}</div><div class="l">Itens do menu</div></div>
    <div><div class="v">${pctOrDash(k.avgFoodCostPct)}</div><div class="l">Food Cost médio</div></div>
    <div><div class="v">${eurOrDash(k.avgGrossMarginEur)}</div><div class="l">Margem bruta média</div></div>
    <div><div class="v">${markupFmt(k.avgMarkup)}</div><div class="l">Markup médio</div></div>
    <div><div class="v">${m.analysis.health.score}<small>/100</small></div><div class="l">Menu Financial Health</div></div>
  </div>
  <div class="meta">
    Gerado em <b>${e(m.generatedDateTime)}</b><br>
    Preçário <b>${e(m.versions.priceList)}</b> · Menu <b>${e(m.versions.menu)}</b> · Fichas técnicas <b>${e(m.versions.technicalSheets)}</b><br>
    Alergénios <b>${e(m.versions.allergens)}</b> · Aliases <b>${e(m.versions.aliases)}</b><br>
    <span style="display:inline-block;margin-top:14px;max-width:62ch">Relatório executivo e referência operacional da Cozinha. Análise de economia do
    menu — food cost, pricing e margem bruta sobre mercadoria. Não constitui análise de
    rentabilidade líquida do restaurante (ver Metodologia).</span>
  </div>
</div>`;
}

// ----------------------------------------------------------------------- toc

const TOC: [string, string][] = [
  ["01", "Sumário Executivo"],
  ["02", "Menu Financial Health"],
  ["03", "Qualidade dos Dados"],
  ["04", "Análise de Custos e Margens"],
  ["05", "Tabela Mestre do Menu"],
  ["06", "Cost & Margin Insights"],
  ["07", "Alertas"],
  ["08", "Reconciliação Menu ↔ Fichas Técnicas"],
  ["09", "Preçário Master"],
  ["10", "Gluten Free / Sem Glúten"],
  ["11", "Matriz de Alergénios"],
  ["12", "Fichas Técnicas — Itens do Menu"],
  ["13", "Guarnições & Subreceitas"],
  ["14", "Metodologia e Limitações"],
];

function toc(): string {
  const items = TOC.map(
    ([n, t]) => `<a href="#sec-${n}"><span class="n">${n}</span>${e(t)}</a>`,
  ).join("");
  const legend = ALLERGEN_CODES.map(
    (c) =>
      `<div class="li">${allergenIcon(c, 17)}<b>${c}</b><span>${e(ALLERGEN_NAMES[c])}</span></div>`,
  ).join("");
  return `<section class="toc-sec"><div class="sec-head"><h2>Índice</h2></div>
  <nav class="toc">${items}</nav>
  <h3>Legenda de alergénios (14 alergénios obrigatórios UE)</h3>
  <div class="legend-grid">${legend}</div>
  <p class="note">Cada alergénio é sempre identificado por ícone <em>e</em> código textual — a leitura
  não depende de cor e mantém-se em impressão monocromática.</p>
</section>`;
}

// ------------------------------------------------------------------ summary

function execSummary(m: ReportModel): string {
  const k = m.analysis.kpis;
  const c = m.counts;
  return `<section id="sec-01">${secHead("01", "Sumário Executivo")}
  <p class="lead">Economia do menu à data de geração. Todos os custos de mercadoria são apurados
  <strong>sem IVA</strong>, com o Preçário como fonte de verdade das matérias-primas e o
  <em>Custo Mercadoria s/Iva</em> de cada guarnição/subreceita como fonte das preparações internas.
  Preços de venda provenientes do menu em vigor (IVA de venda ${pct0(m.analysis.items[0]?.vatRate ? m.analysis.items[0].vatRate * 100 : 13)}).</p>

  <h4 class="sub-head">Menu Overview</h4>
  <div class="kpis">
    ${kpi(String(k.totalItems), "Itens do menu")}
    ${kpi(`${k.costedItems}<small>/${k.totalItems}</small>`, "Itens com custo calculado")}
    ${kpi(pct0(k.costingCoveragePct), "Costing coverage", { hi: true })}
    ${kpi(String(c.blocks), "Fichas técnicas (blocos)")}
  </div>

  <h4 class="sub-head">Food Cost &amp; Margem Bruta sobre Mercadoria</h4>
  <div class="kpis">
    ${kpi(pctOrDash(k.avgFoodCostPct), "Food Cost médio")}
    ${kpi(pctOrDash(k.medianFoodCostPct), "Food Cost mediano")}
    ${kpi(pctOrDash(k.minFoodCost?.value ?? null), "Menor food cost", { sub: k.minFoodCost?.item })}
    ${kpi(pctOrDash(k.maxFoodCost?.value ?? null), "Maior food cost", { sub: k.maxFoodCost?.item })}
    ${kpi(eurOrDash(k.avgGrossMarginEur), "Margem bruta média €")}
    ${kpi(pctOrDash(k.avgGrossMarginPct), "Margem bruta média %")}
    ${kpi(eurOrDash(k.maxGrossMarginEur?.value ?? null), "Maior margem bruta €", { sub: k.maxGrossMarginEur?.item })}
    ${kpi(markupFmt(k.avgMarkup), "Markup médio", { sub: `mediano ${markupFmt(k.medianMarkup)}` })}
  </div>

  <h4 class="sub-head">Custos e Preços</h4>
  <div class="kpis">
    ${kpi(eurOrDash(k.avgCost), "Custo médio de mercadoria", { sub: `mediano ${eurOrDash(k.medianCost)}` })}
    ${kpi(eurOrDash(k.maxCost?.value ?? null), "Item mais caro de produzir", { sub: k.maxCost?.item })}
    ${kpi(eurOrDash(k.avgPriceSIva), "Preço médio de venda s/IVA")}
    ${kpi(eurOrDash(k.avgPriceCIva), "Preço médio de venda c/IVA")}
  </div>

  <h4 class="sub-head">Base de dados</h4>
  <div class="kpis">
    ${kpi(String(m.pricebook.length), "Artigos no Preçário")}
    ${kpi(String(c.uniqueIngredients), "Ingredientes únicos nas fichas")}
    ${kpi(String(m.garnishNodes.length + m.internalNodes.length), "Guarnições e preparações internas")}
    ${kpi(String(c.subrecipeLinks), "Ligações a subreceitas")}
  </div>
  <div class="callout"><strong>Âmbito financeiro:</strong> os indicadores acima avaliam a economia do
  menu através do custo de mercadoria, preço de venda e margem bruta sobre mercadoria. Não incluem
  mão de obra, energia, renda, comissões, desperdício, amortizações nem impostos — pelo que
  <strong>não representam rentabilidade líquida</strong> do restaurante.</div>
</section>`;
}

// ------------------------------------------------------------------- health

function healthSection(m: ReportModel): string {
  const h = m.analysis.health;
  const comps = h.components
    .map(
      (c) =>
        `<div class="qrow"><span class="l">${e(c.label)} <span class="tier">peso ${Math.round(c.weight * 100)}%</span><br><span class="note" style="margin:0">${e(c.detail)}</span></span>` +
        `<span class="qbar"><i style="width:${Math.round(c.score)}%"></i></span>` +
        `<span class="v">${Math.round(c.score)}</span></div>`,
    )
    .join("");
  return `<section id="sec-02">${secHead("02", "Menu Financial Health")}
  <div class="health">
    <div>
      <div class="score">${h.score}<small>/100</small></div>
      <div class="label">Internal Analytical Health Score</div>
    </div>
    <div class="comps">${comps}</div>
  </div>
  <p class="note"><strong>Metodologia:</strong> indicador analítico interno, calculado como média
  ponderada das cinco componentes acima (cobertura de costing 30%, food cost dentro da banda
  analítica ≤35% 25%, consistência da margem bruta ≥65% 25%, cobertura de preços 10%, completude
  dos dados 10%). Não é uma métrica contabilística oficial nem uma medida de rentabilidade —
  mede a saúde da <em>economia do menu</em> e a fiabilidade dos dados que a suportam.</p>
</section>`;
}

// ------------------------------------------------------------------ quality

function dataQuality(m: ReportModel): string {
  const k = m.analysis.kpis;
  const q = m.quality;
  const row = (l: string, v: number): string =>
    `<div class="qrow"><span class="l">${e(l)}</span><span class="qbar"><i style="width:${Math.round(v)}%"></i></span><span class="v">${pct0(v)}</span></div>`;
  const count = (l: string, v: number): string =>
    `<div class="qrow"><span class="l">${e(l)}</span><span></span><span class="v">${v}</span></div>`;
  return `<section id="sec-03">${secHead("03", "Qualidade dos Dados")}
  <p class="lead">Qualidade dos dados e saúde financeira são conceitos distintos: esta secção mede
  quão completos e fiáveis são os dados que alimentam a análise, não o desempenho económico do menu.</p>
  ${row("Cobertura de fichas técnicas (Menu ↔ Receita)", (m.analysis.items.filter((i) => i.nodes.length > 0).length / m.analysis.items.length) * 100)}
  ${row("Costing coverage (itens com custo calculado)", k.costingCoveragePct)}
  ${row("Cobertura de preços de venda", k.priceCoveragePct)}
  ${row("Preços de ingredientes ligados ao Preçário", q.priceLinkingPct)}
  ${row("Cobertura de alergénios (perfis completos)", k.allergenCoveragePct)}
  ${row("Estado GF determinado", k.gfCoveragePct)}
  ${row("Data completeness (ficha+custo+preço+alergénios+categoria)", k.dataCompletenessPct)}
  ${count("Itens sem ficha técnica", m.analysis.items.filter((i) => i.nodes.length === 0).length)}
  ${count("Ingredientes sem correspondência no Preçário", q.unmatchedIngredients)}
  ${count("Ingredientes ambíguos", q.ambiguousIngredients)}
  ${count("Linhas sem quantidade na ficha", q.missingQty)}
  ${count("Avisos de unidade (artigo comprado à unidade/pack)", q.unitWarnings)}
  <p class="note">Perfis de alergénios «incompletos» significam que há ingredientes processados cuja
  rotulagem ainda não foi validada com o fornecedor — por segurança nunca se assume ausência de alergénio.</p>
</section>`;
}

// ------------------------------------------------------------------- charts

function costAnalysis(m: ReportModel): string {
  const costed = m.analysis.items.filter((i) => i.foodCostPct !== null);
  const byFc = [...costed].sort(
    (a, b) => (b.foodCostPct as number) - (a.foodCostPct as number),
  );
  const fcData: BarDatum[] = byFc.map((i) => ({
    label: i.name,
    value: (i.foodCostPct as number) * 100,
    hint: `custo ${eur(i.cost as number)} · venda s/IVA ${eur(i.priceSIva as number)}`,
    flagged: (i.foodCostPct as number) > 0.35,
  }));

  const byGm = [...costed].sort(
    (a, b) => (b.grossMarginEur as number) - (a.grossMarginEur as number),
  );
  const gmData: BarDatum[] = byGm.map((i) => ({
    label: i.name,
    value: i.grossMarginEur as number,
    hint: `${pct1(i.grossMarginPct as number)} do preço s/IVA`,
  }));

  const dist: BarDatum[] = m.analysis.foodCostBuckets.map((b, idx) => ({
    label: b.label,
    value: b.count,
    flagged: idx >= 4,
  }));

  const byCat = [...m.analysis.categories]
    .filter((c) => c.avgFoodCostPct !== null)
    .sort((a, b) => (b.avgFoodCostPct as number) - (a.avgFoodCostPct as number));
  const catFc: BarDatum[] = byCat.map((c) => ({
    label: `${c.category} (${c.costed})`,
    value: (c.avgFoodCostPct as number) * 100,
    hint: `margem bruta média ${eur(c.avgGrossMarginEur as number)}`,
    flagged: (c.avgFoodCostPct as number) > 0.35,
  }));
  const catGm: BarDatum[] = [...m.analysis.categories]
    .filter((c) => c.avgGrossMarginEur !== null)
    .sort((a, b) => (b.avgGrossMarginEur as number) - (a.avgGrossMarginEur as number))
    .map((c) => ({
      label: `${c.category} (${c.costed})`,
      value: c.avgGrossMarginEur as number,
      hint: `food cost médio ${pct1(c.avgFoodCostPct as number)}`,
    }));

  const topCost: BarDatum[] = [...costed]
    .sort((a, b) => (b.cost as number) - (a.cost as number))
    .slice(0, 10)
    .map((i) => ({
      label: i.name,
      value: i.cost as number,
      hint: `food cost ${pct1(i.foodCostPct as number)}`,
    }));

  const scatter = costed.map((i) => ({
    label: i.name,
    x: i.cost as number,
    y: i.priceSIva as number,
    flagged: (i.foodCostPct as number) > 0.35,
  }));

  return `<section id="sec-04">${secHead("04", "Análise de Custos e Margens", `${costed.length} itens custeados`)}
  ${longRanking({
    title: "Food Cost por item",
    sub: `Custo Mercadoria s/IVA ÷ Preço Venda s/IVA — ordenado do maior para o menor.
    Barras assinaladas (!) estão acima de 35%, o limite superior da banda analítica. A escala está
    limitada a 100% (custo = preço); barras com ⇥ ultrapassam esse limite — ver o valor no rótulo`,
    data: fcData,
    valueFmt: (n) => `${n.toFixed(1)}%`,
    ariaLabel: "Food cost por item do menu",
    clampAt: 100,
    legend: `<div class="chart-legend"><span><i style="background:#2a78d6"></i>Food Cost ≤ 35%</span><span><i style="background:#d03b3b"></i>Food Cost &gt; 35% — fora da banda analítica</span></div>`,
  })}
  ${longRanking({
    title: "Margem Bruta sobre Mercadoria por item (€)",
    sub: "Preço Venda s/IVA − Custo Mercadoria s/IVA. Não é lucro líquido — não inclui mão de obra nem custos operacionais",
    data: gmData,
    valueFmt: (n) => eur(n),
    ariaLabel: "Margem bruta sobre mercadoria por item",
  })}
  <div class="chart-card">
    <h4>Custo de mercadoria × Preço de venda s/IVA</h4>
    <div class="sub">Cada ponto é um item do menu. As linhas tracejadas marcam food cost de referência
    (20%, 30%, 40%) — pontos abaixo de uma linha têm food cost superior a essa referência.</div>
    ${scatterChart(scatter, {
      ariaLabel: "Dispersão de custo de mercadoria contra preço de venda sem IVA",
      xLabel: "Custo Mercadoria s/IVA",
      yLabel: "Preço Venda s/IVA",
      guides: [
        { ratio: 0.2, label: "FC 20%" },
        { ratio: 0.3, label: "FC 30%" },
        { ratio: 0.4, label: "FC 40%" },
      ],
      spec: CHART,
    })}
    <div class="chart-legend"><span><i style="background:#2a78d6"></i>Food Cost ≤ 35%</span><span><i style="background:#d03b3b"></i>Food Cost &gt; 35%</span></div>
  </div>
  <div class="two-col">
    <div class="chart-card">
      <h4>Distribuição do Food Cost</h4>
      <div class="sub">Nº de itens por intervalo (escala analítica)</div>
      ${columnChart(dist, { ariaLabel: "Distribuição de itens por intervalo de food cost", unitLabel: "itens", spec: CHART })}
    </div>
    <div class="chart-card">
      <h4>Top 10 — custo de mercadoria</h4>
      <div class="sub">Itens mais caros de produzir (EUR s/IVA)</div>
      ${hBarChart(topCost, { valueFmt: (n) => eur(n), ariaLabel: "Top 10 itens por custo de mercadoria", labelWidth: CHART.labelWidthNarrow, width: CHART.halfWidth, spec: CHART })}
    </div>
  </div>
  <div class="two-col">
    <div class="chart-card">
      <h4>Food Cost médio por categoria</h4>
      <div class="sub">Média simples dos itens custeados de cada categoria</div>
      ${hBarChart(catFc, { valueFmt: (n) => `${n.toFixed(1)}%`, ariaLabel: "Food cost médio por categoria", labelWidth: CHART.labelWidthNarrow, width: CHART.halfWidth, spec: CHART })}
    </div>
    <div class="chart-card">
      <h4>Margem bruta média por categoria (€)</h4>
      <div class="sub">Margem Bruta sobre Mercadoria por item, média da categoria</div>
      ${hBarChart(catGm, { valueFmt: (n) => eur(n), ariaLabel: "Margem bruta média por categoria", labelWidth: CHART.labelWidthNarrow, width: CHART.halfWidth, spec: CHART })}
    </div>
  </div>
  <p class="note"><strong>Escala analítica de food cost</strong> (instrumento de análise, não política
  oficial RIBBAÍ): Excelente &lt; 25% · Controlado 25–30% · Atenção 30–35% · Elevado &gt; 35%.</p>
</section>`;
}

// -------------------------------------------------------- master menu table

function masterTable(m: ReportModel): string {
  const categories = [...new Set(m.analysis.items.map((i) => i.category))];
  const body = categories
    .map((cat) => {
      const list = m.analysis.items
        .filter((i) => i.category === cat)
        .sort((a, b) => (b.foodCostPct ?? -1) - (a.foodCostPct ?? -1));
      const stats = m.analysis.categories.find((c) => c.category === cat);
      const rows = list
        .map((i) => {
          const tier = foodCostTier(i.foodCostPct);
          const flagged = (i.foodCostPct ?? 0) > 0.35;
          const alg =
            i.allergens.length > 0
              ? i.allergens.map((a) => `<b>${a}</b>`).join(" ")
              : "<span class='note' style='margin:0'>—</span>";
          return `<tr${flagged ? ' class="flagged"' : ""}>
        <td><strong>${e(i.name)}</strong>${i.variantCount > 1 ? `<span class="sub-tag">${i.variantCount} variantes · custo ${eur(i.costMin as number)}–${eur(i.costMax as number)}</span>` : ""}</td>
        <td class="num">${eurOrDash(i.priceCIva)}</td>
        <td class="num">${eurOrDash(i.priceSIva)}</td>
        <td class="num">${eurOrDash(i.cost)}</td>
        <td class="num">${pctOrDash(i.foodCostPct)}</td>
        <td><span class="chip ${tier.cls}">${e(tier.label)}</span></td>
        <td class="num">${eurOrDash(i.grossMarginEur)}</td>
        <td class="num">${pctOrDash(i.grossMarginPct)}</td>
        <td class="num">${markupFmt(i.markup)}</td>
        <td>${i.gf === "CONTAINS_GLUTEN" ? "—" : i.gf === "GF_CANDIDATE" ? "<span class='chip ok'>GF✱</span>" : "<span class='chip warn'>?</span>"}</td>
        <td style="font-size:10.5px;letter-spacing:.02em">${alg}</td>
        <td>${statusChip(i.status)}</td>
      </tr>`;
        })
        .join("");
      return `<tr class="group-row"><td colspan="12">${e(cat)} · ${list.length} itens · food cost médio ${pctOrDash(stats?.avgFoodCostPct ?? null)} · margem bruta média ${eurOrDash(stats?.avgGrossMarginEur ?? null)}</td></tr>${rows}`;
    })
    .join("");

  return `<section id="sec-05">${secHead("05", "Tabela Mestre do Menu", `${m.analysis.items.length} itens`)}
  <p class="lead">Todos os itens do menu em vigor. Food Cost = Custo Mercadoria s/IVA ÷ Preço Venda s/IVA;
  Margem Bruta = Preço Venda s/IVA − Custo Mercadoria s/IVA; Markup = Preço Venda s/IVA ÷ Custo.
  Linhas destacadas têm food cost acima de 35%.${
    isReadable()
      ? " Nesta edição os cabeçalhos usam a forma abreviada — <em>PVP c/IVA</em> e <em>PVP s/IVA</em> são o preço de venda com e sem IVA, <em>FC %</em> é o Food Cost."
      : ""
  }</p>
  <div class="tbl-wrap"><table class="wide dense">
    <thead><tr><th>Item</th><th class="num">${th("Venda c/IVA", "PVP c/IVA")}</th><th class="num">${th("Venda s/IVA", "PVP s/IVA")}</th>
    <th class="num">Custo</th><th class="num">${th("Food Cost", "FC %")}</th><th>Escala</th>
    <th class="num">Margem €</th><th class="num">Margem %</th><th class="num">Markup</th>
    <th>GF</th><th>Alergénios</th><th>Estado</th></tr></thead>
    <tbody>${body}</tbody>
  </table></div>
  <p class="note">GF✱ = sem ingredientes com glúten identificados, sujeito a validação de contaminação
  cruzada. «?» = perfil de alergénios incompleto, estado indeterminado. Códigos de alergénios na legenda inicial.</p>
</section>`;
}

// ------------------------------------------------------------------ insights

function insights(m: ReportModel): string {
  const a = m.analysis;
  const costed = a.items.filter((i) => i.foodCostPct !== null);
  const medianFc = a.kpis.medianFoodCostPct ?? 0;

  const rankTable = (
    title: string,
    list: MenuItemAnalysis[],
    valueHead: string,
    value: (i: MenuItemAnalysis) => string,
  ): string =>
    `<div class="tbl-wrap"><table>
      <thead><tr><th>${e(title)}</th><th>Categoria</th><th class="num">${e(valueHead)}</th></tr></thead>
      <tbody>${list
        .map(
          (i) =>
            `<tr><td>${e(i.name)}</td><td>${e(i.category)}</td><td class="num">${value(i)}</td></tr>`,
        )
        .join("")}</tbody></table></div>`;

  const topFc = [...costed].sort((x, y) => (y.foodCostPct as number) - (x.foodCostPct as number)).slice(0, 10);
  const lowFc = [...costed].sort((x, y) => (x.foodCostPct as number) - (y.foodCostPct as number)).slice(0, 10);
  const topGm = [...costed].sort((x, y) => (y.grossMarginEur as number) - (x.grossMarginEur as number)).slice(0, 10);
  const lowGm = [...costed].sort((x, y) => (x.grossMarginEur as number) - (y.grossMarginEur as number)).slice(0, 10);
  const topCost = [...costed].sort((x, y) => (y.cost as number) - (x.cost as number)).slice(0, 10);

  // ---- interpretação editorial, gerada só a partir dos dados
  const cats = a.categories.filter((c) => c.costed > 0);
  const catHighFc = [...cats].sort((x, y) => (y.avgFoodCostPct as number) - (x.avgFoodCostPct as number))[0];
  const catLowFc = [...cats].sort((x, y) => (x.avgFoodCostPct as number) - (y.avgFoodCostPct as number))[0];
  const catHighGm = [...cats].sort((x, y) => (y.avgGrossMarginEur as number) - (x.avgGrossMarginEur as number))[0];
  const catLowGm = [...cats].sort((x, y) => (x.avgGrossMarginEur as number) - (y.avgGrossMarginEur as number))[0];
  const outliers = costed.filter((i) => (i.foodCostPct as number) > medianFc * 2);
  const topExposure = a.ingredientExposure.slice(0, 5);
  const topSub = a.subrecipeImpact.filter((s) => s.usedInMenuItems.length >= 2).slice(0, 6);

  const insight = (fact: string, interp: string, reco: string): string =>
    `<div class="insight">
      <div class="fact"><span class="tier">Facto</span> ${fact}</div>
      <div class="interp"><span class="tier">Interpretação</span> ${interp}</div>
      <div class="reco"><span class="tier">Recomendação</span> ${reco}</div>
    </div>`;

  const blocks: string[] = [];
  if (catHighFc && catLowFc) {
    blocks.push(
      insight(
        `A categoria com maior food cost médio é <strong>${e(catHighFc.category)}</strong> (${pct1(catHighFc.avgFoodCostPct as number)}, ${catHighFc.costed} itens); a menor é <strong>${e(catLowFc.category)}</strong> (${pct1(catLowFc.avgFoodCostPct as number)}).`,
        `A diferença de ${((catHighFc.avgFoodCostPct as number) - (catLowFc.avgFoodCostPct as number) > 0 ? ((catHighFc.avgFoodCostPct as number) - (catLowFc.avgFoodCostPct as number)) * 100 : 0).toFixed(1)} pp entre categorias indica estruturas de custo distintas — categorias com matérias-primas de proteína fresca tendem a concentrar mais custo de mercadoria.`,
        `Rever a estrutura de custo de ${e(catHighFc.category)} ao nível dos ingredientes dominantes antes de considerar ajustes de preço.`,
      ),
    );
  }
  if (catHighGm && catLowGm) {
    blocks.push(
      insight(
        `Em valor absoluto, <strong>${e(catHighGm.category)}</strong> gera a maior margem bruta média por item (${eur(catHighGm.avgGrossMarginEur as number)}); <strong>${e(catLowGm.category)}</strong> a menor (${eur(catLowGm.avgGrossMarginEur as number)}).`,
        `Margem bruta por item não é o mesmo que contribuição total — esta depende também das quantidades vendidas, que ainda não estão integradas no sistema.`,
        `Integrar dados de vendas POS para converter margem unitária em contribuição total e permitir verdadeira análise de Menu Engineering.`,
      ),
    );
  }
  if (outliers.length > 0) {
    blocks.push(
      insight(
        `${outliers.length} ${outliers.length === 1 ? "item apresenta" : "itens apresentam"} food cost superior ao dobro da mediana do menu (${pct1(medianFc)}): ${outliers.map((i) => `<strong>${e(i.name)}</strong> (${pct1(i.foodCostPct as number)})`).join(", ")}.`,
        `Desvios desta magnitude resultam habitualmente de quantidades da ficha técnica desalinhadas com a dose real servida, e não de pricing incorreto.`,
        `Confirmar com a cozinha as quantidades das fichas envolvidas antes de qualquer decisão de preço.`,
      ),
    );
  }
  if (topExposure.length > 0) {
    blocks.push(
      insight(
        `Os ingredientes com maior presença transversal são ${topExposure.map((x) => `<strong>${e(x.article)}</strong> (${x.usedInMenuItems} itens)`).join(", ")}.`,
        `Uma variação no preço de compra destes artigos propaga-se a uma parte significativa do menu simultaneamente.`,
        `Monitorizar estes artigos nas atualizações do Preçário e simular o impacto antes de aceitar aumentos de fornecedor.`,
      ),
    );
  }
  if (topSub.length > 0) {
    blocks.push(
      insight(
        `${topSub.length} subreceitas são partilhadas por 2 ou mais itens do menu, com destaque para ${topSub
          .slice(0, 3)
          .map((s) => `<strong>${e(s.label)}</strong> (${s.usedInMenuItems.length} itens, ${eur(s.cost)})`)
          .join(", ")}.`,
        `Uma alteração de receita ou de custo nestas preparações internas repercute-se em vários pratos ao mesmo tempo, amplificando o efeito.`,
        `Tratar estas subreceitas como pontos de controlo prioritários em revisões de custo e de processo.`,
      ),
    );
  }

  return `<section id="sec-06">${secHead("06", "Cost & Margin Insights")}
  <p class="lead">Análise de custo e margem sobre mercadoria. Sem dados de vendas/popularidade não é
  possível fazer verdadeiro Menu Engineering (Star/Plowhorse/Puzzle/Dog) — essa classificação exige
  volumes vendidos e será possível quando os dados POS forem integrados.</p>

  <h3>Rankings</h3>
  <div class="two-col">
    ${rankTable("Top 10 — maior food cost", topFc, "Food Cost", (i) => pct1(i.foodCostPct as number))}
    ${rankTable("Top 10 — menor food cost", lowFc, "Food Cost", (i) => pct1(i.foodCostPct as number))}
  </div>
  <div class="two-col">
    ${rankTable("Top 10 — maior margem bruta €", topGm, "Margem €", (i) => eur(i.grossMarginEur as number))}
    ${rankTable("Top 10 — menor margem bruta €", lowGm, "Margem €", (i) => eur(i.grossMarginEur as number))}
  </div>
  ${rankTable("Top 10 — maior custo de mercadoria", topCost, "Custo s/IVA", (i) => eur(i.cost as number))}

  <h3>Benchmark por categoria</h3>
  <div class="tbl-wrap"><table class="dense">
    <thead><tr><th>Categoria</th><th class="num">Itens</th><th class="num">${th("Custo médio", "Custo méd.")}</th>
    <th class="num">${th("Venda média s/IVA", "PVP méd. s/IVA")}</th><th class="num">${th("Food Cost médio", "FC méd.")}</th><th class="num">${th("Food Cost mediano", "FC med.")}</th>
    <th class="num">${th("Margem bruta média €", "Margem méd. €")}</th><th class="num">${th("Margem bruta média %", "Margem méd. %")}</th><th class="num">${th("Markup médio", "Markup méd.")}</th></tr></thead>
    <tbody>${[...m.analysis.categories]
      .sort((x, y) => (y.avgGrossMarginEur ?? 0) - (x.avgGrossMarginEur ?? 0))
      .map(
        (c) => `<tr><td><strong>${e(c.category)}</strong></td><td class="num">${c.items}</td>
      <td class="num">${eurOrDash(c.avgCost)}</td><td class="num">${eurOrDash(c.avgPriceSIva)}</td>
      <td class="num">${pctOrDash(c.avgFoodCostPct)}</td><td class="num">${pctOrDash(c.medianFoodCostPct)}</td>
      <td class="num">${eurOrDash(c.avgGrossMarginEur)}</td><td class="num">${pctOrDash(c.avgGrossMarginPct)}</td>
      <td class="num">${markupFmt(c.avgMarkup)}</td></tr>`,
      )
      .join("")}</tbody>
  </table></div>

  <h3>Financial Menu Insights</h3>
  <p class="note" style="margin-bottom:6px">Cada bloco separa explicitamente <em>facto</em> (dado
  medido), <em>interpretação</em> (leitura analítica) e <em>recomendação</em> (ação sugerida).</p>
  ${blocks.join("")}

  <h3>Exposição a ingredientes e subreceitas</h3>
  <div class="two-col">
    <div class="tbl-wrap"><table>
      <thead><tr><th>Ingrediente</th><th class="num">Itens do menu</th><th class="num">Fichas</th></tr></thead>
      <tbody>${a.ingredientExposure
        .slice(0, 15)
        .map(
          (x) =>
            `<tr><td>${e(x.article)}</td><td class="num">${x.usedInMenuItems}</td><td class="num">${x.usedInBlocks}</td></tr>`,
        )
        .join("")}</tbody></table></div>
    <div class="tbl-wrap"><table>
      <thead><tr><th>Subreceita</th><th class="num">Custo</th><th class="num">Itens do menu</th></tr></thead>
      <tbody>${a.subrecipeImpact
        .slice(0, 15)
        .map(
          (s) =>
            `<tr><td>${e(s.nodeId)}</td><td class="num">${eur(s.cost)}</td><td class="num">${s.usedInMenuItems.length}</td></tr>`,
        )
        .join("")}</tbody></table></div>
  </div>
</section>`;
}

// ------------------------------------------------------------------- alerts

function alertsSection(m: ReportModel): string {
  const order = { critical: 0, warning: 1, info: 2 };
  const sorted = [...m.analysis.alerts].sort(
    (a, b) => order[a.severity] - order[b.severity] || a.item.localeCompare(b.item, "pt"),
  );
  const chip = (s: string): string =>
    s === "critical"
      ? `<span class="chip bad">Crítico</span>`
      : s === "warning"
        ? `<span class="chip warn">Aviso</span>`
        : `<span class="chip info">Info</span>`;
  const counts = {
    critical: sorted.filter((a) => a.severity === "critical").length,
    warning: sorted.filter((a) => a.severity === "warning").length,
    info: sorted.filter((a) => a.severity === "info").length,
  };
  return `<section id="sec-07">${secHead("07", "Alertas", `${sorted.length} no total`)}
  <div class="kpis k3">
    ${kpi(String(counts.critical), "Críticos")}
    ${kpi(String(counts.warning), "Avisos")}
    ${kpi(String(counts.info), "Informativos")}
  </div>
  <div class="tbl-wrap" style="margin-top:14px"><table>
    <thead><tr><th>Severidade</th><th>Código</th><th>Item</th><th>Razão objetiva</th></tr></thead>
    <tbody>${sorted
      .map(
        (a) =>
          `<tr><td>${chip(a.severity)}</td><td><code>${e(a.code)}</code></td><td>${e(a.item)}</td><td>${e(a.reason)}</td></tr>`,
      )
      .join("")}</tbody>
  </table></div>
  <p class="note">Nenhum alerta financeiro é emitido sem o dado que o originou. Alertas informativos
  (ex.: artigos comprados à unidade) não implicam erro — sinalizam pontos a confirmar.</p>
</section>`;
}

// ----------------------------------------------------------- reconciliation

function reconciliation(m: ReportModel): string {
  const rows = m.analysis.items
    .map(
      (i) => `<tr>
      <td>${e(i.name)}</td>
      <td>${e(i.category)}</td>
      <td>${i.nodes.length > 0 ? i.nodes.map((n) => `<code>${e(n)}</code>`).join(i.nodes.length > 3 ? " " : "<br>") : "<span class='chip bad'>em falta</span>"}</td>
      <td class="num">${eurOrDash(i.cost)}</td>
      <td class="num">${eurOrDash(i.priceSIva)}</td>
      <td class="num">${pctOrDash(i.foodCostPct)}</td>
      <td class="num">${eurOrDash(i.grossMarginEur)}</td>
      <td>${statusChip(i.status)}</td>
    </tr>`,
    )
    .join("");
  const orphans = m.analysis.orphanNodes
    .map(
      (o) =>
        `<tr><td><code>${e(o.nodeId)}</code></td><td>${e(o.reason)}</td></tr>`,
    )
    .join("");
  return `<section id="sec-08">${secHead("08", "Reconciliação Menu ↔ Fichas Técnicas")}
  <p class="lead">Todos os itens do menu aparecem nesta tabela, mesmo quando não têm ficha técnica
  ou custo — nenhum item desaparece silenciosamente da análise.</p>
  <div class="tbl-wrap"><table class="wide">
    <thead><tr><th>Item do menu</th><th>Categoria</th><th>Ficha técnica</th><th class="num">Custo</th>
    <th class="num">Venda s/IVA</th><th class="num">Food Cost</th><th class="num">Margem bruta</th><th>Estado</th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>
  ${
    orphans
      ? `<h3>Fichas sem item de menu correspondente</h3>
  <div class="tbl-wrap"><table><thead><tr><th>Ficha</th><th>Razão</th></tr></thead><tbody>${orphans}</tbody></table></div>`
      : ""
  }
</section>`;
}

// -------------------------------------------------------------- price list

function pricebookSection(m: ReportModel): string {
  const zones = [...new Set(m.pricebook.map((a) => a.zone ?? "—"))];
  const bodies = zones
    .map((zone) => {
      const items = m.pricebook.filter((a) => (a.zone ?? "—") === zone);
      const sorted = [...items].sort(
        (x, y) =>
          (x.supplier ?? "").localeCompare(y.supplier ?? "", "pt") ||
          x.name.localeCompare(y.name, "pt"),
      );
      const rows = sorted
        .map(
          (a) => `<tr>
        <td>${e(a.name)}</td><td>${e(a.unit ?? "—")}</td>
        <td class="num">${eur(a.netPrice, 4)}</td>
        <td class="num">${Math.round(a.iva * 100)}%</td>
        <td class="num">${eur(a.netPrice * (1 + a.iva), 4)}</td>
        <td>${e(a.supplier ?? "—")}</td>
      </tr>`,
        )
        .join("");
      return `<tr class="group-row"><td colspan="6">Zona ${e(zone)} · ${items.length} artigos</td></tr>${rows}`;
    })
    .join("");
  return `<section id="sec-09">${secHead("09", "Preçário Master", `${m.pricebook.length} artigos`)}
  <p class="lead">Fonte de verdade dos preços de compra. A base do costing é sempre o
  <strong>Preço s/IVA</strong>; o preço c/IVA é apresentado apenas como informação
  (<code>= s/IVA + s/IVA × IVA</code>) e nunca entra no cálculo de custo.</p>
  <div class="tbl-wrap"><table>
    <thead><tr><th>Artigo</th><th>Un</th><th class="num">Preço s/IVA</th><th class="num">IVA</th>
    <th class="num">Preço c/IVA</th><th>Fornecedor</th></tr></thead>
    <tbody>${bodies}</tbody></table></div>
</section>`;
}

// ------------------------------------------------------------------ gluten

function gfSection(m: ReportModel): string {
  const groups: [GlutenStatus, string, string][] = [
    [
      "GF_CANDIDATE",
      "GF✱ — Sem ingredientes com glúten identificados",
      "Perfil de ingredientes completo e sem qualquer fonte de glúten identificada. ✱ Sujeito a validação operacional de contaminação cruzada (bancadas, fritura partilhada, utensílios) antes de qualquer comunicação ao cliente como «Gluten Free».",
    ],
    [
      "INDETERMINATE",
      "Estado GF indeterminado — dados em falta",
      "Sem glúten identificado até agora, mas com ingredientes processados cuja rotulagem ainda não foi validada, ou sem ficha técnica — não classificar como GF.",
    ],
    [
      "CONTAINS_GLUTEN",
      "Contém glúten (GL)",
      "Glúten confirmado nos ingredientes ou herdado de uma subreceita.",
    ],
  ];
  const blocks = groups
    .map(([status, title, desc]) => {
      const list = m.analysis.items.filter((i) => i.gf === status);
      if (list.length === 0) return "";
      const rows = list
        .map((i) => {
          const nodes = i.nodes
            .map((n) => m.nodes.find((x) => x.nodeId === n))
            .filter((x): x is NodeView => Boolean(x));
          const obs =
            status === "GF_CANDIDATE"
              ? "Validar contaminação cruzada"
              : status === "INDETERMINATE"
                ? i.nodes.length === 0
                  ? "Sem ficha técnica"
                  : `Por validar: ${[...new Set(nodes.flatMap((n) => n.allergenPending.map((p) => p.name)))].slice(0, 4).join(", ")}`
                : `Fonte: ${[...new Set(nodes.flatMap((n) => n.glutenSources))].slice(0, 4).join(", ") || "ingredientes com GL"}`;
          return `<tr><td>${e(i.name)}</td><td>${e(i.category)}</td><td>${gfChip(i.gf)}</td><td>${e(obs)}</td></tr>`;
        })
        .join("");
      return `<h3>${e(title)} · ${list.length}</h3>
      <p class="note" style="margin-bottom:7px">${e(desc)}</p>
      <div class="tbl-wrap"><table>
        <thead><tr><th>Item</th><th>Categoria</th><th>Estado GF</th><th>Observações</th></tr></thead>
        <tbody>${rows}</tbody></table></div>`;
    })
    .join("");
  return `<section id="sec-10">${secHead("10", "Gluten Free / Sem Glúten")}
  <div class="callout warn"><strong>Nota de segurança:</strong> «sem ingredientes com glúten
  identificados» não é o mesmo que «Gluten Free garantido». A garantia exige validação do processo
  (contaminação cruzada, fritura partilhada, superfícies). Nenhum item é aqui declarado GF como facto absoluto.</div>
  ${blocks}
</section>`;
}

// ------------------------------------------------------------------ matrix

function matrixSection(m: ReportModel): string {
  const head = ALLERGEN_CODES.map(
    (c) => `<th title="${e(ALLERGEN_NAMES[c])}" aria-label="${e(ALLERGEN_NAMES[c])}">${c}</th>`,
  ).join("");
  const categories = [...new Set(m.analysis.items.map((i) => i.category))];
  const body = categories
    .map((cat) => {
      const list = m.analysis.items.filter((i) => i.category === cat);
      const rows = list
        .map((i) => {
          const cells = ALLERGEN_CODES.map((c) =>
            i.allergens.includes(c)
              ? `<td><span class="dot" role="img" aria-label="${e(`contém ${ALLERGEN_NAMES[c]}`)}"></span></td>`
              : `<td></td>`,
          ).join("");
          const flag = i.allergenComplete
            ? `<span class="chip ok">✓</span>`
            : `<span class="chip warn">⚠</span>`;
          return `<tr><td>${e(i.name)}</td>${cells}<td>${flag}</td></tr>`;
        })
        .join("");
      return `<tr class="group-row"><td colspan="${ALLERGEN_CODES.length + 2}">${e(cat)}</td></tr>${rows}`;
    })
    .join("");
  return `<section id="sec-11">${secHead("11", "Matriz de Alergénios", "itens do menu × 14 alergénios UE")}
  <div class="tbl-wrap"><table class="matrix">
    <thead><tr><th>Item</th>${head}<th>Perfil</th></tr></thead>
    <tbody>${body}</tbody></table></div>
  <p class="note">● = alergénio declarado (incluindo herdado de subreceitas). «Perfil ⚠» = existem
  ingredientes por validar — podem vir a acrescentar alergénios; nunca interpretar célula vazia numa
  linha ⚠ como ausência garantida.</p>
</section>`;
}

// ------------------------------------------------------------------ fichas

function fichaCard(n: NodeView, showFinancials: boolean): string {
  const rows = n.rows
    .map((r) => {
      const name =
        r.kind === "sub"
          ? `${e(r.name)}<span class="sub-tag">↳ Subreceita — custo da ficha ${e(r.targetLabel ?? r.targetNode ?? "")}</span>`
          : r.kind === "pending"
            ? `${e(r.name)}<span class="sub-tag warnt">⚠ ${e(r.statusLabel)}</span>`
            : e(r.name);
      const iva = r.kind === "sub" && r.iva === null ? "N/A" : r.iva === null ? "—" : `${Math.round(r.iva * 100)}%`;
      return `<tr>
      <td>${name}</td>
      <td class="num">${r.qty === null ? "—" : qtyFmt(r.qty)}</td>
      <td>${e(r.unit ?? "—")}</td>
      <td class="num">${r.price === null ? "—" : eur(r.price, 4)}</td>
      <td class="num">${iva}</td>
      <td class="num">${r.cost === null ? "—" : eur(r.cost, 4)}</td>
    </tr>`;
    })
    .join("");

  const fk = (v: string, l: string, cls = ""): string =>
    `<div class="fk"><div class="v${cls}">${v}</div><div class="l">${e(l)}</div></div>`;

  const tier = foodCostTier(n.foodCostPct);
  const isBatch = n.yieldQuantity !== null;
  const yieldBlock = isBatch
    ? `${fk(`${n.yieldQuantity} <small style="font-size:11px;color:var(--muted)">${e(n.yieldUnit ?? "")}</small>`, "Rendimento do lote")}
       ${fk(eur(n.portionCost), "Custo por dose s/IVA")}`
    : "";
  const financials = showFinancials
    ? `${yieldBlock}
       ${fk(eurOrDash(n.vendaS), "Preço Venda s/IVA", n.vendaS === null ? " na" : "")}
       ${fk(eurOrDash(n.vendaC), "Preço Venda c/IVA", n.vendaC === null ? " na" : "")}
       ${fk(pctOrDash(n.foodCostPct), "Food Cost %", n.foodCostPct === null ? " na" : (n.foodCostPct ?? 0) > 0.35 ? " warnv" : "")}
       ${fk(eurOrDash(n.grossMarginEur), "Margem Bruta €", n.grossMarginEur === null ? " na" : "")}
       ${fk(pctOrDash(n.grossMarginPct), "Margem Bruta %", n.grossMarginPct === null ? " na" : "")}
       ${fk(markupFmt(n.markup), "Markup", n.markup === null ? " na" : "")}`
    : "";

  const quality = [
    n.costingComplete
      ? `<span class="chip ok">Costing ✓ completo</span>`
      : `<span class="chip warn">Costing ⚠ ${e(n.costingPending.slice(0, 2).join("; "))}${n.costingPending.length > 2 ? ` (+${n.costingPending.length - 2})` : ""}</span>`,
    n.allergenComplete
      ? `<span class="chip ok">Alergénios ✓ completos</span>`
      : `<span class="chip warn">Alergénios ⚠ ${n.allergenPending.length} por validar</span>`,
    gfChip(n.gf),
    showFinancials && n.foodCostPct !== null
      ? `<span class="chip ${tier.cls}">Food cost ${e(tier.label)}</span>`
      : "",
  ].join("");

  const headCost = isBatch
    ? `${eur(n.portionCost)} <small style="opacity:.7">/ dose</small>`
    : `${eur(n.total)}${n.baseLabel ? ` <small style="opacity:.7">/ ${e(n.baseLabel)}</small>` : ""}`;

  // V3: fichas grandes podiam partir. V3.1: nunca partem — as que não cabem
  // levam uma escala própria, medida e registada em FICHA_SCALES.
  const longClass = LAYOUT === "readable-tight" ? "" : n.rows.length > 8 ? " ficha-long" : "";
  const roleClass = showFinancials ? " ficha-menu-item" : " ficha-garnish";
  const domId = `ficha-${n.nodeId.replace(/[^A-Za-z0-9]/g, "-")}`;
  const fit = FICHA_SCALES[domId];
  const styles: string[] = [];
  if (LAYOUT === "readable-tight" && fit) {
    if (fit.scale < 1) styles.push(`--ficha-scale:${fit.scale}`);
    if (fit.density < 1) styles.push(`--ficha-density:${fit.density}`);
  }
  const scaleAttr = styles.length > 0 ? ` style="${styles.join(";")}"` : "";
  return `<article class="ficha${longClass}${roleClass}" id="${e(domId)}"${scaleAttr}>
  <div class="ficha-head"><h4>${e(n.menuItem ?? n.sheetName)}</h4><span class="base">${e(n.title || n.sheetName)}${isBatch ? " · receita de lote" : n.baseLabel ? ` · ${e(n.baseLabel)}` : ""}</span>
    <span class="cost">${headCost}</span></div>
  <div class="ficha-body">
    ${
      isBatch
        ? `<div class="callout" style="margin-top:0"><strong>Receita de lote.</strong> Os ingredientes abaixo produzem
      <strong>${n.yieldQuantity} ${e(n.yieldUnit ?? "doses")}</strong>. O custo que entra no menu é o custo por dose
      (${eur(n.total)} ÷ ${n.yieldQuantity} = <strong>${eur(n.portionCost)}</strong>), não o custo do lote.</div>`
        : ""
    }
    <div class="ficha-kpis">
      ${fk(eur(n.total), isBatch ? "Custo total do lote s/IVA" : "Custo Mercadoria s/IVA")}
      ${financials}
    </div>
    <div class="alg-row"><span class="lbl">Alergénios</span>${
      n.allergens.length > 0
        ? n.allergens.map(allergenBadge).join("")
        : `<span class="chip info">nenhum declarado</span>`
    }${n.allergenComplete ? "" : `<span class="chip warn">⚠ perfil incompleto</span>`}</div>
    <div class="tbl-wrap"><table>
      <thead><tr><th>Ingrediente</th><th class="num">Qtd</th><th>Un</th>
      <th class="num">Preço s/IVA</th><th class="num">IVA</th><th class="num">Custo</th></tr></thead>
      <tbody>${rows || `<tr><td colspan="6"><em>Ficha sem ingredientes registados.</em></td></tr>`}</tbody>
      <tfoot><tr><td colspan="5" style="text-align:right">${isBatch ? "Custo total do lote s/Iva" : "Custo Mercadoria s/Iva"}</td>
      <td class="num">${eur(n.total, 4)}</td></tr>${
        isBatch
          ? `<tr><td colspan="5" style="text-align:right">Custo por dose s/Iva (÷ ${n.yieldQuantity})</td>
      <td class="num">${eur(n.portionCost, 4)}</td></tr>`
          : ""
      }</tfoot>
    </table></div>
    ${n.usedIn.length > 0 ? `<div class="used-in"><strong>Utilizada em:</strong> ${n.usedIn.map(e).join(" · ")}</div>` : ""}
    <div class="ficha-foot">${quality}</div>
  </div>
</article>`;
}

function menuFichasSection(m: ReportModel): string {
  const categories = [...new Set(m.menuNodes.map((n) => n.category ?? "Outros"))];
  const blocks = categories
    .map((cat) => {
      const list = m.menuNodes.filter((n) => (n.category ?? "Outros") === cat);
      return `<h3>${e(cat)} · ${list.length} fichas</h3>${list.map((n) => fichaCard(n, true)).join("")}`;
    })
    .join("");
  return `<section id="sec-12">${secHead("12", "Fichas Técnicas — Itens do Menu", `${m.menuNodes.length} fichas`)}
  <p class="lead">Cada ficha replica os valores oficiais dos workbooks em
  <code>technical-sheets/menu-items/</code> após o linking de preços. Ingredientes marcados como
  subreceita usam o Custo Mercadoria s/Iva da respetiva ficha — os seus ingredientes não são somados de novo.</p>
  ${blocks}
</section>`;
}

function garnishSection(m: ReportModel): string {
  const impact = new Map(m.analysis.subrecipeImpact.map((s) => [s.nodeId, s]));
  const rows = [...m.garnishNodes, ...m.internalNodes]
    .map((n) => {
      const imp = impact.get(n.nodeId);
      return `<tr>
      <td><strong>${e(n.sheetName)}</strong><br><span class="note" style="margin:0"><code>${e(n.nodeId)}</code></span></td>
      <td>${e(n.baseLabel)}</td>
      <td class="num">${eur(n.total)}</td>
      <td class="num">${n.rows.length}</td>
      <td class="num">${imp?.usedInMenuItems.length ?? 0}</td>
      <td>${imp && imp.usedInMenuItems.length > 0 ? e(imp.usedInMenuItems.slice(0, 5).join(", ")) + (imp.usedInMenuItems.length > 5 ? ` +${imp.usedInMenuItems.length - 5}` : "") : "—"}</td>
      <td>${n.allergens.map((a) => `<b>${a}</b>`).join(" ") || "—"}</td>
      <td>${gfChip(n.gf)}</td>
    </tr>`;
    })
    .join("");
  return `<section id="sec-13">${secHead("13", "Guarnições & Subreceitas", `${m.garnishNodes.length + m.internalNodes.length} preparações`)}
  <p class="lead">Preparações internas que alimentam os itens do menu. O custo apresentado é o
  <em>Custo Mercadoria s/Iva</em> da própria ficha; quando a preparação entra noutra ficha, é este o
  custo herdado — nunca se voltam a somar os ingredientes.</p>
  <div class="tbl-wrap"><table class="wide">
    <thead><tr><th>Preparação</th><th>Base</th><th class="num">Custo s/IVA</th><th class="num">Ingr.</th>
    <th class="num">Itens do menu</th><th>Utilizada em</th><th>Alergénios</th><th>Estado GF</th></tr></thead>
    <tbody>${rows}</tbody></table></div>
  <h3>Fichas completas</h3>
  ${[...m.garnishNodes, ...m.internalNodes].map((n) => fichaCard(n, false)).join("")}
</section>`;
}

// -------------------------------------------------------------- methodology

function methodology(m: ReportModel): string {
  return `<section id="sec-14">${secHead("14", "Metodologia e Limitações")}
  <div class="two-col">
  <div>
    <h4 class="sub-head">Costing</h4>
    <p class="note">Todos os custos de mercadoria usam valores <strong>sem IVA</strong>.
    Custo de linha = Quantidade × Preço s/IVA; Custo Mercadoria s/Iva = soma dos custos das linhas.
    Nunca é usado «Preço c/IVA × Quantidade».</p>
    <h4 class="sub-head">Matérias-primas</h4>
    <p class="note">Preço e IVA provenientes do Preçário, resolvidos por nome com matching em camadas
    (exato → alias validado → normalizado inequívoco). Sem correspondência inequívoca, a linha fica
    sem preço e é reportada — nunca se estima.</p>
    <h4 class="sub-head">Guarnições e subreceitas</h4>
    <p class="note">Preço proveniente do <em>Custo Mercadoria s/Iva</em> da respetiva ficha. Dentro do
    mesmo workbook a ligação é uma fórmula Excel real (ex.: <code>='Sú'!G9</code>); entre workbooks o
    valor é gerido pelo script (sem external links frágeis). Recursividade suportada com ordenação
    topológica e deteção de ciclos. Doses vs lotes: uma referência dentro da própria folha resolve
    para o lote (ex.: 0,12 kg do arroz de 1 kg); de fora, resolve para a dose.</p>
    <h4 class="sub-head">Preço de venda e IVA</h4>
    <p class="note">Preços c/IVA provenientes do menu em vigor. Preço Venda s/IVA = Preço c/IVA ÷ 1,13,
    conforme as fórmulas das próprias fichas técnicas (taxa de restauração 13%). O IVA de compra dos
    ingredientes é informação separada e nunca entra no custo.</p>
  </div>
  <div>
    <h4 class="sub-head">Indicadores financeiros</h4>
    <p class="note">
      <strong>Food Cost %</strong> = Custo Mercadoria s/IVA ÷ Preço Venda s/IVA.<br>
      <strong>Margem Bruta sobre Mercadoria €</strong> = Preço Venda s/IVA − Custo Mercadoria s/IVA.<br>
      <strong>Margem Bruta %</strong> = Margem Bruta € ÷ Preço Venda s/IVA.<br>
      <strong>Markup</strong> = Preço Venda s/IVA ÷ Custo Mercadoria s/IVA.<br>
      <strong>Margem de Contribuição Simplificada sobre Mercadoria</strong> = Preço Venda s/IVA −
      Custo Mercadoria s/IVA. Nesta fase coincide numericamente com a Margem Bruta €, porque ainda não
      estão integrados outros custos variáveis; não é uma contribution margin contabilística completa.
    </p>
    <h4 class="sub-head">Alergénios e Gluten Free</h4>
    <p class="note">Perfis por ingrediente em <code>mappings/ingredient-allergens.json</code>
    (14 alergénios UE), propagados hierarquicamente ingrediente → subreceita → item final, sem
    duplicados. Ingredientes processados sem rotulagem validada marcam o perfil como incompleto —
    nunca se assume ausência de alergénio pelo nome. «GF✱» exige perfil completo e zero fontes de
    glúten, e permanece sujeito a validação operacional de contaminação cruzada.</p>
    <h4 class="sub-head">Escala analítica de food cost</h4>
    <p class="note">Excelente &lt; 25% · Controlado 25–30% · Atenção 30–35% · Elevado &gt; 35%.
    <strong>Indicador analítico</strong> — não é política oficial RIBBAÍ enquanto não for formalmente adotada.</p>
    <h4 class="sub-head">Rastreabilidade</h4>
    <p class="note">Versões: Preçário <code>${e(m.versions.priceList)}</code>, Menu
    <code>${e(m.versions.menu)}</code>, Fichas técnicas <code>${e(m.versions.technicalSheets)}</code>.
    A auditoria linha-a-linha está em <code>reports/${e(m.generatedDate)}_costing-update-report.md</code>.</p>
  </div>
  </div>

  <div class="callout warn"><strong>Âmbito da análise financeira.</strong> Os indicadores deste
  relatório avaliam a economia do menu através de food cost, preço de venda e margem bruta sobre
  mercadoria. <strong>Não devem ser interpretados como rentabilidade líquida do restaurante</strong>,
  porque não incluem mão de obra e encargos sociais, energia, renda e ocupação, comissões e taxas de
  pagamento, manutenção, desperdício, consumíveis, seguros, amortizações nem impostos. Termos como
  lucro líquido, resultado operacional ou EBITDA não são aplicáveis a estas métricas.</div>

  <h4 class="sub-head">Fase seguinte — dados necessários</h4>
  <p class="note">A arquitetura está preparada para receber, sem reconstrução: unidades vendidas e
  receita por item (POS), número de tickets e mix de vendas, desperdício, custo de mão de obra,
  consumíveis, comissões de pagamento e restantes custos operacionais. Com esses dados torna-se
  possível calcular sales mix, contribuição total por item (unidades × margem bruta unitária),
  verdadeiro Menu Engineering (Star/Plowhorse/Puzzle/Dog), COGS, prime cost e rentabilidade
  operacional — que esta fase deliberadamente não estima.</p>
</section>`;
}

// -------------------------------------------------------------------- page

export function renderReport(m: ReportModel, layout: LayoutName = "portrait"): string {
  LAYOUT = layout;
  CHART = LAYOUTS[layout].chart;
  const suffix =
    layout === "landscape"
      ? " — V2 Landscape"
      : layout === "readable"
        ? " — V3 Landscape Extra Readable"
        : layout === "readable-tight"
          ? " — V3.1 Landscape Readable"
          : "";
  const isV2 = layout !== "portrait";
  const title = `RIBBAÍ — Kitchen Costing &amp; Menu Financial Health${suffix}`;
  return `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="Relatório executivo de costing da Cozinha RIBBAÍ${isV2 ? " — edição horizontal (A4 landscape), tipografia ampliada" : ""}.">
<meta name="generator" content="scripts/kitchen/generate-kitchen-report.ts (layout: ${layout})">
<style>${reportCss(layout)}</style>
</head>
<body>
<div class="sheet">
${cover(m)}
${toc()}
${execSummary(m)}
${healthSection(m)}
${dataQuality(m)}
${costAnalysis(m)}
${masterTable(m)}
${insights(m)}
${alertsSection(m)}
${reconciliation(m)}
${pricebookSection(m)}
${gfSection(m)}
${matrixSection(m)}
${menuFichasSection(m)}
${garnishSection(m)}
${methodology(m)}
<footer><span>RIBBAÍ — Kitchen Costing &amp; Menu Financial Health</span><span>${e(m.generatedDate)} · gerado por scripts/kitchen/generate-kitchen-report.ts</span></footer>
</div>
</body>
</html>`;
}
