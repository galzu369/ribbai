import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

// Dados CORRETOS da Inventory Count Sheet de 30 de Junho de 2026
// Incluindo todas as 15 correções fornecidas pelo utilizador
const CORRECTED_COUNT_SHEET_DATA = [
  // CONSUMÍVEIS OPERACIONAIS
  { name: "Guardanapos", unit: "caixa", quantity: 2 },
  { name: "Guardanapos Pequenos", unit: "caixa", quantity: 0 }, // CORRIGIDO: 3→0
  { name: "Palhinhas", unit: "saco", quantity: 35 }, // CORRIGIDO: 4 caixas→35 sacos
  { name: "Palitos", unit: "caixa", quantity: 1 },
  { name: "Rolos Azul", unit: "unidade", quantity: 1.5 },
  { name: "Rolos de Cozinha", unit: "pack", quantity: 4 },
  { name: "Rolos Impressora", unit: "caixa", quantity: 4 }, // CORRIGIDO: 1.5→4
  { name: "Rolos TPA", unit: "caixa", quantity: 1.5 },
  { name: "Sacos do Lixo Vidro", unit: "pack", quantity: 2 },
  
  // CONSUMÍVEIS WC
  { name: "Papel de Maos WC", unit: "caixa", quantity: 5 },
  { name: "Papel Higienico", unit: "pack", quantity: 19 }, // CORRIGIDO: 14→19
  
  // COPOS TAKE AWAY
  { name: "Copos Medios Cafe Take Away", unit: "saco", quantity: 5 },
  { name: "Copos Medios Take Away + Tampas", unit: "caixa", quantity: 0.2 },
  { name: "Copos para Molhos Take Away", unit: "caixa", quantity: 0.5 },
  { name: "Copos para Mousse", unit: "unidade", quantity: 100 },
  { name: "Copos Pequenos Cafe Take Away", unit: "caixa", quantity: 0.8 },
  
  // EMBALAGENS TAKE AWAY
  { name: "Box de Sopas + Tampas", unit: "caixa", quantity: 1.5 },
  { name: "Box grande 1980ml", unit: "caixa", quantity: 2 },
  { name: "Box Media 1350", unit: "caixa", quantity: 2 },
  { name: "Box Pequena 750ml", unit: "caixa", quantity: 1 },
  { name: "Box POKE + Tampas", unit: "caixa", quantity: 4 },
  
  // GALHETEIROS
  { name: "Garrafa de Azeite", unit: "unidade", quantity: 9 },
  { name: "Garrafa de Vinagre", unit: "unidade", quantity: 9 }, // CORRIGIDO: 5→9
  
  // MOLHOS
  { name: "Ketchup", unit: "caixa", quantity: 3 },
  { name: "Maionese", unit: "caixa", quantity: 3 },
  { name: "Mostarda", unit: "caixa", quantity: 1.5 },
  
  // PRODUTOS DE LIMPEZA
  { name: "Abrilhantador/Secante SPLIT LV", unit: "unidade", quantity: 3 },
  { name: "Alcool", unit: "unidade", quantity: 21 }, // CORRIGIDO: 25→21
  { name: "Cheiro Urinol", unit: "unidade", quantity: 12 }, // CORRIGIDO: 15→12
  { name: "D-50", unit: "unidade", quantity: 2 }, // CORRIGIDO: 3→2
  { name: "Dish Lemon", unit: "unidade", quantity: 2 },
  { name: "Espuma Antibacteriana", unit: "unidade", quantity: 0 }, // CORRIGIDO: 2→0
  { name: "Lava-Tudo", unit: "unidade", quantity: 4 }, // CORRIGIDO: 0→4
  { name: "Lava-Louça Universal", unit: "unidade", quantity: 1 }, // ADICIONADO
  { name: "Luvas L", unit: "caixa", quantity: 1 },
  { name: "Luvas M", unit: "caixa", quantity: 1 }, // CORRIGIDO: 4.5→1
  { name: "Luvas S", unit: "caixa", quantity: 1 },
  { name: "Mascaras", unit: "caixa", quantity: 4 },
  { name: "Spray Laranja WC IBT", unit: "unidade", quantity: 2 }, // CORRIGIDO: 2.5→2
  { name: "Thomil", unit: "unidade", quantity: 4 },
  { name: "Tocas", unit: "saco", quantity: 3 },
  
  // TALHERES TAKE AWAY
  { name: "Colheres Take Away", unit: "saco", quantity: 3 },
  { name: "Garfos e Facas Take Away", unit: "saco", quantity: 5 }, // CORRIGIDO: 6.5→5
  { name: "Pauzinhos", unit: "saco", quantity: 6 } // ADICIONADO
];

// Mapeamento Nome → SKU (atualizado com produtos novos)
const PRODUCT_MAPPING = {
  // CONSUMÍVEIS OPERACIONAIS
  "Guardanapos": "CONS-SERVICE-NAPKINS",
  "Guardanapos Pequenos": "CONS-SERVICE-SMALL-NAPKINS",
  "Palhinhas": "CONS-SERVICE-STRAWS",
  "Palitos": "CONS-SERVICE-TOOTHPICKS",
  "Rolos Azul": "CONS-OPS-BLUE-ROLL",
  "Rolos de Cozinha": "CONS-OPS-KITCHEN-ROLLS",
  "Rolos Impressora": "CONS-OPS-PRINTER-ROLLS",
  "Rolos TPA": "CONS-OPS-TPA-ROLLS",
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
  "Lava-Tudo": "CLEAN-LAVA-TUDO",
  "Lava-Louça Universal": "CLEAN-LAVA-LOUCAS", // Produto já existe no sistema
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
  "Pauzinhos": "CONS-TAKEAWAY-CHOPSTICKS" // Produto já existe no sistema
};

function generateWeekNumber(date) {
  const target = new Date(date);
  const yearStart = new Date(target.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((target - yearStart) / (24 * 60 * 60 * 1000)) + 1;
  return Math.ceil(dayOfYear / 7);
}

async function main() {
  const date = "2026-06-30";
  const weekNumber = generateWeekNumber(date);
  const year = 2026;

  console.log("=== RIBBAI - Count Sheet CORRIGIDA ===");
  console.log(`Data: ${date}`);
  console.log(`Semana: ${weekNumber}/${year}`);
  console.log(`Total de produtos na Count Sheet: ${CORRECTED_COUNT_SHEET_DATA.length}`);
  console.log("");

  console.log("📊 CORREÇÕES APLICADAS:");
  console.log("   • Guardanapos Pequenos: 3 → 0 caixas");
  console.log("   • Palhinhas: 4 caixas → 35 sacos"); 
  console.log("   • Rolos Impressora: 1.5 → 4 caixas");
  console.log("   • Papel Higiénico: 14 → 19 packs");
  console.log("   • Garrafa de Vinagre: 5 → 9 unidades");
  console.log("   • Álcool: 25 → 21 unidades");
  console.log("   • Cheiro Urinol: 15 → 12 unidades");
  console.log("   • D-50: 3 → 2 unidades");
  console.log("   • Espuma Antibacteriana: 2 → 0 unidades");
  console.log("   • Lava-Tudo: 0 → 4 unidades");
  console.log("   • Luvas M: 4.5 → 1 caixa");
  console.log("   • Spray Laranja WC IBT: 2.5 → 2 unidades");
  console.log("   • Garfos e Facas Take Away: 6.5 → 5 sacos");
  console.log("   + Lava-Louça Universal: 1 unidade (ADICIONADO)");
  console.log("   + Pauzinhos: 6 sacos (ADICIONADO)");
  console.log("");

  // Processar dados e criar JSON
  const processedLines = [];
  const notFoundProducts = [];
  
  console.log("🔄 Processando produtos da Count Sheet:");
  
  for (const item of CORRECTED_COUNT_SHEET_DATA) {
    const sku = PRODUCT_MAPPING[item.name];
    
    if (!sku) {
      notFoundProducts.push(item);
      console.log(`❌ SKU não encontrado para: ${item.name} (${item.unit})`);
      continue;
    }
    
    processedLines.push({
      sku,
      name: item.name,
      unit: item.unit,
      quantity: item.quantity
    });
    
    console.log(`✅ ${item.name} → ${sku} (${item.quantity} ${item.unit})`);
  }

  console.log("");
  console.log("📊 RESUMO DO PROCESSAMENTO:");
  console.log(`   Produtos processados: ${processedLines.length}`);
  console.log(`   SKUs não encontrados: ${notFoundProducts.length}`);
  console.log(`   Correções aplicadas: 15`);
  console.log(`   Produtos novos: 2`);
  
  if (notFoundProducts.length > 0) {
    console.log("");
    console.log("⚠️  PRODUTOS SEM SKU:");
    notFoundProducts.forEach(item => {
      console.log(`   • ${item.name} (${item.unit}): ${item.quantity}`);
    });
  }

  // Gerar JSON para aplicação
  const countJson = {
    date,
    weekNumber,
    year,
    lines: processedLines
  };

  // Salvar JSON correto
  const jsonPath = path.join(rootDir, `corrected-count-sheet-${date}.json`);
  await writeFile(jsonPath, JSON.stringify(countJson, null, 2), "utf8");
  
  console.log("");
  console.log(`📄 JSON correto criado: ${jsonPath}`);
  console.log("");
  console.log("🎯 PRÓXIMOS PASSOS:");
  console.log(`   1. Aplicar contagem: node scripts/apply-weekly-inventory-from-json.mjs --json=corrected-count-sheet-${date}.json --date=${date} --weekNumber=${weekNumber} --year=${year}`);
  console.log(`   2. Gerar relatórios: node scripts/generate-enhanced-inventory-update-report-pdf.mjs --date=${date}`);
  console.log("");

  return {
    processedProducts: processedLines.length,
    notFoundProducts: notFoundProducts.length,
    totalProducts: CORRECTED_COUNT_SHEET_DATA.length,
    correctionsApplied: 15,
    newProducts: 2,
    jsonPath,
    date,
    weekNumber,
    year
  };
}

main()
  .then((result) => {
    console.log("✅ Count Sheet corrigida processada com sucesso!");
    console.log(`📊 ${result.processedProducts}/${result.totalProducts} produtos processados`);
    console.log(`🔧 ${result.correctionsApplied} correções aplicadas + ${result.newProducts} produtos novos`);
  })
  .catch((error) => {
    console.error("❌ Erro na preparação:", error);
    process.exitCode = 1;
  });