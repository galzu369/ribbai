import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SKU_LAVA_TUDO = "CLEAN-LAVA-TUDO";
const NOVA_UNIDADE = "unidade";
const UPDATED_BY = "OPS-UNIFORMIZATION-LAVA-TUDO";

async function main() {
  console.log("=== RIBBAI - Uniformização Lava-Tudo ===");
  console.log(`SKU: ${SKU_LAVA_TUDO}`);
  console.log(`Nova unidade: ${NOVA_UNIDADE}`);
  console.log("");

  try {
    // 1. Verificar produto atual
    const produto = await prisma.inventoryItem.findUnique({
      where: { sku: SKU_LAVA_TUDO },
      select: {
        id: true,
        sku: true,
        name: true,
        unit: true,
        currentStock: true,
      },
    });

    if (!produto) {
      console.log(`❌ Produto não encontrado: ${SKU_LAVA_TUDO}`);
      return;
    }

    console.log("📊 Estado atual:");
    console.log(`   Nome: ${produto.name}`);
    console.log(`   Unidade atual: ${produto.unit}`);
    console.log(`   Stock atual: ${produto.currentStock}`);
    console.log("");

    if (produto.unit === NOVA_UNIDADE) {
      console.log("✅ Produto já está na unidade correta!");
      return;
    }

    // 2. Executar uniformização em transação
    console.log("🔄 Executando uniformização...");

    await prisma.$transaction(async (tx) => {
      // Atualizar produto principal
      await tx.inventoryItem.update({
        where: { id: produto.id },
        data: {
          unit: NOVA_UNIDADE,
          updatedBy: UPDATED_BY,
        },
      });

      console.log(`   ✅ Produto atualizado para unidade: ${NOVA_UNIDADE}`);

      // Atualizar todas as transações históricas
      const transacoes = await tx.inventoryTransaction.findMany({
        where: { itemId: produto.id },
        select: { id: true, unit: true },
      });

      if (transacoes.length > 0) {
        await tx.inventoryTransaction.updateMany({
          where: { itemId: produto.id },
          data: { unit: NOVA_UNIDADE },
        });

        console.log(`   ✅ ${transacoes.length} transações históricas atualizadas`);
      }

      // Nota: weeklyInventoryItems não têm campo unit para atualizar
      console.log(`   ℹ️  WeeklyInventoryItems não precisam de atualização de unidade`);
    });

    console.log("");
    console.log("✅ UNIFORMIZAÇÃO CONCLUÍDA COM SUCESSO!");
    console.log("");
    console.log("📊 Estado final:");
    console.log(`   • Produto: ${produto.name}`);
    console.log(`   • Unidade: ${NOVA_UNIDADE}`);
    console.log(`   • Stock: ${produto.currentStock} ${NOVA_UNIDADE}`);
    console.log(`   • Histórico: Todas as transações uniformizadas`);
    console.log("");

  } catch (error) {
    console.error("❌ Erro durante a uniformização:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    console.log("✅ Uniformização do Lava-Tudo concluída!");
  })
  .catch((error) => {
    console.error("❌ Erro na uniformização:", error);
    process.exitCode = 1;
  });