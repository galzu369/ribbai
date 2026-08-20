import {
  ALLERGEN_NAMES,
  type AllergenCode,
  type GlutenStatus,
} from "./allergens";
import type { MenuAnalysis } from "./menu-analysis";
import type { Article } from "./pricebook";
import type { NodeRole } from "./subrecipes";

/**
 * Renderização do relatório executivo de Kitchen Costing em HTML autocontido
 * (CSS próprio, ícones e gráficos SVG inline, zero dependências externas).
 * Impressão A4 suportada via @media print.
 */

// ---------------------------------------------------------------- data model

export interface NodeRowView {
  name: string;
  qty: number | null;
  unit: string | null;
  price: number | null;
  iva: number | null;
  cost: number | null;
  kind: "raw" | "sub" | "nocost" | "pending";
  statusLabel: string;
  targetNode?: string;
  targetLabel?: string;
  flags: string[];
}

export interface NodeView {
  nodeId: string;
  workbook: string;
  sheetName: string;
  role: NodeRole;
  title: string;
  /** Rótulo de base: "1 kg", "dose", "15 doses"… */
  baseLabel: string;
  /** Custo Mercadoria s/Iva da ficha (para fichas de lote, é o LOTE inteiro). */
  total: number;
  /** Rendimento declarado, quando a ficha é um lote. */
  yieldQuantity: number | null;
  yieldUnit: string | null;
  /** Custo da unidade vendável (= total ÷ rendimento, ou total). */
  portionCost: number;
  vendaC: number | null;
  vendaS: number | null;
  foodCostPct: number | null;
  grossMarginEur: number | null;
  grossMarginPct: number | null;
  markup: number | null;
  menuItem: string | null;
  category: string | null;
  rows: NodeRowView[];
  allergens: AllergenCode[];
  allergenPending: { name: string; reason: string }[];
  allergenComplete: boolean;
  glutenSources: string[];
  gf: GlutenStatus;
  usedIn: string[];
  usesSubrecipes: string[];
  costingComplete: boolean;
  costingPending: string[];
}

export interface ReportModel {
  generatedDate: string;
  generatedDateTime: string;
  versions: {
    priceList: string;
    menu: string;
    technicalSheets: string;
    allergens: string;
    aliases: string;
  };
  pricebook: Article[];
  analysis: MenuAnalysis;
  nodes: NodeView[];
  menuNodes: NodeView[];
  garnishNodes: NodeView[];
  internalNodes: NodeView[];
  counts: {
    workbooks: number;
    blocks: number;
    ingredientRows: number;
    uniqueIngredients: number;
    subrecipeLinks: number;
  };
  quality: {
    priceLinkingPct: number;
    unmatchedIngredients: number;
    ambiguousIngredients: number;
    unitWarnings: number;
    missingQty: number;
  };
}

// -------------------------------------------------------------------- layout

/**
 * Duas variantes de apresentação sobre a MESMA fonte de dados:
 *  - portrait  (V1) — A4 vertical, layout compacto original;
 *  - landscape (V2) — A4 horizontal, tipografia maior e gráficos mais largos.
 * Só muda apresentação: nenhum número, secção ou cálculo difere entre as duas.
 */
export type LayoutName = "portrait" | "landscape" | "readable" | "readable-tight";

export interface ChartSpec {
  /** Largura dos gráficos que ocupam a linha toda. */
  width: number;
  /** Largura dos gráficos em two-col. */
  halfWidth: number;
  /** Espaço reservado aos nomes nos rankings horizontais. */
  labelWidth: number;
  labelWidthNarrow: number;
  /** Corpo dos rótulos e dos valores. */
  labelSize: number;
  valueSize: number;
  axisSize: number;
  rowHeight: number;
  /** Altura das colunas verticais e do scatter. */
  columnHeight: number;
  scatterHeight: number;
  /**
   * Máximo de barras por gráfico antes de o dividir em partes. Um ranking com
   * mais itens do que isto excede a altura de uma página; como os cartões têm
   * `break-inside: avoid`, o resultado seria uma página quase vazia seguida de
   * um gráfico transbordado. Dividir resolve na origem.
   */
  itemsPerChartPage?: number;
  /**
   * Altura de linha só para rankings divididos. Maior que a normal para o
   * gráfico encher a página em vez de deixar um terço em branco no fim.
   */
  longRankingRowHeight?: number;
}

export interface LayoutSpec {
  name: LayoutName;
  chart: ChartSpec;
}

export const LAYOUTS: Record<LayoutName, LayoutSpec> = {
  portrait: {
    name: "portrait",
    chart: {
      width: 780,
      halfWidth: 520,
      labelWidth: 205,
      labelWidthNarrow: 175,
      labelSize: 11,
      valueSize: 11,
      axisSize: 10.5,
      rowHeight: 21,
      columnHeight: 210,
      scatterHeight: 400,
    },
  },
  landscape: {
    name: "landscape",
    chart: {
      width: 1180,
      halfWidth: 560,
      labelWidth: 290,
      labelWidthNarrow: 215,
      labelSize: 13,
      valueSize: 13,
      axisSize: 12,
      rowHeight: 25,
      columnHeight: 250,
      scatterHeight: 440,
    },
  },
  // V3 — como a landscape, mas dimensionada para caber numa página A4
  // horizontal com margens de 9mm: rankings longos partidos em blocos.
  readable: {
    name: "readable",
    chart: {
      width: 1220,
      halfWidth: 590,
      labelWidth: 320,
      labelWidthNarrow: 240,
      labelSize: 13.5,
      valueSize: 13.5,
      axisSize: 12.5,
      rowHeight: 27,
      columnHeight: 300,
      scatterHeight: 600,
      itemsPerChartPage: 22,
    },
  },
  // V3.1 — como a V3, mas os rankings divididos enchem a página (24 barras a
  // 30px em vez de 16 a 27px, que deixavam um terço da página vazio).
  "readable-tight": {
    name: "readable-tight",
    chart: {
      width: 1220,
      halfWidth: 590,
      labelWidth: 320,
      labelWidthNarrow: 240,
      labelSize: 13.5,
      valueSize: 13.5,
      axisSize: 12.5,
      rowHeight: 27,
      columnHeight: 300,
      scatterHeight: 600,
      itemsPerChartPage: 24,
      // 26px deixa ~40px de folga para o cartão caber na mesma página do
      // cabeçalho da secção. A 30px o cartão ficava a ~2px do limite e o
      // Chrome desistia do break-inside:avoid, partindo-o ao meio.
      longRankingRowHeight: 26,
    },
  },
};

// ------------------------------------------------------------------- helpers

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// -------------------------------------------------------------- allergen svg

/** Ícones vetoriais 24×24, stroke currentColor — legíveis em monocromático. */
const ICON_PATHS: Record<AllergenCode, string> = {
  GL: '<path d="M12 21V7M12 7c-3-1-4-3.5-4-6 3 .5 4.5 2 4 6zm0 0c3-1 4-3.5 4-6-3 .5-4.5 2-4 6zM12 13c-3-1-4-3-4-5.5 3 .5 4.5 2 4 5.5zm0 0c3-1 4-3 4-5.5-3 .5-4.5 2-4 5.5z"/>',
  CR: '<path d="M6 5c6-2 12 1 12 7 0 4-3 7-7 7M11 19c-3 0-6-2-6-5M9 8c-2 .5-3.5 2-3.5 4M16 8l3-2M16 11l3.5-.5"/><circle cx="13.5" cy="9.5" r=".9" fill="currentColor" stroke="none"/>',
  EG: '<path d="M12 3.5c3.5 0 6.5 5.5 6.5 10a6.5 6.5 0 0 1-13 0c0-4.5 3-10 6.5-10z"/>',
  FI: '<path d="M3 12c3-4.5 7-6 11-6 3 0 5.5 2.5 7 6-1.5 3.5-4 6-7 6-4 0-8-1.5-11-6zM21 12l-3.5-4M21 12l-3.5 4"/><circle cx="8" cy="11" r=".9" fill="currentColor" stroke="none"/>',
  PN: '<path d="M9 3.5a4 4 0 0 0-3 6.5 4.5 4.5 0 0 0 3 7.5 4.5 4.5 0 0 0 6 2 4.5 4.5 0 0 0 3-6.5A4 4 0 0 0 15 6a4 4 0 0 0-6-2.5zM9.5 9.5c1 .8 2 .8 3 .2M11.5 14c1 .8 2 .8 3 .2"/>',
  SO: '<path d="M7 20c-2-6 2-13 10-16 1 8-2 14-8 16M9 12c1.5-1 4-1.5 6-1"/>',
  MK: '<path d="M9 3h6M9 3v3l-3 5v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9l-3-5V3M6.5 13h11"/>',
  NT: '<path d="M7 9c0-3 2-5.5 5-5.5S17 6 17 9M6 9h12v2c0 5-3 8.5-6 9.5C9 19.5 6 16 6 11V9z"/>',
  CE: '<path d="M9 21V9M15 21V9M9 9C7 8 6 6 6 3.5 8.5 4 10 6 9.5 9M15 9c2-1 3-3 3-5.5C15.5 4 14 6 14.5 9M12 21V11M12 11c-1-.8-1.5-2-1.5-3.5 1.5.4 2.3 1.6 1.5 3.5z"/>',
  MU: '<circle cx="8.5" cy="14" r="2.4"/><circle cx="15.5" cy="14" r="2.4"/><circle cx="12" cy="8" r="2.4"/>',
  SE: '<path d="M8 7c1.8 0 3 1.4 3 3.2S9.8 13 8 13s-3-1.2-3-3S6.2 7 8 7zM16 7c1.8 0 3 1.4 3 3.2S17.8 13 16 13s-3-1.2-3-3S14.2 7 16 7zM12 14c1.8 0 3 1.4 3 3.2S13.8 20 12 20s-3-1.2-3-3 1.2-3 3-3z"/>',
  SU: '<path d="M10 3h4M11 3v5l-5 9a2 2 0 0 0 1.8 3h8.4a2 2 0 0 0 1.8-3l-5-9V3"/><circle cx="10.5" cy="15.5" r=".9" fill="currentColor" stroke="none"/><circle cx="13.5" cy="12.5" r=".9" fill="currentColor" stroke="none"/>',
  LU: '<path d="M12 21v-8M12 13c-2.5 0-4-1.5-4-3.5C10 9.5 12 11 12 13zm0 0c2.5 0 4-1.5 4-3.5C14 9.5 12 11 12 13zm0-4c-2 0-3.2-1.2-3.2-3C10.5 6 12 7.2 12 9zm0 0c2 0 3.2-1.2 3.2-3C13.5 6 12 7.2 12 9zm0-3.5c-1.4 0-2.2-.9-2.2-2.5 1.5 0 2.2.9 2.2 2.5zm0 0c1.4 0 2.2-.9 2.2-2.5-1.5 0-2.2.9-2.2 2.5z"/>',
  MO: '<path d="M4 14a8 8 0 0 1 16 0l1.5 3H2.5L4 14zM12 6v11M8 7.5 10 17M16 7.5 14 17"/>',
};

export function allergenIcon(code: AllergenCode, size = 14): string {
  return `<svg class="alg-ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[code]}</svg>`;
}

export function allergenBadge(code: AllergenCode): string {
  const name = ALLERGEN_NAMES[code];
  return `<span class="alg-badge" role="img" title="${escapeHtml(name)}" aria-label="${escapeHtml(`${code} — ${name}`)}">${allergenIcon(code)}<b>${code}</b></span>`;
}

// -------------------------------------------------------------------- charts

const CH = {
  bar: "#2a78d6",
  barSoft: "#9ec5f4",
  critical: "#d03b3b",
  ink: "#0b0b0b",
  ink2: "#52514e",
  muted: "#898781",
  grid: "#e1e0d9",
  axis: "#c3c2b7",
};

export interface BarDatum {
  label: string;
  value: number;
  hint?: string;
  /** true = destacar como fora da banda analítica (cor de estado + marca "!"). */
  flagged?: boolean;
}

/** Ranking horizontal — barras finas, extremidade arredondada, rótulos diretos. */
export function hBarChart(
  data: BarDatum[],
  opts: {
    valueFmt: (n: number) => string;
    ariaLabel: string;
    labelWidth?: number;
    width?: number;
    /**
     * Limite da escala. Valores acima são desenhados até ao limite com marca de
     * corte (⇥) — impede que um outlier extremo esmague todas as outras barras.
     * O rótulo mostra sempre o valor real.
     */
    clampAt?: number;
    /** Dimensões e corpo de letra do layout ativo. */
    spec?: ChartSpec;
    /**
     * Força o máximo da escala. Usado quando um ranking é dividido em partes,
     * para que todas partilhem a mesma escala e continuem comparáveis.
     */
    scaleMax?: number;
  },
): string {
  const spec = opts.spec ?? LAYOUTS.portrait.chart;
  const labelW = opts.labelWidth ?? spec.labelWidth;
  const valueW = Math.round(82 * (spec.valueSize / 11));
  const rowH = spec.rowHeight;
  const w = opts.width ?? spec.width;
  const plotW = w - labelW - valueW - 14;
  const h = data.length * rowH + 8;
  const rawMax = opts.scaleMax ?? Math.max(...data.map((d) => d.value), 0);
  const rawMin = Math.min(...data.map((d) => d.value), 0);
  const max =
    opts.clampAt !== undefined && rawMax > opts.clampAt ? opts.clampAt : rawMax;
  // eixo bidirecional quando existem valores negativos: o zero deixa de estar na
  // margem esquerda e as barras negativas crescem para a esquerda.
  const span = max - rawMin || 1;
  const zeroX = labelW + ((0 - rawMin) / span) * plotW;
  const scale = (v: number): number => (v / span) * plotW;

  const parts: string[] = [];
  data.forEach((d, i) => {
    const y = 4 + i * rowH;
    const clipped = d.value > max;
    const cy = y + rowH / 2;
    const color = d.flagged || d.value < 0 ? CH.critical : CH.bar;
    const rawLen = clipped ? labelW + plotW - zeroX : scale(d.value);
    const len = Math.max(Math.abs(rawLen), 2);
    const x = d.value < 0 ? zeroX - len : zeroX;
    // rótulo sempre do lado livre do eixo: à direita do zero para barras
    // negativas (evita colidir com a coluna de nomes), à direita da barra
    // para as positivas.
    const labelX = d.value < 0 ? zeroX + 7 : x + len + 7;
    const anchor = "start";
    const title = escapeHtml(
      `${d.label}: ${opts.valueFmt(d.value)}${d.hint ? ` — ${d.hint}` : ""}${clipped ? " (barra cortada na escala)" : ""}`,
    );
    const barH = Math.max(9, Math.round(spec.rowHeight * 0.43));
    parts.push(
      `<g><title>${title}</title>` +
        `<text x="${labelW - 9}" y="${cy + 4}" text-anchor="end" font-size="${spec.labelSize}" fill="${CH.ink2}">${escapeHtml(d.label)}</text>` +
        `<rect x="${x.toFixed(1)}" y="${(cy - barH / 2).toFixed(1)}" width="${len.toFixed(1)}" height="${barH}" rx="4" fill="${color}"/>` +
        (clipped
          ? `<path d="M${(x + len - 7).toFixed(1)} ${(cy - 6).toFixed(1)} l5 6 l-5 6" fill="none" stroke="#fcfcfb" stroke-width="2"/>`
          : "") +
        `<text x="${labelX.toFixed(1)}" y="${cy + 4}" text-anchor="${anchor}" font-size="${spec.valueSize}" fill="${CH.ink}" style="font-variant-numeric:tabular-nums">${escapeHtml(opts.valueFmt(d.value))}${d.flagged ? " !" : ""}</text>` +
        `</g>`,
    );
  });
  return (
    `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="${escapeHtml(opts.ariaLabel)}" font-family="system-ui,-apple-system,'Segoe UI',sans-serif">` +
    `<line x1="${zeroX.toFixed(1)}" y1="2" x2="${zeroX.toFixed(1)}" y2="${h - 2}" stroke="${CH.axis}" stroke-width="1"/>` +
    parts.join("") +
    `</svg>`
  );
}

/** Distribuição — colunas verticais com rótulos diretos. */
export function columnChart(
  data: BarDatum[],
  opts: { ariaLabel: string; unitLabel: string; width?: number; spec?: ChartSpec },
): string {
  const spec = opts.spec ?? LAYOUTS.portrait.chart;
  const w = opts.width ?? spec.halfWidth;
  const h = spec.columnHeight;
  const padL = 10;
  const padB = 34;
  const padT = 22;
  const slot = (w - padL * 2) / data.length;
  const barW = Math.min(slot * 0.55, 64);
  const max = Math.max(...data.map((d) => d.value), 1);
  const parts: string[] = [];
  data.forEach((d, i) => {
    const x = padL + i * slot + (slot - barW) / 2;
    const bh = Math.max((d.value / max) * (h - padT - padB), d.value > 0 ? 3 : 0);
    const y = h - padB - bh;
    parts.push(
      `<g><title>${escapeHtml(`${d.label}: ${d.value} ${opts.unitLabel}`)}</title>` +
        (d.value > 0
          ? `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${bh.toFixed(1)}" rx="4" fill="${d.flagged ? CH.critical : CH.bar}"/>`
          : "") +
        `<text x="${(x + barW / 2).toFixed(1)}" y="${y - 6}" text-anchor="middle" font-size="${spec.valueSize + 1}" fill="${CH.ink}" style="font-variant-numeric:tabular-nums">${d.value}</text>` +
        `<text x="${(x + barW / 2).toFixed(1)}" y="${h - padB + 16}" text-anchor="middle" font-size="${spec.labelSize}" fill="${CH.muted}">${escapeHtml(d.label)}</text>` +
        `</g>`,
    );
  });
  return (
    `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="${escapeHtml(opts.ariaLabel)}" font-family="system-ui,-apple-system,'Segoe UI',sans-serif">` +
    `<line x1="${padL}" y1="${h - padB}" x2="${w - padL}" y2="${h - padB}" stroke="${CH.axis}" stroke-width="1"/>` +
    parts.join("") +
    `</svg>`
  );
}

export interface ScatterDatum {
  label: string;
  x: number;
  y: number;
  flagged?: boolean;
}

/** Dispersão custo × preço, com linhas-guia de food cost de referência. */
export function scatterChart(
  data: ScatterDatum[],
  opts: {
    ariaLabel: string;
    xLabel: string;
    yLabel: string;
    guides?: { ratio: number; label: string }[];
    spec?: ChartSpec;
  },
): string {
  const spec = opts.spec ?? LAYOUTS.portrait.chart;
  const w = spec.width;
  const h = spec.scatterHeight;
  const padL = 56;
  const padR = 16;
  const padT = 16;
  const padB = 44;
  const maxX = Math.max(...data.map((d) => d.x), 1) * 1.08;
  const maxY = Math.max(...data.map((d) => d.y), 1) * 1.08;
  const px = (x: number): number => padL + (x / maxX) * (w - padL - padR);
  const py = (y: number): number => h - padB - (y / maxY) * (h - padT - padB);

  const parts: string[] = [];
  // grelha
  for (let i = 0; i <= 4; i++) {
    const gy = padT + ((h - padT - padB) / 4) * i;
    const val = maxY - (maxY / 4) * i;
    parts.push(
      `<line x1="${padL}" y1="${gy.toFixed(1)}" x2="${w - padR}" y2="${gy.toFixed(1)}" stroke="${CH.grid}" stroke-width="1"/>` +
        `<text x="${padL - 8}" y="${(gy + 4).toFixed(1)}" text-anchor="end" font-size="${spec.axisSize}" fill="${CH.muted}" style="font-variant-numeric:tabular-nums">${val.toFixed(0)} €</text>`,
    );
  }
  for (let i = 0; i <= 5; i++) {
    const gx = padL + ((w - padL - padR) / 5) * i;
    const val = (maxX / 5) * i;
    parts.push(
      `<text x="${gx.toFixed(1)}" y="${h - padB + 16}" text-anchor="middle" font-size="${spec.axisSize}" fill="${CH.muted}" style="font-variant-numeric:tabular-nums">${val.toFixed(1)} €</text>`,
    );
  }
  // guias de food cost (y = x / ratio)
  for (const guide of opts.guides ?? []) {
    const x2 = Math.min(maxX, maxY * guide.ratio);
    const y2 = x2 / guide.ratio;
    parts.push(
      `<line x1="${px(0)}" y1="${py(0)}" x2="${px(x2).toFixed(1)}" y2="${py(y2).toFixed(1)}" stroke="${CH.axis}" stroke-width="1" stroke-dasharray="4 3"/>` +
        `<text x="${px(x2).toFixed(1)}" y="${(py(y2) - 6).toFixed(1)}" text-anchor="end" font-size="${spec.axisSize}" fill="${CH.muted}">${escapeHtml(guide.label)}</text>`,
    );
  }
  // pontos
  for (const d of data) {
    const cx = px(d.x);
    const cy = py(d.y);
    parts.push(
      `<g><title>${escapeHtml(`${d.label}: custo ${d.x.toFixed(2)} €, venda s/IVA ${d.y.toFixed(2)} €`)}</title>` +
        `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${Math.max(5, Math.round(spec.labelSize * 0.45))}" fill="${d.flagged ? CH.critical : CH.bar}" stroke="#fcfcfb" stroke-width="2"/>` +
        `</g>`,
    );
  }
  return (
    `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="${escapeHtml(opts.ariaLabel)}" font-family="system-ui,-apple-system,'Segoe UI',sans-serif">` +
    parts.join("") +
    `<line x1="${padL}" y1="${h - padB}" x2="${w - padR}" y2="${h - padB}" stroke="${CH.axis}" stroke-width="1"/>` +
    `<line x1="${padL}" y1="${padT}" x2="${padL}" y2="${h - padB}" stroke="${CH.axis}" stroke-width="1"/>` +
    `<text x="${w / 2}" y="${h - 6}" text-anchor="middle" font-size="${spec.labelSize}" fill="${CH.ink2}">${escapeHtml(opts.xLabel)}</text>` +
    `<text x="14" y="${h / 2}" text-anchor="middle" font-size="${spec.labelSize}" fill="${CH.ink2}" transform="rotate(-90 14 ${h / 2})">${escapeHtml(opts.yLabel)}</text>` +
    `</svg>`
  );
}

// ----------------------------------------------------------------------- css

/**
 * Perfis tipográficos da V3, testados progressivamente: escolhe-se o maior que
 * passe em paginação, overflow e clipping (ver `TYPO_PROFILE`).
 */
export interface TypoProfile {
  id: "A" | "B" | "C";
  body: number;
  lead: number;
  table: number;
  tableHead: number;
  note: number;
  ficha: number;
  fichaTitle: number;
  kpiValue: number;
  kpiLabel: number;
  badge: number;
  matrix: number;
  toc: number;
}

export const TYPO_PROFILES: Record<"A" | "B" | "C", TypoProfile> = {
  A: { id: "A", body: 13.5, lead: 14, table: 12.75, tableHead: 11.75, note: 12.25, ficha: 13.5, fichaTitle: 21, kpiValue: 26, kpiLabel: 12, badge: 12, matrix: 13, toc: 14 },
  B: { id: "B", body: 13.75, lead: 14.25, table: 13, tableHead: 12, note: 12.5, ficha: 13.75, fichaTitle: 22, kpiValue: 28, kpiLabel: 12.5, badge: 12.25, matrix: 13.25, toc: 14.25 },
  C: { id: "C", body: 14, lead: 14.5, table: 13.25, tableHead: 12.25, note: 12.75, ficha: 14, fichaTitle: 23, kpiValue: 29, kpiLabel: 13, badge: 12.5, matrix: 13.5, toc: 14.5 },
};

/** Perfil ativo da V3 — alterável por variável de ambiente durante os testes. */
export const TYPO_PROFILE: TypoProfile =
  TYPO_PROFILES[(process.env.KITCHEN_TYPO ?? "C") as "A" | "B" | "C"] ?? TYPO_PROFILES.C;

export function reportCss(layout: LayoutName = "portrait"): string {
  if (layout === "landscape") return baseCss() + landscapeCss();
  if (layout === "readable") return baseCss() + landscapeCss() + readableCss(TYPO_PROFILE);
  if (layout === "readable-tight") {
    return baseCss() + landscapeCss() + readableCss(TYPO_PROFILE) + tightCss(TYPO_PROFILE);
  }
  return baseCss();
}

/**
 * V3.1 — duas regras rígidas sobre a V3:
 *  1. cada ficha técnica cabe inteira numa página, nunca é dividida. As poucas
 *     que não cabem levam uma escala própria (`--ficha-scale`), aplicada só a
 *     elas: fontes e espaçamentos encolhem em conjunto via calc(), sem
 *     `transform: scale` (que deixaria caixas fantasma e texto desfocado);
 *  2. os rankings divididos enchem a página em vez de deixar um terço vazio.
 */
function tightCss(t: TypoProfile): string {
  return `
/* ============ V3.1 — FICHAS INDIVISÍVEIS ============ */
/* --ficha-scale governa a TIPOGRAFIA; --ficha-density governa o ESPAÇAMENTO.
   Separá-los permite apertar espaços numa ficha densa sem descer a letra
   abaixo do mínimo legível. */
.ficha{--ficha-scale:1;--ficha-density:1}
.ficha-head{padding:calc(13px * var(--ficha-density)) calc(20px * var(--ficha-scale))}
.ficha-head h4{font-size:calc(${t.fichaTitle + 1}px * var(--ficha-scale))}
.ficha-head .base{font-size:calc(12.5px * var(--ficha-scale))}
.ficha-head .cost{font-size:calc(17px * var(--ficha-scale))}
.ficha-body{padding:calc(14px * var(--ficha-density)) calc(20px * var(--ficha-scale)) calc(15px * var(--ficha-density))}
.ficha-kpis{gap:calc(26px * var(--ficha-scale));padding-bottom:calc(12px * var(--ficha-density));
  margin-bottom:calc(12px * var(--ficha-density))}
.ficha-kpis .fk .v{font-size:calc(17px * var(--ficha-scale))}
.ficha-kpis .fk .l{font-size:calc(12px * var(--ficha-scale))}
.ficha .alg-row{margin:calc(2px * var(--ficha-density)) 0 calc(9px * var(--ficha-density))}
.ficha .alg-badge{font-size:calc(12.5px * var(--ficha-scale))}
.ficha table{font-size:calc(${t.ficha}px * var(--ficha-scale))}
.ficha table th{font-size:calc(12.5px * var(--ficha-scale))}
.ficha table td,.ficha table th{padding:calc(7px * var(--ficha-density)) calc(9px * var(--ficha-scale));
  line-height:calc(1.55 - (1 - var(--ficha-density)) * 0.35)}
.ficha .sub-tag{font-size:calc(12.5px * var(--ficha-scale))}
.ficha .used-in{font-size:calc(12.5px * var(--ficha-scale));margin-top:calc(9px * var(--ficha-density))}
.ficha .ficha-foot{margin-top:calc(10px * var(--ficha-density));gap:calc(7px * var(--ficha-scale))}
.ficha .callout{font-size:calc(13px * var(--ficha-scale));padding:calc(12px * var(--ficha-density)) calc(16px * var(--ficha-scale));
  margin:calc(11px * var(--ficha-density)) 0}
@media print{
  /* a regra de padding da V3 estava a vazar para impressão e a roubar 100px de
     largura útil; em papel a folha não tem padding próprio */
  .sheet{padding:0;max-width:none;width:100%}
  /* indivisível, sem exceções — anula a regra .ficha-long da V3 */
  .ficha,.ficha-long{break-inside:avoid-page !important;page-break-inside:avoid !important}
  /* uma ficha de item de menu por página… */
  .ficha-menu-item{break-before:page;page-break-before:always}
  /* …exceto a que vem logo a seguir a um cabeçalho: sem esta exceção o
     break-before forçado anula o break-after:avoid do título e deixa-o sozinho
     numa página (era o caso de "Tostas · 6 fichas", com 4% de ocupação). */
  h3 + .ficha-menu-item,
  p.lead + .ficha-menu-item,
  .sec-head + .ficha-menu-item{break-before:auto;page-break-before:auto}
  /* guarnições podem partilhar página desde que ambas caibam inteiras */
  .ficha-garnish{break-before:auto;page-break-before:auto}
}
`;
}

/**
 * V3 — assenta na V2 e sobe a tipografia, apertando espaçamento em vez de
 * encolher letra. As regras de paginação são seletivas: só o que cabe numa
 * página é que leva `break-inside: avoid`.
 */
function readableCss(t: TypoProfile): string {
  return `
/* ============ V3 — LANDSCAPE EXTRA READABLE (perfil ${t.id}) ============ */
body{font-size:${t.body + 1.5}px;line-height:1.55}
:root{--muted:#7d7b75;--ink2:#494845}
.sheet{max-width:1460px;padding:44px 50px}
section{margin-top:38px}
.sec-head{padding-bottom:8px;margin-bottom:16px}
h3{margin:20px 0 10px}
p.lead{font-size:${t.lead + 1}px}
.note{font-size:${t.note + 0.5}px}
.callout{font-size:${t.body}px;padding:12px 16px;margin:11px 0}
.toc a{font-size:${t.toc}px}
.legend-grid .li{font-size:${t.matrix + 0.5}px}
.kpi{padding:14px 16px}
.kpi .v{font-size:${t.kpiValue}px}
.kpi .l{font-size:${t.kpiLabel}px;letter-spacing:.04em}
table{font-size:${t.table + 0.5}px}
th{font-size:${t.tableHead + 0.5}px;letter-spacing:.03em}
/* tabelas largas: apertar o espaçamento horizontal em vez de encolher a letra */
table.wide td,table.wide th,table.dense td,table.dense th{padding:7px 4px}
.tbl-wrap table.wide td:first-child,.tbl-wrap table.wide th:first-child{min-width:228px;width:auto}
table.dense th{letter-spacing:0}
/* colunas estreitas por natureza: não desperdiçar largura nelas */
table.dense td:not(:first-child),table.dense th:not(:first-child){white-space:nowrap}
.matrix td,.matrix th{font-size:${t.matrix + 0.5}px}
.matrix td:first-child,.matrix th:first-child{font-size:${t.matrix + 1}px;min-width:230px}
.matrix .dot{width:11px;height:11px}
.alg-badge{font-size:${t.badge}px}
.chip{font-size:${t.badge - 0.5}px}
.ficha{margin-top:18px}
.ficha-head h4{font-size:${t.fichaTitle + 1}px}
.ficha-kpis{gap:26px}
.ficha table{font-size:${t.ficha}px}
.chart-card{padding:15px 17px;margin-top:14px}
.chart-card h4{font-size:${t.body + 2}px}
.chart-card .sub{font-size:${t.note + 0.5}px;margin-bottom:10px}
.chart-legend{font-size:${t.note + 0.5}px}
/* valores financeiros e códigos nunca partem a meio */
td.num,th.num,.chip,.alg-badge b{white-space:nowrap}
td,th{overflow-wrap:normal;word-break:normal;hyphens:none}
@media print{
  body{font-size:${t.body}px;line-height:1.5}
  p.lead{font-size:${t.lead}px}
  .note{font-size:${t.note}px}
  .callout{font-size:${t.body}px}
  table{font-size:${t.table}px}
  th{font-size:${t.tableHead}px}
  .matrix td,.matrix th{font-size:${t.matrix}px}
  .matrix td:first-child,.matrix th:first-child{font-size:${t.matrix + 0.5}px}
  .alg-badge{font-size:${t.badge}px}
  .ficha table{font-size:${t.ficha}px}
  .ficha-head h4{font-size:${t.fichaTitle}px}
  .ficha-kpis .fk .v{font-size:17px}
  .ficha-kpis .fk .l{font-size:11.5px}
  .kpi .v{font-size:${t.kpiValue}px}
  .kpi .l{font-size:${t.kpiLabel}px}
  .toc a{font-size:${t.toc}px}
  section{margin-top:30px}
  /* paginação seletiva: nada maior que uma página leva "avoid" */
  .chart-block{break-inside:avoid;page-break-inside:avoid}
  .sec-head{break-after:avoid;page-break-after:avoid}
  /* break-after sozinho deixava o parágrafo partir-se ao meio: o Chrome
     cumpria a regra colando ao conteúdo seguinte apenas a última linha, e o
     título da secção ficava sozinho na página anterior (secção 12). Com o
     break-inside, sec-head + lead + h3 + primeira ficha viajam juntos. */
  p.lead{break-after:avoid;break-inside:avoid;page-break-inside:avoid}
  .tbl-wrap,section{break-inside:auto;page-break-inside:auto}
  .group-row{break-after:avoid;page-break-after:avoid}
  /* fichas que cabem numa página mantêm-se inteiras; as maiores partem de
     forma controlada, com o cabeçalho colado ao início (§20) */
  .ficha{break-inside:avoid;page-break-inside:avoid}
  .ficha-long{break-inside:auto;page-break-inside:auto}
  .ficha-long .ficha-head,.ficha-long .ficha-kpis{break-after:avoid;page-break-after:avoid}
  .ficha-long thead{display:table-header-group}
  p{orphans:3;widows:3}
}
@page{size:A4 landscape;margin:9mm 11mm}
`;
}

/**
 * Overrides da V2: A4 horizontal, tipografia maior e colunas mais largas.
 * Só toca em dimensões e corpo de letra — a paleta, as variáveis de cor e a
 * estrutura visual são exatamente as da V1.
 */
function landscapeCss(): string {
  return `
/* ============ V2 — A4 LANDSCAPE ============ */
body{font-size:15px;line-height:1.58}
.sheet{max-width:1400px;padding:48px 54px}
/* capa */
.cover{min-height:78vh}
.cover h1{font-size:50px}
.cover .sub{font-size:16px}
.cover .brand{font-size:16px}
.cover .meta{font-size:13.5px;line-height:2}
.cover .headline{gap:52px;margin-top:40px}
.cover .headline .v{font-size:33px}
.cover .headline .l{font-size:11.5px}
.cover .edition{margin-top:20px;font-size:12px;letter-spacing:.22em;text-transform:uppercase;
  color:var(--accent);border:1px solid var(--accent);border-radius:99px;padding:5px 16px;
  display:inline-block;align-self:center}
/* títulos */
.sec-head h2{font-size:30px}
.sec-head .num{font-size:14px}
.sec-head .right{font-size:13px}
h3{font-size:20px;margin:28px 0 13px}
h4.sub-head{font-size:15px}
p.lead{font-size:15.5px;max-width:110ch}
.note{font-size:12.5px;max-width:120ch}
.callout{font-size:13px;padding:13px 17px}
/* índice */
.toc{columns:2;column-gap:60px}
.toc a{font-size:15px;padding:8px 0}
.toc .n{font-size:13px;min-width:26px}
.legend-grid{grid-template-columns:repeat(3,1fr);gap:7px 30px}
.legend-grid .li{font-size:13.5px;padding:6px 0}
.legend-grid .li b{font-size:12.5px;min-width:28px}
/* kpis */
.kpis{gap:13px}
.kpis.k5{grid-template-columns:repeat(5,1fr)}
.kpi{padding:15px 17px}
.kpi .v{font-size:25px}
.kpi .v small{font-size:15px}
.kpi .l{font-size:12px}
.kpi .sub{font-size:12.5px}
/* tabelas */
table{font-size:13px}
th{font-size:11.5px;padding:8px 9px}
td{padding:7px 9px}
.group-row td{font-size:12px;padding:6px 9px}
.tbl-wrap table.wide td:first-child,.tbl-wrap table.wide th:first-child{min-width:230px;width:24%}
.tbl-wrap table.wide{min-width:0}
/* health */
.qrow{grid-template-columns:320px 1fr 70px;gap:16px;padding:8px 0}
.qrow .l{font-size:13px}
.qrow .v{font-size:13.5px}
.health .score{font-size:60px}
.health .comps{min-width:520px}
/* chips e badges */
.chip{font-size:11.5px;padding:2px 8px}
.alg-badge{font-size:11.5px;padding:2px 7px}
/* matriz */
.matrix td,.matrix th{font-size:12px;padding:6px 5px}
.matrix td:first-child,.matrix th:first-child{font-size:13px;min-width:250px}
.matrix .dot{width:10px;height:10px}
/* fichas */
.ficha{margin-top:22px}
.ficha-head{padding:13px 20px}
.ficha-head h4{font-size:21px}
.ficha-head .base{font-size:12px}
.ficha-head .cost{font-size:16.5px}
.ficha-body{padding:14px 20px 16px}
.ficha-kpis{gap:30px;padding-bottom:12px;margin-bottom:12px}
.ficha-kpis .fk .v{font-size:16.5px}
.ficha-kpis .fk .l{font-size:11.5px}
.ficha .alg-row .lbl{font-size:11px}
.sub-tag{font-size:11px}
.used-in{font-size:12.5px}
.ficha .tbl-wrap table td:first-child{min-width:220px}
/* insights e gráficos */
.two-col{gap:24px}
.insight{padding:4px 0 4px 16px;margin:16px 0}
.insight .fact,.insight .interp,.insight .reco{font-size:13px;margin-top:5px}
.chart-card{padding:17px 19px;margin-top:17px}
.chart-card h4{font-size:14.5px}
.chart-card .sub{font-size:12.5px;margin-bottom:13px}
.chart-legend{font-size:12.5px;gap:20px}
footer{font-size:11.5px}
@media (max-width:1100px){
  .sheet{padding:26px 20px}
  .legend-grid{grid-template-columns:repeat(2,1fr)}
  .kpis.k5{grid-template-columns:repeat(2,1fr)}
  .health .comps{min-width:0}
  .qrow{grid-template-columns:1fr 64px}
}
@page{size:A4 landscape;margin:10mm 12mm}
@media print{
  body{font-size:12.5px;line-height:1.5}
  .sheet{max-width:none;width:100%;padding:0}
  .cover{min-height:86vh}
  .cover h1{font-size:46px}
  .sec-head h2{font-size:28px}
  h3{font-size:19px}
  table{font-size:12.5px}
  th{font-size:11.5px}
  .note{font-size:12.5px}
  .callout{font-size:12.5px}
  .kpi .v{font-size:24px}
  .kpi .l{font-size:11.5px}
  .ficha-head h4{font-size:20px}
  .ficha-kpis .fk .v{font-size:16px}
  .matrix td,.matrix th{font-size:11.5px}
  /* fichas muito longas podem partir: melhor partir do que encolher a letra */
  .ficha{break-inside:auto;page-break-inside:auto}
  .ficha-head{break-after:avoid;page-break-after:avoid}
  .ficha-kpis{break-inside:avoid}
  .chart-card,.kpi,.callout,.health,.insight,tr{break-inside:avoid;page-break-inside:avoid}
}
`;
}

function baseCss(): string {
  return `
:root{
  --paper:#fcfcfb; --page:#f4f3f0; --ink:#141412; --ink2:#52514e; --muted:#898781;
  --hairline:#e1e0d9; --accent:#1e3d31; --accent-soft:#eef1ee; --data:#2a78d6;
  --good-text:#006300; --good-bg:#f0f8f0; --warn:#8a6100; --warn-bg:#fdf3dc;
  --crit:#8c2f2f; --crit-bg:#fbf0f0; --card-r:10px;
}
*{box-sizing:border-box;margin:0;padding:0}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{background:var(--page);color:var(--ink);
  font:13.5px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif;}
.sheet{max-width:1000px;margin:0 auto;background:var(--paper);
  padding:52px 60px;box-shadow:0 0 0 1px rgba(11,11,11,.06)}
h1,h2,h3,.serif{font-family:Georgia,"Times New Roman",serif;font-weight:400}
a{color:inherit}
code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:.9em;
  background:var(--page);padding:1px 4px;border-radius:3px}
/* ---------- cover ---------- */
.cover{min-height:86vh;display:flex;flex-direction:column;justify-content:center;text-align:center}
.cover .brand{font-size:15px;letter-spacing:.42em;color:var(--accent);text-transform:uppercase;margin-bottom:22px}
.cover h1{font-size:42px;line-height:1.15;letter-spacing:.01em}
.cover .rule{width:64px;height:2px;background:var(--accent);margin:28px auto}
.cover .sub{font-size:14px;color:var(--ink2);letter-spacing:.13em;text-transform:uppercase}
.cover .meta{margin-top:48px;color:var(--muted);font-size:12.5px;line-height:1.95}
.cover .meta b{color:var(--ink2);font-weight:600}
.cover .headline{margin-top:34px;display:flex;justify-content:center;gap:34px;flex-wrap:wrap}
.cover .headline div{text-align:center}
.cover .headline .v{font-size:27px;font-weight:600;color:var(--accent)}
.cover .headline .l{font-size:10.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.07em}
/* ---------- structure ---------- */
section{margin-top:56px}
.sec-head{display:flex;align-items:baseline;gap:14px;border-bottom:2px solid var(--accent);
  padding-bottom:9px;margin-bottom:20px}
.sec-head .num{font-size:12.5px;color:var(--accent);letter-spacing:.12em;font-weight:600}
.sec-head h2{font-size:25px}
.sec-head .right{margin-left:auto;font-size:12px;color:var(--muted)}
h3{font-size:17px;margin:24px 0 11px;color:var(--ink)}
h4.sub-head{font-size:13.5px;font-weight:600;margin:18px 0 8px;color:var(--accent);
  text-transform:uppercase;letter-spacing:.06em}
p.lead{color:var(--ink2);max-width:74ch;margin-bottom:14px}
.note{font-size:12px;color:var(--muted);max-width:80ch;margin-top:9px}
.callout{background:var(--accent-soft);border-left:3px solid var(--accent);
  padding:11px 15px;font-size:12.5px;color:var(--ink2);margin:13px 0;border-radius:0 6px 6px 0}
.callout.warn{background:var(--warn-bg);border-left-color:var(--warn);color:#5c430a}
.callout strong{color:inherit}
/* ---------- toc ---------- */
.toc{columns:2;column-gap:38px;margin-top:6px}
.toc a{display:flex;gap:10px;align-items:baseline;text-decoration:none;padding:6px 0;
  border-bottom:1px solid var(--hairline);break-inside:avoid;font-size:13px}
.toc .n{color:var(--accent);font-weight:600;font-size:11.5px;min-width:22px}
/* ---------- kpis ---------- */
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:11px}
.kpis.k3{grid-template-columns:repeat(3,1fr)}
.kpi{background:var(--paper);border:1px solid var(--hairline);border-radius:var(--card-r);padding:13px 15px}
.kpi .v{font-size:22px;font-weight:600;letter-spacing:-.01em;line-height:1.2}
.kpi .v small{font-size:13px;color:var(--muted);font-weight:400}
.kpi .l{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.055em;margin-top:3px}
.kpi .sub{font-size:11.5px;color:var(--ink2);margin-top:3px}
.kpi.na .v{color:var(--muted);font-weight:400}
.kpi.hi{border-color:var(--accent);background:var(--accent-soft)}
/* ---------- tables ---------- */
table{width:100%;border-collapse:collapse;font-size:12.3px}
th{font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);
  text-align:left;padding:7px 8px;border-bottom:2px solid var(--ink);font-weight:600}
td{padding:6px 8px;border-bottom:1px solid var(--hairline);vertical-align:top}
tr:last-child td{border-bottom:none}
td.num,th.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
tfoot td{border-top:1px solid var(--ink);border-bottom:none;font-weight:600}
.tbl-wrap{overflow-x:auto;border:1px solid var(--hairline);border-radius:var(--card-r);
  padding:3px 9px;background:var(--paper)}
.group-row td{background:var(--accent-soft);color:var(--accent);font-weight:600;
  font-size:11px;text-transform:uppercase;letter-spacing:.08em;padding:5px 8px}
/* primeira coluna das tabelas largas: evitar quebras agressivas do nome do item */
.tbl-wrap table.wide td:first-child,.tbl-wrap table.wide th:first-child{min-width:180px}
.tbl-wrap table.wide{min-width:880px}
tr.flagged td{background:var(--crit-bg)}
/* ---------- chips ---------- */
.chip{display:inline-flex;align-items:center;gap:4px;font-size:10.5px;font-weight:600;
  padding:1px 7px;border-radius:99px;border:1px solid;white-space:nowrap}
.chip.ok{color:var(--good-text);border-color:var(--good-text);background:var(--good-bg)}
.chip.warn{color:var(--warn);border-color:var(--warn);background:var(--warn-bg)}
.chip.info{color:var(--ink2);border-color:var(--hairline);background:var(--page)}
.chip.bad{color:var(--crit);border-color:#c98c8c;background:var(--crit-bg)}
/* ---------- allergens ---------- */
.alg-badge{display:inline-flex;align-items:center;gap:4px;border:1px solid var(--hairline);
  border-radius:6px;padding:1px 6px;font-size:10.5px;color:var(--ink2);background:var(--paper);margin:1px 2px 1px 0}
.alg-badge b{font-weight:700;letter-spacing:.03em}
.alg-ic{flex:none}
.legend-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:5px 24px;margin-top:11px}
.legend-grid .li{display:flex;align-items:center;gap:9px;font-size:12.5px;padding:4px 0;
  border-bottom:1px solid var(--hairline)}
.legend-grid .li b{font-size:11px;min-width:24px;color:var(--accent)}
/* ---------- matrix ---------- */
.matrix td,.matrix th{text-align:center;padding:5px 3px;font-size:11.5px}
.matrix td:first-child,.matrix th:first-child{text-align:left;white-space:nowrap;font-size:12px}
.matrix .dot{display:inline-block;width:9px;height:9px;border-radius:50%;background:var(--ink)}
/* ---------- ficha cards ---------- */
.ficha{border:1px solid var(--hairline);border-radius:var(--card-r);background:var(--paper);
  margin-top:18px;overflow:hidden;break-inside:avoid;page-break-inside:avoid}
.ficha-head{background:var(--accent);color:#f4f6f4;padding:11px 18px;
  display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}
.ficha-head h4{font-family:Georgia,serif;font-weight:400;font-size:18px;letter-spacing:.02em}
.ficha-head .base{font-size:11px;opacity:.72;letter-spacing:.09em;text-transform:uppercase}
.ficha-head .cost{margin-left:auto;font-size:14px;font-variant-numeric:tabular-nums}
.ficha-body{padding:12px 18px 14px}
.ficha-kpis{display:flex;gap:22px;flex-wrap:wrap;padding-bottom:10px;
  border-bottom:1px solid var(--hairline);margin-bottom:10px}
.ficha-kpis .fk .v{font-size:14.5px;font-weight:600;font-variant-numeric:tabular-nums}
.ficha-kpis .fk .v.na{color:var(--muted);font-weight:400}
.ficha-kpis .fk .v.warnv{color:var(--crit)}
.ficha-kpis .fk .l{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.055em}
.ficha .alg-row{display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin:2px 0 9px}
.ficha .alg-row .lbl{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-right:2px}
.sub-tag{display:block;font-size:10px;color:var(--accent);margin-top:1px}
.sub-tag.warnt{color:var(--warn)}
.ficha-foot{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}
.used-in{font-size:11.5px;color:var(--ink2);margin-top:9px}
/* ---------- bars ---------- */
.qrow{display:grid;grid-template-columns:250px 1fr 60px;gap:13px;align-items:center;
  padding:6px 0;border-bottom:1px solid var(--hairline)}
.qrow .l{font-size:12.5px;color:var(--ink2)}
.qbar{height:8px;border-radius:4px;background:var(--hairline);overflow:hidden}
.qbar i{display:block;height:100%;border-radius:4px;background:var(--data)}
.qrow .v{font-size:12.5px;font-weight:600;text-align:right;font-variant-numeric:tabular-nums}
/* ---------- health ---------- */
.health{display:flex;gap:26px;align-items:center;flex-wrap:wrap;
  border:1px solid var(--hairline);border-radius:var(--card-r);padding:18px 22px;background:var(--accent-soft)}
.health .score{font-size:52px;font-weight:600;color:var(--accent);line-height:1;font-variant-numeric:tabular-nums}
.health .score small{font-size:19px;color:var(--muted);font-weight:400}
.health .label{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-top:5px}
.health .comps{flex:1;min-width:320px}
/* ---------- charts ---------- */
.chart{width:100%;height:auto;display:block}
.chart-card{border:1px solid var(--hairline);border-radius:var(--card-r);background:var(--paper);
  padding:15px 17px;margin-top:15px;break-inside:avoid;page-break-inside:avoid}
.chart-card h4{font-size:13px;font-weight:600;margin-bottom:2px}
.chart-card .sub{font-size:11px;color:var(--muted);margin-bottom:11px}
.chart-legend{display:flex;gap:16px;flex-wrap:wrap;font-size:11px;color:var(--ink2);margin-top:9px}
.chart-legend span{display:inline-flex;align-items:center;gap:5px}
.chart-legend i{width:10px;height:10px;border-radius:50%;display:inline-block}
/* ---------- misc ---------- */
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:15px}
.insight{border-left:3px solid var(--data);padding:2px 0 2px 14px;margin:13px 0}
.insight .fact{font-size:12.5px;color:var(--ink)}
.insight .interp{font-size:12.5px;color:var(--ink2);margin-top:3px}
.insight .reco{font-size:12.5px;color:var(--accent);margin-top:3px;font-weight:500}
.tier{font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);font-weight:600}
footer{margin-top:64px;padding-top:13px;border-top:1px solid var(--hairline);
  display:flex;justify-content:space-between;color:var(--muted);font-size:11px;gap:12px;flex-wrap:wrap}
/* ---------- responsive ---------- */
@media (max-width:900px){
  .sheet{padding:26px 18px}
  .kpis,.kpis.k3{grid-template-columns:repeat(2,1fr)}
  .two-col{grid-template-columns:1fr}
  .toc{columns:1}
  .qrow{grid-template-columns:1fr 58px}
  .qrow .qbar{grid-column:1/-1}
  .cover h1{font-size:30px}
  .health{gap:16px}
}
/* ---------- print ---------- */
@page{size:A4;margin:12mm 11mm}
@media print{
  body{background:#fff;font-size:10.8px}
  .sheet{box-shadow:none;max-width:none;padding:0}
  .cover{min-height:90vh;page-break-after:always}
  section{margin-top:30px}
  .toc-sec{page-break-after:always}
  thead{display:table-header-group}
  tr,.kpi,.chart-card,.ficha,.callout,.health,.insight{page-break-inside:avoid;break-inside:avoid}
  .tbl-wrap{overflow:visible;border:none;padding:0}
  h2,h3,h4.sub-head{break-after:avoid}
  a{text-decoration:none}
  .no-print{display:none}
}
`;
}
