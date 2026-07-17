import { PrismaClient, Prisma } from "@prisma/client";

const DEFAULT_DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5432/ribbai_ops?schema=public";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
    },
  },
});

const SKU_SPRAY = "CLEAN-WC-ORANGE-SPRAY-IBT";
const CREATED_BY = "OPS-CORRECTION-2026-07-01";

function decimal(value) {
  if (value instanceof Prisma.Decimal) {
    return value;
  }
  return new Prisma.Decimal(String(value));
}

async function main() {
  console.log("=== RIBBAI - Correção de Entrada de Spray Laranja WC IBT ===");
  console.log(`Data: ${new Date().toISOString().split('T')[0]}`);
  console.log(`SKU: ${SKU_SPRAY}`);
  console.log("");

  // 1. Buscar o produto
  const item = await prisma.inventoryItem.findUnique({
    where: { sku: SKU_SPRAY },
  });

  if (!item) {
    throw new Error(`Produto ${SKU_SPRAY} não encontrado na base de dados.`);
  }

  console.log(`✅ Produto encontrado: ${item.name}`);
  console.log(`   SKU: ${item.sku}`);
  console.log(`   Unidade: ${item.unit}`);
  console.log(`   Stock atual: ${item.currentStock} ${item.unit}`);
  console.log("");

  // 2. Buscar transações de entrada (IN) com quantidade = 2
  const entryTransactions = await prisma.inventoryTransaction.findMany({
    where: {
      itemId: item.id,
      type: "IN",
      quantity: decimal("2"), // Buscar entradas de 2 litros
    },
    orderBy: {
      transactionDate: "desc",
    },
  });

  console.log(`🔍 Transações de entrada com 2 ${item.unit} encontradas: ${entryTransactions.length}`);

  if (entryTransactions.length === 0) {
    // Buscar qualquer transação IN para verificar
    const allEntries = await prisma.inventoryTransaction.findMany({
      where: {
        itemId: item.id,
        type: "IN",
      },
      orderBy: {
        transactionDate: "desc",
      },
    });

    console.log("📋 Todas as transações de entrada encontradas:");
    allEntries.forEach((tx, index) => {
      console.log(`   ${index + 1}. Data: ${tx.transactionDate.toISOString().split('T')[0]}, Quantidade: ${tx.quantity} ${tx.unit}, Custo: ${tx.totalCost} €`);
    });
    
    throw new Error("Não foram encontradas transações de entrada com 2 litros. Verifique os dados acima.");
  }

  // 3. Selecionar a transação mais recente (ou única)
  const transactionToCorrect = entryTransactions[0];
  console.log("🎯 Transação a corrigir:");
  console.log(`   ID: ${transactionToCorrect.id}`);
  console.log(`   Data: ${transactionToCorrect.transactionDate.toISOString().split('T')[0]}`);
  console.log(`   Quantidade atual: ${transactionToCorrect.quantity} ${transactionToCorrect.unit}`);
  console.log(`   Custo total: ${transactionToCorrect.totalCost} €`);
  console.log(`   Custo unitário atual: ${transactionToCorrect.unitCost} €/${transactionToCorrect.unit}`);
  console.log(`   Referência: ${transactionToCorrect.referenceId || 'N/A'}`);
  console.log("");

  // 4. Calcular novos valores
  const quantidadeAtual = decimal(transactionToCorrect.quantity);
  const quantidadeCorreta = decimal("10");
  const custoTotalMantido = decimal(transactionToCorrect.totalCost);
  const novoCustoUnitario = custoTotalMantido.div(quantidadeCorreta);

  console.log("🔧 Correção a aplicar:");
  console.log(`   Quantidade: ${quantidadeAtual} → ${quantidadeCorreta} ${item.unit}`);
  console.log(`   Custo total: ${custoTotalMantido} € (mantido)`);
  console.log(`   Custo unitário: ${transactionToCorrect.unitCost} → ${novoCustoUnitario} €/${item.unit}`);
  console.log("");

  // 5. Calcular impacto no stock
  const diferençaQuantidade = quantidadeCorreta.sub(quantidadeAtual); // +8 litros
  const stockAtual = decimal(item.currentStock);
  const novoStock = stockAtual.add(diferençaQuantidade);

  console.log("📊 Impacto no stock:");
  console.log(`   Diferença na entrada: +${diferençaQuantidade} ${item.unit}`);
  console.log(`   Stock atual: ${stockAtual} ${item.unit}`);
  console.log(`   Novo stock: ${novoStock} ${item.unit}`);
  console.log("");

  // 6. Aplicar correções
  console.log("🚀 Aplicando correções...");

  await prisma.$transaction(async (tx) => {
    // 6.1. Atualizar a transação
    await tx.inventoryTransaction.update({
      where: { id: transactionToCorrect.id },
      data: {
        quantity: quantidadeCorreta,
        unitCost: novoCustoUnitario,
        balanceAfter: novoStock,
        // totalCost mantém-se igual
        // Note: InventoryTransaction não tem campo updatedBy
      },
    });

    // 6.2. Atualizar o stock do item
    await tx.inventoryItem.update({
      where: { id: item.id },
      data: {
        currentStock: novoStock,
        updatedBy: CREATED_BY,
      },
    });

    console.log("✅ Transação corrigida");
    console.log("✅ Stock atualizado");
  });

  // 7. Verificação final
  const itemAtualizado = await prisma.inventoryItem.findUnique({
    where: { id: item.id },
  });

  const transacaoAtualizada = await prisma.inventoryTransaction.findUnique({
    where: { id: transactionToCorrect.id },
  });

  console.log("");
  console.log("=" .repeat(60));
  console.log("CORREÇÃO CONCLUÍDA COM SUCESSO");
  console.log("=" .repeat(60));
  console.log(`Produto: ${item.name} (${item.sku})`);
  console.log("");
  console.log("📋 RESUMO DA TRANSAÇÃO CORRIGIDA:");
  console.log(`   Data: ${transacaoAtualizada.transactionDate.toISOString().split('T')[0]}`);
  console.log(`   Quantidade: ${transacaoAtualizada.quantity} ${transacaoAtualizada.unit} ✅`);
  console.log(`   Custo total: ${transacaoAtualizada.totalCost} € ✅ (mantido)`);
  console.log(`   Custo unitário: ${transacaoAtualizada.unitCost} €/${transacaoAtualizada.unit} ✅ (recalculado)`);
  console.log("");
  console.log("📈 STOCK ATUALIZADO:");
  console.log(`   Stock atual: ${itemAtualizado.currentStock} ${itemAtualizado.unit} ✅`);
  console.log(`   Diferença aplicada: +${diferençaQuantidade} ${item.unit}`);
  console.log("");
  console.log("✅ Validações:");
  console.log(`   ✓ Quantidade da entrada = ${transacaoAtualizada.quantity} ${item.unit}`);
  console.log(`   ✓ Valor total mantido = ${transacaoAtualizada.totalCost} €`);
  console.log(`   ✓ Preço unitário recalculado = ${transacaoAtualizada.unitCost} €`);
  console.log(`   ✓ Stock atualizado = ${itemAtualizado.currentStock} ${item.unit}`);
  console.log("");
  console.log("🎯 PRÓXIMOS PASSOS:");
  console.log("   • Regenerar relatórios mensais");
  console.log("   • Verificar dashboards");
  console.log("   • Validar KPIs de inventário");

  return {
    transactionId: transactionToCorrect.id,
    quantidadeAnterior: quantidadeAtual,
    quantidadeCorrigida: quantidadeCorreta,
    custoTotal: custoTotalMantido,
    stockAnterior: stockAtual,
    stockNovo: novoStock,
  };
}

main()
  .catch((error) => {
    console.error("❌ Erro ao corrigir entrada:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });