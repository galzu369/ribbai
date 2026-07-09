import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

// Diretórios mensais usados nos docs
const monthDirectoryNames = [
  "01-january",
  "02-february",
  "03-march",
  "04-april",
  "05-may",
  "06-june",
  "07-july",
  "08-august",
  "09-september",
  "10-october",
  "11-november",
  "12-december",
];

// Mapeamento Nome → SKU baseado no script de julho
const PRODUCT_MAPPING = {
  // CONSUMÍVEIS OPERACIONAIS
  "Esfregão": "CLEAN-SPONGE-REGULAR",
  "Esfregão INOX": "CLEAN-SPONGE-INOX",
  "Guardanapos": "CONS-SERVICE-NAPKINS",
  "Guardanapos Pequenos": "CONS-SERVICE-SMALL-NAPKINS",
  "Palhinhas": "CONS-SERVICE-STRAWS",
  "Palitos": "CONS-SERVICE-TOOTHPICKS",
  "Rolo Azul": "CONS-OPS-BLUE-ROLL",
  "Rolo de Cozinha": "CONS-OPS-KITCHEN-ROLLS",
  "Rolos de Etiquetas": "CONS-OPS-LABEL-ROLLS",
  "Rolos Impressora": "CONS-OPS-PRINTER-ROLLS",
  "Rolos TNT": "CONS-OPS-TNT-ROLLS",
  "Rolos TPA": "CONS-OPS-TPA-ROLLS",
  "Sacos do Lixo 120L": "CONS-OPS-TRASH-BAGS-120L",
  "Sacos do Lixo Vidro": "CONS-OPS-GLASS-TRASH-BAGS",

  // CONSUMÍVEIS WC
  "Papel de Maos WC": "CONS-WC-HAND-PAPER",
  "Papel Higienico": "CONS-WC-TOILET-PAPER",

  // COPOS TAKE AWAY
  "Copos Medios Cafe Take Away": "CONS-TAKEAWAY-MEDIUM-COFFEE-CUPS",
  "Copos Medios Take Away + Tampas": "CONS-TAKEAWAY-MEDIUM-CUPS-LIDS",
  "Copos para Molhos Take Away": "CONS-TAKEAWAY-SAUCE-CUPS",
  "Copos para Mousse": "CONS-DESSERT-MOUSSE-CUPS",
  "Copos Pequenos Cafe Take Away": "CONS-TAKEAWAY-SMALL-COFFEE-CUPS",

  // EMBALAGENS TAKE AWAY
  "Box de Sopas + Tampas": "CONS-TAKEAWAY-SOUP-BOX-LID",
  "Box grande 1980ml": "CONS-TAKEAWAY-BURGER-BOX",
  "Box Media 1350": "CONS-TAKEAWAY-TOAST-BOX",
  "Box Pequena 750ml": "CONS-TAKEAWAY-BOX-750ML",
  "Box POKE + Tampas": "CONS-TAKEAWAY-ROUND-BOX-LID",

  // GALHETEIROS
  "Garrafa de Azeite": "CONS-GALHETEIRO-OLIVE-OIL",
  "Garrafa de Vinagre": "CONS-GALHETEIRO-VINEGAR",

  // MOLHOS
  "Ketchup": "SAUCE-KETCHUP",
  "Maionese": "SAUCE-MAYONNAISE",
  "Mostarda": "SAUCE-MUSTARD",

  // PRODUTOS DE LIMPEZA
  "Abrilhantador/Secante SPLIT LV": "CLEAN-SPLIT-LV-RINSE",
  "Alcool": "CLEAN-ALCOHOL",
  "Cheiro Urinol": "CLEAN-URINAL-SCENT",
  "D-50": "CLEAN-D-50",
  "Dish Lemon": "CLEAN-DISH-LEMON",
  "Espuma Antibacteriana": "CLEAN-ANTIBACTERIAL-FOAM",
  "Glow Limpa Vidros": "CLEAN-GLASS-GLOW",
  "Higienizante Acao Rapida": "CLEAN-HYGIENIZER-FAST",
  "Lava-Louça Universal": "CLEAN-LAVA-LOUCAS",
  "Lava-Tudo": "CLEAN-LAVA-TUDO",
  "Lixivia forte": "CLEAN-LIXIVIA-FORTE",
  "Luvas L": "CLEAN-GLOVES-L",
  "Luvas M": "CLEAN-GLOVES-M",
  "Luvas S": "CLEAN-GLOVES-S",
  "Mascaras": "CLEAN-MASKS",
  "Spray Laranja WC IBT": "CLEAN-WC-ORANGE-SPRAY-IBT",
  "Thomil": "CLEAN-THOMIL",
  "Tocas": "CLEAN-HAIRNETS",

  // TALHERES TAKE AWAY
  "Colheres Take Away": "CONS-TAKEAWAY-SPOONS",
  "Garfos e Facas Take Away": "CONS-TAKEAWAY-FORKS-KNIVES",
  "Pauzinhos": "CONS-TAKEAWAY-CHOPSTICKS",
};

function generateWeekNumber(date) {
  const target = new Date(date);
  const yearStart = new Date(target.getFullYear(), 0, 1);
  const dayOfYear =
    Math.floor((target - yearStart) / (24 * 60 * 60 * 1000)) + 1;
  return Math.ceil(dayOfYear / 7);
}

function stripHtml(text) {
  return text.replace(/<br\s*\/?>/gi, "").replace(/<\/?[^>]+>/g, "").trim();
}

function parseItemCell(rawItemCell) {
  const clean = stripHtml(rawItemCell);
  const match = clean.match(/^(.*)\(([^)]+)\)\s*$/);
  if (!match) {
    return { name: clean, unit: null };
  }
  return { name: match[1].trim(), unit: match[2].trim() };
}

function parseQuantityCell(rawCell) {
  const text = stripHtml(rawCell);
  if (!text) return null;
  const normalized = text.replace(",", ".");
  const value = Number(normalized);
  if (Number.isNaN(value)) return null;
  return value;
}

function parseArgs() {
  const rawArgs = process.argv.slice(2);
  const args = Object.fromEntries(
    rawArgs
      .filter((arg) => arg.startsWith("--") && arg.includes("="))
      .map((arg) => {
        const [key, ...valueParts] = arg.slice(2).split("=");
        return [key, valueParts.join("=")];
      })
  );

  const date = args.date;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(
      "Missing or invalid --date. Use --date=YYYY-MM-DD (e.g. 2026-06-16)."
    );
  }

  const htmlPath =
    args.html ??
    path.join(
      rootDir,
      "docs",
      "operational-records",
      "2026",
      "inventory-count-sheets",
      "2026-06-12-inventario-semanal-contagem-fisica.html"
    );

  const explicitWeekNumber = args.weekNumber
    ? Number(args.weekNumber)
    : generateWeekNumber(date);
  const dateObj = new Date(date);
  const year = args.year ? Number(args.year) : dateObj.getFullYear();

  if (!Number.isInteger(explicitWeekNumber)) {
    throw new Error("Invalid --weekNumber (must be integer).");
  }

  return {
    date,
    year,
    weekNumber: explicitWeekNumber,
    htmlPath,
  };
}

function getDateLabelForHeader(date) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
}

function findCountColumnIndex(html, targetLabel) {
  const headerMatch = html.match(
    /<thead>[\s\S]*?<tr>([\s\S]*?)<\/tr>[\s\S]*?<\/thead>/
  );
  if (!headerMatch) {
    throw new Error("Tabela de cabeçalho não encontrada no HTML.");
  }
  const headerRow = headerMatch[1];
  const thRegex = /<th[^>]*>([\s\S]*?)<\/th>/g;
  const labels = [];
  let m;
  while ((m = thRegex.exec(headerRow)) !== null) {
    labels.push(stripHtml(m[1]));
  }
  // Esperado: [\"Item\", \"02/06\", \"09/06\", \"16/06\", ...]
  const dateLabels = labels.slice(1);
  const idx = dateLabels.indexOf(targetLabel);
  if (idx === -1) {
    throw new Error(
      `Coluna para a data "${targetLabel}" não encontrada no cabeçalho. Labels encontrados: ${dateLabels.join(
        ", "
      )}`
    );
  }
  return idx;
}

async function main() {
  const { date, year, weekNumber, htmlPath } = parseArgs();
  const dateLabel = getDateLabelForHeader(date);

  const html = await readFile(htmlPath, "utf8");

  const targetIndex = findCountColumnIndex(html, dateLabel);

  console.log("=== RIBBAI - Extração de contagem semanal ===");
  console.log(`Data: ${date} (coluna ${dateLabel}, índice ${targetIndex})`);
  console.log(`Ficheiro: ${htmlPath}`);
  console.log("");

  const rowRegex = /<tr class="item-row">([\s\S]*?)<\/tr>/g;

  const processedLines = [];
  const notFoundProducts = [];

  let match;
  while ((match = rowRegex.exec(html)) !== null) {
    const rowHtml = match[1];

    const itemMatch = rowHtml.match(
      /<td class="item-cell">([\s\S]*?)<\/td>/
    );
    if (!itemMatch) continue;

    const rawItemCell = itemMatch[1];
    const { name, unit } = parseItemCell(rawItemCell);

    // Extrair todas as células de contagem
    const countCellRegex = /<td class="count-cell">([\s\S]*?)<\/td>/g;
    const countCells = [];
    let cellMatch;
    while ((cellMatch = countCellRegex.exec(rowHtml)) !== null) {
      countCells.push(
        `<td class="count-cell">${cellMatch[1]}</td>`
      );
    }

    const targetCell = countCells[targetIndex];
    if (!targetCell) {
      continue;
    }

    const quantity = parseQuantityCell(targetCell);
    if (quantity === null) {
      continue;
    }

    const sku = PRODUCT_MAPPING[name];
    if (!sku) {
      notFoundProducts.push({ name, unit, quantity });
      console.warn(
        `⚠️  SKU não encontrado para "${name}" (${unit ?? "?"}) com quantidade ${quantity}`
      );
      continue;
    }

    processedLines.push({
      sku,
      name,
      unit,
      quantity,
    });

    console.log(`✅ ${name} (${unit}) → ${sku}: ${quantity}`);
  }

  console.log("");
  console.log("📊 RESUMO DA EXTRAÇÃO:");
  console.log(`   Linhas processadas: ${processedLines.length}`);
  console.log(`   Produtos sem SKU:  ${notFoundProducts.length}`);

  const payload = {
    date,
    weekNumber,
    year,
    lines: processedLines,
  };

  const dateObj = new Date(date);
  const monthDir = monthDirectoryNames[dateObj.getMonth()];
  const outputDir = path.join(
    rootDir,
    "docs",
    "operational-records",
    String(year),
    monthDir,
    "inventory-counts"
  );
  await mkdir(outputDir, { recursive: true });

  const jsonPath = path.join(outputDir, `${date}-weekly-count.json`);
  await writeFile(jsonPath, JSON.stringify(payload, null, 2), "utf8");

  console.log("");
  console.log(`📄 JSON criado: ${jsonPath}`);
  console.log("");
  console.log("🎯 Próximos passos sugeridos:");
  console.log(
    `   1. Aplicar contagem: node scripts/apply-weekly-inventory-from-json-pg.mjs --json=${jsonPath} --date=${date} --weekNumber=${weekNumber} --year=${year}`
  );
  console.log(
    "   2. Regenerar relatórios/auditorias de inventário conforme workflow."
  );
}

main().catch((error) => {
  console.error("❌ Erro ao extrair contagem semanal:", error);
  process.exitCode = 1;
});

