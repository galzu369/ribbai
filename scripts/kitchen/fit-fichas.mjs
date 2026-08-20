import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import puppeteer from "puppeteer";
import { fromRoot, KITCHEN_CONFIG, PROJECT_ROOT } from "./lib/project-root.mjs";

/**
 * Ajusta cada ficha técnica da V3.1 para caber numa única página.
 *
 * Mede a altura real de cada ficha no browser em modo de impressão e, para as
 * que excedem a altura útil de uma página A4 horizontal, escolhe o MAIOR perfil
 * de escala que a faz caber (100 → 97 → 94 → 91 → 88%). A escala é individual:
 * uma ficha longa nunca faz encolher as restantes.
 *
 * O resultado fica em mappings/ficha-layout-scales.json e é consumido pelo
 * gerador na renderização seguinte. Processo iterativo até estabilizar.
 */
/**
 * Perfis por ordem de preferência. O espaçamento (`density`) é apertado
 * primeiro e mais fundo; a tipografia (`scale`) só desce depois e nunca abaixo
 * de 0,88 — que mantém a tabela de ingredientes a 12,3px, acima do mínimo
 * legível de 12px.
 */
const PROFILES = [
  { density: 1, scale: 1 },
  { density: 0.8, scale: 1 },
  { density: 0.62, scale: 1 },
  { density: 0.62, scale: 0.97 },
  { density: 0.55, scale: 0.94 },
  { density: 0.5, scale: 0.91 },
  { density: 0.45, scale: 0.88 },
];
const label = (p) => `${Math.round(p.scale * 100)}% letra / ${Math.round(p.density * 100)}% espaço`;
const OUT = path.join(
  fromRoot(KITCHEN_CONFIG.paths.mappingsDir),
  "ficha-layout-scales.json",
);
const HTML = path.join(
  fromRoot(KITCHEN_CONFIG.paths.reportsDir),
  "ribbai-kitchen-menu-costing-technical-sheets-v3-1-landscape-readable.html",
);
// A4 landscape 297×210mm com margens de 9mm, a 96dpi
const PAGE_H = (210 - 18) * (96 / 25.4);
const PAGE_W = (297 - 22) * (96 / 25.4);
/** Folga de segurança: o motor de paginação precisa de alguma margem. */
const SAFETY = 8;

const generate = () =>
  execFileSync("npx", ["tsx", "scripts/kitchen/generate-kitchen-report.ts", "--layout=readable-tight"], {
    stdio: "pipe",
    shell: true,
    cwd: PROJECT_ROOT,
  });

async function measure(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: Math.round(PAGE_W), height: Math.round(PAGE_H) });
  await page.goto(pathToFileURL(HTML).href, { waitUntil: "networkidle0" });
  await page.emulateMediaType("print");
  await new Promise((r) => setTimeout(r, 1200));
  const data = await page.evaluate(() => {
    /**
     * Altura do bloco que a paginação trata como indivisível. Uma ficha que
     * abre uma categoria vem colada ao cabeçalho que a introduz (h3, lead,
     * cabeçalho de secção) — medir só a ficha subestimava o espaço necessário e
     * deixava-a partir na última linha, com o rodapé sozinho numa página.
     */
    const blockHeight = (el) => {
      const r = el.getBoundingClientRect();
      let top = r.top;
      let prev = el.previousElementSibling;
      while (prev && (prev.tagName === "H3" || prev.classList.contains("lead") || prev.classList.contains("sec-head"))) {
        top = prev.getBoundingClientRect().top;
        prev = prev.previousElementSibling;
      }
      return { h: r.height, blockH: r.bottom - top };
    };
    return [...document.querySelectorAll(".ficha")].map((el) => ({
      id: el.id,
      name: el.querySelector(".ficha-head h4")?.textContent?.trim() ?? "",
      ...blockHeight(el),
      tableFont: parseFloat(
        getComputedStyle(el.querySelector("table") ?? el).fontSize,
      ),
      menuItem: el.classList.contains("ficha-menu-item"),
    }));
  });
  await page.close();
  return data;
}

const write = (scales) =>
  writeFileSync(
    OUT,
    JSON.stringify(
      {
        generated: new Date().toISOString(),
        note: "Artefacto de LAYOUT gerado por `npm run kitchen:report:fit` — não é dado de negócio. Escala individual das fichas que não cabem numa página A4 horizontal: 'density' aperta espaçamentos, 'scale' reduz tipografia (nunca abaixo de 0,88).",
        pageHeightPx: Math.round(PAGE_H),
        scales,
      },
      null,
      2,
    ),
  );

const browser = await puppeteer.launch({ headless: true, protocolTimeout: 300000 });
try {
  const level = {}; // id → índice do perfil
  const scales = {};
  let round = 0;
  let pending = [];

  write({});
  generate();

  do {
    const measured = await measure(browser);
    pending = [];
    for (const f of measured) {
      if (f.blockH <= PAGE_H - SAFETY) continue;
      const next = (level[f.id] ?? 0) + 1;
      if (next >= PROFILES.length) {
        console.warn(`  ⚠ ${f.name}: ainda ${Math.round(f.blockH)}px no perfil mínimo`);
        continue;
      }
      level[f.id] = next;
      scales[f.id] = PROFILES[next];
      pending.push(`${f.name} → ${label(PROFILES[next])}`);
    }
    if (pending.length > 0) {
      console.log(`Ronda ${round + 1}: ajustadas ${pending.length} fichas`);
      for (const p of pending) console.log(`  ${p}`);
      write(scales);
      generate();
    }
    round += 1;
  } while (pending.length > 0 && round < 10);

  // verificação final
  const final = await measure(browser);
  const over = final.filter((f) => f.blockH > PAGE_H - SAFETY);
  const minFont = Math.min(...final.map((f) => f.tableFont));
  console.log(`\nFichas medidas: ${final.length}`);
  console.log(`Fichas no tamanho base: ${final.length - Object.keys(scales).length}`);
  console.log(`Fichas com perfil próprio: ${Object.keys(scales).length}`);
  for (const [id, p] of Object.entries(scales)) {
    const f = final.find((x) => x.id === id);
    console.log(
      `  ${label(p).padEnd(28)} ${String(Math.round(f?.blockH ?? 0)).padStart(4)}px  ${f?.tableFont.toFixed(1)}px  ${f?.name ?? id}`,
    );
  }
  console.log(`Menor fonte de tabela: ${minFont.toFixed(2)}px (mínimo exigido 12px)`);
  console.log(`Fichas que ainda excedem uma página: ${over.length}`);
  for (const f of over) console.log(`  ✗ ${f.name}: ${Math.round(f.blockH)}px`);
  process.exitCode = over.length === 0 && minFont >= 12 ? 0 : 1;
} finally {
  await browser.close();
}
