import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SKUS_LUVAS = [
  "CLEAN-GLOVES-L",
  "CLEAN-GLOVES-M", 
  "CLEAN-GLOVES-S"
];

const NOVO_STOCK_CRITICO = 0.3;
const UPDATED_BY = "OPS-STOCK-CRITICAL-UPDATE-LUVAS";

async function main() {
  console.log("=== RIBBAI - Atualização Stock Crítico Luvas ===");
  console.log(`Produtos: ${SKUS_LUVAS.join(", ")}`);
  console.log(`Novo stock crítico: ${NOVO_STOCK_CRITICO} caixas`);
  console.log("");

  try {
    // 1. Verificar produtos atuais
    const produtos = await prisma.inventoryItem.findMany({
      where: { 
        sku: { in: SKUS_LUVAS },
        deletedAt: null 
      },
      select: {
        id: true,
        sku: true,
        name: true,
        unit: true,
        currentStock: true,
        minimumStock: true,
        reorderPoint: true,
      },
    });

    console.log("📊 Estado atual:");
    produtos.forEach(produto => {
      console.log(`   ${produto.name} (${produto.sku}):`);
      console.log(`     Stock atual: ${produto.currentStock} ${produto.unit}`);
      console.log(`     Stock mínimo atual: ${produto.minimumStock}`);
      console.log(`     Reorder point atual: ${produto.reorderPoint}`);
      console.log("");
    });

    if (produtos.length !== SKUS_LUVAS.length) {
      console.log(`⚠️  Encontrados ${produtos.length} produtos de ${SKUS_LUVAS.length} esperados`);
      const foundSkus = produtos.map(p => p.sku);
      const missingSkus = SKUS_LUVAS.filter(sku => !foundSkus.includes(sku));
      if (missingSkus.length > 0) {
        console.log(`❌ SKUs não encontrados: ${missingSkus.join(", ")}`);
      }
      console.log("");
    }

    // 2. Executar atualização em transação
    console.log("🔄 Atualizando stock crítico...");

    const results = await prisma.$transaction(async (tx) => {
      const updatePromises = produtos.map(async (produto) => {
        const updated = await tx.inventoryItem.update({
          where: { id: produto.id },
          data: {
            minimumStock: NOVO_STOCK_CRITICO,
            reorderPoint: NOVO_STOCK_CRITICO, // Usar o mesmo valor para reorder point
            updatedBy: UPDATED_BY,
          },
          select: {
            sku: true,
            name: true,
            minimumStock: true,
            reorderPoint: true,
          },
        });

        console.log(`   ✅ ${updated.name}: Stock crítico → ${updated.minimumStock} caixas`);
        return updated;
      });

      return await Promise.all(updatePromises);
    });

    console.log("");
    console.log("✅ ATUALIZAÇÃO CONCLUÍDA COM SUCESSO!");
    console.log("");
    console.log("📊 Estado final:");
    results.forEach(produto => {
      console.log(`   • ${produto.name}:`);
      console.log(`     Stock mínimo: ${produto.minimumStock} caixas`);
      console.log(`     Reorder point: ${produto.reorderPoint} caixas`);
    });

    // 3. Verificar alertas críticos após a atualização
    console.log("");
    console.log("🚨 Verificando alertas críticos após atualização:");
    
    const produtosCriticos = await prisma.inventoryItem.findMany({
      where: { 
        sku: { in: SKUS_LUVAS },
        currentStock: { lte: NOVO_STOCK_CRITICO }
      },
      select: {
        sku: true,
        name: true,
        currentStock: true,
        unit: true,
      },
    });

    if (produtosCriticos.length > 0) {
      console.log("⚠️  PRODUTOS EM ESTADO CRÍTICO:");
      produtosCriticos.forEach(produto => {
        const stock = parseFloat(produto.currentStock.toString());
        if (stock <= NOVO_STOCK_CRITICO) {
          console.log(`   🚨 ${produto.name}: ${stock} ${produto.unit} (≤ ${NOVO_STOCK_CRITICO})`);
        }
      });
    } else {
      console.log("✅ Nenhum produto em estado crítico");
    }

    console.log("");

  } catch (error) {
    console.error("❌ Erro durante a atualização:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    console.log("✅ Atualização do stock crítico das luvas concluída!");
  })
  .catch((error) => {
    console.error("❌ Erro na atualização:", error);
    process.exitCode = 1;
  });