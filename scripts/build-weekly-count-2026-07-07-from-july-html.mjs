import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

// Mapeamento Nome → SKU baseado nos scripts de sincronizacao de 30-06-2026.
// Mantido aqui de forma explicita para que o payload seja totalmente
// deterministico e alinhado com a configuracao atual do sistema.
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
  // Normalizar vírgula/ponto decimal para formato JS
  const normalized = text.replace(",", ".");
  const value = Number(normalized);
  if (Number.isNaN(value)) return null;
  return value;
}

async function main() {
  const date = "2026-07-07";
  const year = 2026;
  const weekNumber = generateWeekNumber(date);

  const htmlPath = path.join(
    rootDir,
    "docs",
    "operational-records",
    "2026",
    "inventory-count-sheets",
    "2026-07-inventario-semanal-contagem-fisica-julho.html"
  );

  const html = await readFile(htmlPath, "utf8");

  const rowRegex =
    /<tr class="item-row"><td class="item-cell">([\s\S]*?)<\/td><td class="count-cell"([\s\S]*?)<\/td>([\s\S]*?)<\/tr>/g;

  const processedLines = [];
  const notFoundProducts = [];

  console.log("=== RIBBAI - Extração de contagem semanal 07/07/2026 ===");
  console.log(`Ficheiro: ${htmlPath}`);
  console.log("");

  let match;
  while ((match = rowRegex.exec(html)) !== null) {
    const rawItemCell = match[1];
    const rawFirstCountCell = `<td class="count-cell${match[2]}</td>`;

    const { name, unit } = parseItemCell(rawItemCell);
    const quantity = parseQuantityCell(rawFirstCountCell);

    // Ignorar linhas sem quantidade (mantêm stock inalterado)
    if (quantity === null) {
      continue;
    }

    // Linha especial duplicada de Split LV foi deixada vazia e por isso
    // é automaticamente ignorada aqui.

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

  const jsonPath = path.join(rootDir, `weekly-count-${date}.json`);
  await writeFile(jsonPath, JSON.stringify(payload, null, 2), "utf8");

  console.log("");
  console.log(`📄 JSON criado: ${jsonPath}`);
  console.log("");
  console.log("🎯 Próximos passos sugeridos:");
  console.log(
    `   1. Aplicar contagem: node scripts/apply-weekly-inventory-from-json.mjs --json=weekly-count-${date}.json --date=${date} --weekNumber=${weekNumber} --year=${year}`
  );
  console.log(
    "   2. Gerar relatórios/auditorias de inventário para 07-07-2026 conforme workflow."
  );
}

main().catch((error) => {
  console.error("❌ Erro ao extrair contagem semanal de Julho:", error);
  process.exitCode = 1;
});

