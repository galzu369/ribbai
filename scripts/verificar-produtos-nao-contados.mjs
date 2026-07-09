import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// SKUs que foram processados na Count Sheet
const COUNT_SHEET_SKUS = [
  "CONS-SERVICE-NAPKINS",
  "CONS-SERVICE-SMALL-NAPKINS",
  "CONS-SERVICE-STRAWS",
  "CONS-SERVICE-TOOTHPICKS",
  "CONS-OPS-BLUE-ROLL",
  "CONS-OPS-KITCHEN-ROLLS",
  "CONS-OPS-PRINTER-ROLLS",
  "CONS-OPS-TPA-ROLLS",
  "CONS-OPS-GLASS-TRASH-BAGS",
  "CONS-WC-HAND-PAPER",
  "CONS-WC-TOILET-PAPER",
  "CONS-TAKEAWAY-MEDIUM-COFFEE-CUPS",
  "CONS-TAKEAWAY-MEDIUM-CUPS-LIDS",
  "CONS-TAKEAWAY-SAUCE-CUPS",
  "CONS-DESSERT-MOUSSE-CUPS",
  "CONS-TAKEAWAY-SMALL-COFFEE-CUPS",
  "CONS-TAKEAWAY-SOUP-BOX-LID",
  "CONS-TAKEAWAY-BURGER-BOX",
  "CONS-TAKEAWAY-TOAST-BOX",
  "CONS-TAKEAWAY-BOX-750ML",
  "CONS-TAKEAWAY-ROUND-BOX-LID",
  "CONS-GALHETEIRO-OLIVE-OIL",
  "CONS-GALHETEIRO-VINEGAR",
  "SAUCE-KETCHUP",
  "SAUCE-MAYONNAISE",
  "SAUCE-MUSTARD",
  "CLEAN-SPLIT-LV-RINSE",
  "CLEAN-ALCOHOL",
  "CLEAN-URINAL-SCENT",
  "CLEAN-D-50",
  "CLEAN-DISH-LEMON",
  "CLEAN-ANTIBACTERIAL-FOAM",
  "CLEAN-LAVA-TUDO",
  "CLEAN-GLOVES-L",
  "CLEAN-GLOVES-M",
  "CLEAN-GLOVES-S",
  "CLEAN-MASKS",
  "CLEAN-WC-ORANGE-SPRAY-IBT",
  "CLEAN-THOMIL",
  "CLEAN-HAIRNETS",
  "CONS-TAKEAWAY-SPOONS",
  "CONS-TAKEAWAY-FORKS-KNIVES"
];

async function main() {
  console.log("=== RIBBAI - Verificação de Produtos não Contados ===");
  console.log("");

  try {
    // Buscar todos os produtos ativos no sistema
    const allProducts = await prisma.inventoryItem.findMany({
      where: {
        deletedAt: null
      },
      select: {
        sku: true,
        name: true,
        unit: true,
        currentStock: true,
        category: true
      },
      orderBy: [
        { category: "asc" },
        { name: "asc" }
      ]
    });

    console.log(`📊 Total de produtos ativos no sistema: ${allProducts.length}`);
    console.log(`📊 Produtos processados na Count Sheet: ${COUNT_SHEET_SKUS.length}`);
    console.log("");

    // Filtrar produtos que NÃO estão na Count Sheet
    const uncountedProducts = allProducts.filter(product => 
      !COUNT_SHEET_SKUS.includes(product.sku)
    );

    console.log(`⚠️  Produtos não contabilizados na Count Sheet: ${uncountedProducts.length}`);
    console.log("");

    if (uncountedProducts.length > 0) {
      console.log("📋 ARTIGOS NÃO CONTABILIZADOS:");
      console.log("(Produtos que existem no sistema mas não constam na Count Sheet)");
      console.log("");

      const groupedByCategory = uncountedProducts.reduce((acc, product) => {
        const category = product.category || "SEM CATEGORIA";
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(product);
        return acc;
      }, {});

      for (const [category, products] of Object.entries(groupedByCategory)) {
        console.log(`### ${category}`);
        products.forEach(product => {
          console.log(`   • ${product.name} (${product.sku})`);
          console.log(`     Stock atual: ${product.currentStock} ${product.unit}`);
        });
        console.log("");
      }

      // Calcular valor total dos produtos não contados
      const uncountedTotalValue = uncountedProducts.reduce((total, product) => {
        return total + (parseFloat(product.currentStock) || 0);
      }, 0);

      console.log(`💰 Quantidade total de produtos não contados: ${uncountedTotalValue.toFixed(2)} unidades`);
    } else {
      console.log("✅ Todos os produtos ativos do sistema foram incluídos na Count Sheet!");
    }

    console.log("");
    console.log("📊 RESUMO FINAL:");
    console.log(`   • Produtos no sistema: ${allProducts.length}`);
    console.log(`   • Produtos na Count Sheet: ${COUNT_SHEET_SKUS.length}`);
    console.log(`   • Produtos não contados: ${uncountedProducts.length}`);
    console.log(`   • Taxa de cobertura: ${((COUNT_SHEET_SKUS.length / allProducts.length) * 100).toFixed(1)}%`);

  } catch (error) {
    console.error("❌ Erro ao verificar produtos:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    console.log("");
    console.log("✅ Verificação completada com sucesso!");
  })
  .catch((error) => {
    console.error("❌ Erro na verificação:", error);
    process.exitCode = 1;
  });