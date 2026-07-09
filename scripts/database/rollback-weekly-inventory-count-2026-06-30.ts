import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const REFERENCE_ID = "WEEKLY-COUNT-2026-06-30";
const REFERENCE_TYPE = "WEEKLY_COUNT";
const WEEK_NUMBER = 26;
const YEAR = 2026;
const ROLLBACK_USER = "OPS-ROLLBACK-WEEKLY-COUNT-2026-06-30";

interface RollbackResult {
  itemsRestored: number;
  transactionsDeleted: number;
  weeklyItemsDeleted: number;
  totalStockRestored: string;
}

async function main(): Promise<RollbackResult> {
  console.log("=== RIBBAI - Rollback Weekly Inventory Count ===");
  console.log(`Operação: ${REFERENCE_ID}`);
  console.log(`Semana: ${WEEK_NUMBER}/${YEAR}`);
  console.log("");

  try {
    // 1. Verificar se a operação existe
    console.log("🔍 Verificando operação a reverter...");
    
    const existingTransactions = await prisma.inventoryTransaction.count({
      where: {
        referenceType: REFERENCE_TYPE,
        referenceId: REFERENCE_ID,
      },
    });

    const weeklyInventory = await prisma.weeklyInventory.findUnique({
      where: {
        weekNumber_year: {
          weekNumber: WEEK_NUMBER,
          year: YEAR,
        },
      },
    });

    if (existingTransactions === 0) {
      console.log("❌ Nenhuma transação encontrada para reverter.");
      return {
        itemsRestored: 0,
        transactionsDeleted: 0,
        weeklyItemsDeleted: 0,
        totalStockRestored: "0",
      };
    }

    if (!weeklyInventory) {
      console.log("❌ Inventário semanal não encontrado.");
      return {
        itemsRestored: 0,
        transactionsDeleted: 0,
        weeklyItemsDeleted: 0,
        totalStockRestored: "0",
      };
    }

    console.log(`✅ Encontradas ${existingTransactions} transações para reverter`);
    console.log("");

    // 2. Ler estado anterior das weekly_inventory_items
    console.log("📖 Lendo estado anterior do inventário...");
    
    const weeklyItems = await prisma.weeklyInventoryItem.findMany({
      where: {
        weeklyInventoryId: weeklyInventory.id,
      },
      include: {
        item: {
          select: {
            id: true,
            sku: true,
            name: true,
            currentStock: true,
          },
        },
      },
    });

    console.log(`📊 ${weeklyItems.length} itens encontrados para restaurar`);
    console.log("");

    // 3. Executar rollback em transação
    console.log("🔄 Executando rollback...");
    
    const result = await prisma.$transaction(async (tx) => {
      let itemsRestored = 0;
      let totalStockRestored = new Prisma.Decimal(0);

      // Restaurar stock de cada item
      for (const weeklyItem of weeklyItems) {
        const previousStock = weeklyItem.systemQuantity;
        const currentStock = weeklyItem.item.currentStock;

        // Se houve alteração, restaurar
        if (!previousStock.equals(currentStock)) {
          await tx.inventoryItem.update({
            where: { id: weeklyItem.itemId },
            data: {
              currentStock: previousStock,
              updatedBy: ROLLBACK_USER,
            },
          });

          console.log(`   ✅ ${weeklyItem.item.sku}: ${currentStock} → ${previousStock}`);
          itemsRestored++;
          totalStockRestored = totalStockRestored.add(previousStock);
        } else {
          console.log(`   ➖ ${weeklyItem.item.sku}: sem alteração (${currentStock})`);
          totalStockRestored = totalStockRestored.add(currentStock);
        }
      }

      // Apagar transações de ajuste
      const deletedTransactions = await tx.inventoryTransaction.deleteMany({
        where: {
          referenceType: REFERENCE_TYPE,
          referenceId: REFERENCE_ID,
        },
      });

      console.log(`   🗑️ Apagadas ${deletedTransactions.count} transações`);

      // Apagar itens do inventário semanal
      const deletedWeeklyItems = await tx.weeklyInventoryItem.deleteMany({
        where: {
          weeklyInventoryId: weeklyInventory.id,
        },
      });

      console.log(`   🗑️ Apagados ${deletedWeeklyItems.count} itens semanais`);

      // Atualizar ou apagar registo do inventário semanal
      await tx.weeklyInventory.update({
        where: { id: weeklyInventory.id },
        data: {
          status: "CANCELLED",
          updatedBy: ROLLBACK_USER,
        },
      });

      console.log(`   📝 Inventário semanal marcado como CANCELLED`);

      return {
        itemsRestored,
        transactionsDeleted: deletedTransactions.count,
        weeklyItemsDeleted: deletedWeeklyItems.count,
        totalStockRestored: totalStockRestored.toString(),
      };
    });

    console.log("");
    console.log("✅ ROLLBACK CONCLUÍDO COM SUCESSO!");
    console.log("");
    console.log("📊 RESUMO DA REVERSÃO:");
    console.log(`   • Itens restaurados: ${result.itemsRestored}`);
    console.log(`   • Transações apagadas: ${result.transactionsDeleted}`);
    console.log(`   • Linhas semanais apagadas: ${result.weeklyItemsDeleted}`);
    console.log(`   • Stock total restaurado: ${result.totalStockRestored} unidades`);
    console.log("");
    console.log("🎯 PRÓXIMOS PASSOS:");
    console.log("   1. Aplicar dados corretos da Count Sheet");
    console.log("   2. Gerar relatórios atualizados");
    console.log("");

    return result;

  } catch (error) {
    console.error("❌ Erro durante o rollback:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  main()
    .then((result) => {
      console.log("✅ Rollback executado com sucesso!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Erro no rollback:", error);
      process.exit(1);
    });
}

export { main as executeRollback };
export type { RollbackResult };