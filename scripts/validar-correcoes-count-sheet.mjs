import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Valores esperados após as correções
const EXPECTED_VALUES = {
  "CONS-SERVICE-SMALL-NAPKINS": { name: "Guardanapos Pequenos", expected: 0, unit: "caixa" },
  "CONS-SERVICE-STRAWS": { name: "Palhinhas", expected: 35, unit: "saco" },
  "CONS-OPS-PRINTER-ROLLS": { name: "Rolos Impressora", expected: 4, unit: "caixa" },
  "CONS-WC-TOILET-PAPER": { name: "Papel Higiénico", expected: 19, unit: "pack" },
  "CONS-GALHETEIRO-VINEGAR": { name: "Garrafa de Vinagre", expected: 9, unit: "unidade" },
  "CLEAN-ALCOHOL": { name: "Álcool", expected: 21, unit: "unidade" },
  "CLEAN-URINAL-SCENT": { name: "Cheiro Urinol", expected: 12, unit: "unidade" },
  "CLEAN-D-50": { name: "D-50", expected: 2, unit: "unidade" },
  "CLEAN-ANTIBACTERIAL-FOAM": { name: "Espuma Antibacteriana", expected: 0, unit: "unidade" },
  "CLEAN-LAVA-TUDO": { name: "Lava-Tudo", expected: 4, unit: "unidade" },
  "CLEAN-LAVA-LOUCAS": { name: "Lava-Louça Universal", expected: 1, unit: "unidade" },
  "CLEAN-GLOVES-M": { name: "Luvas M", expected: 1, unit: "caixa" },
  "CLEAN-WC-ORANGE-SPRAY-IBT": { name: "Spray Laranja WC IBT", expected: 2, unit: "unidade" },
  "CONS-TAKEAWAY-FORKS-KNIVES": { name: "Garfos e Facas Take Away", expected: 5, unit: "saco" },
  "CONS-TAKEAWAY-CHOPSTICKS": { name: "Pauzinhos", expected: 6, unit: "saco" },
};

async function main() {
  console.log("=== RIBBAI - Validação de Correções da Count Sheet ===");
  console.log("Data: 30 de Junho de 2026");
  console.log("");

  try {
    let correctionsValidated = 0;
    let errorsFound = 0;

    console.log("🔍 Validando correções aplicadas:");
    console.log("");

    for (const [sku, info] of Object.entries(EXPECTED_VALUES)) {
      const item = await prisma.inventoryItem.findUnique({
        where: { sku },
        select: {
          sku: true,
          name: true,
          unit: true,
          currentStock: true,
        },
      });

      if (!item) {
        console.log(`❌ Produto não encontrado: ${sku} (${info.name})`);
        errorsFound++;
        continue;
      }

      const actualStock = parseFloat(item.currentStock.toString());
      const expectedStock = info.expected;

      if (actualStock === expectedStock && item.unit === info.unit) {
        console.log(`✅ ${info.name}: ${actualStock} ${item.unit} (CORRETO)`);
        correctionsValidated++;
      } else {
        console.log(`❌ ${info.name}: esperado ${expectedStock} ${info.unit}, atual ${actualStock} ${item.unit}`);
        errorsFound++;
      }
    }

    console.log("");
    console.log("📊 RESUMO DA VALIDAÇÃO:");
    console.log(`   • Correções validadas: ${correctionsValidated}/${Object.keys(EXPECTED_VALUES).length}`);
    console.log(`   • Erros encontrados: ${errorsFound}`);

    // Verificar se a operação semanal foi aplicada
    console.log("");
    console.log("🔍 Verificando aplicação da operação semanal:");

    const weeklyInventory = await prisma.weeklyInventory.findUnique({
      where: {
        weekNumber_year: {
          weekNumber: 26,
          year: 2026,
        },
      },
    });

    if (weeklyInventory && weeklyInventory.status !== "CANCELLED") {
      console.log(`✅ Inventário semanal encontrado: ${weeklyInventory.status}`);
      
      const itemCount = await prisma.weeklyInventoryItem.count({
        where: {
          weeklyInventoryId: weeklyInventory.id,
        },
      });
      
      console.log(`✅ Itens na contagem semanal: ${itemCount}`);
    } else {
      console.log("❌ Inventário semanal não encontrado ou cancelado");
      errorsFound++;
    }

    // Verificar transações criadas
    console.log("");
    console.log("🔍 Verificando transações de ajuste:");

    const transactionCount = await prisma.inventoryTransaction.count({
      where: {
        referenceType: "WEEKLY_COUNT",
        referenceId: "WEEKLY-COUNT-2026-06-30",
      },
    });

    console.log(`✅ Transações de ajuste criadas: ${transactionCount}`);

    console.log("");
    if (errorsFound === 0) {
      console.log("🎉 VALIDAÇÃO CONCLUÍDA COM SUCESSO!");
      console.log("✅ Todas as correções foram aplicadas corretamente");
      console.log("✅ Sistema sincronizado com a Count Sheet");
    } else {
      console.log("⚠️  VALIDAÇÃO CONCLUÍDA COM ERROS");
      console.log(`❌ ${errorsFound} problemas encontrados`);
      console.log("🔧 Revise as correções que falharam");
    }

    console.log("");
    console.log("📋 PRODUTOS COM STOCK CRÍTICO (≤1):");
    
    const criticalItems = await prisma.inventoryItem.findMany({
      where: {
        currentStock: {
          lte: 1,
        },
        deletedAt: null,
      },
      select: {
        sku: true,
        name: true,
        currentStock: true,
        unit: true,
      },
      orderBy: {
        currentStock: "asc",
      },
    });

    if (criticalItems.length > 0) {
      criticalItems.forEach(item => {
        const stock = parseFloat(item.currentStock.toString());
        if (stock === 0) {
          console.log(`🚨 ${item.name}: ${stock} ${item.unit} (ESGOTADO)`);
        } else {
          console.log(`⚠️  ${item.name}: ${stock} ${item.unit} (BAIXO)`);
        }
      });
    } else {
      console.log("✅ Nenhum produto com stock crítico encontrado");
    }

  } catch (error) {
    console.error("❌ Erro durante a validação:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    console.log("");
    console.log("✅ Validação completada!");
  })
  .catch((error) => {
    console.error("❌ Erro na validação:", error);
    process.exitCode = 1;
  });