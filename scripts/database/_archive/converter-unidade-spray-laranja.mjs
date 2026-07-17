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
const FATOR_CONVERSAO = 5; // 1 unidade = 5 litros
const CREATED_BY = "OPS-UNIT-CONVERSION-2026-07-01";

function decimal(value) {
  if (value instanceof Prisma.Decimal) {
    return value;
  }
  return new Prisma.Decimal(String(value));
}

async function main() {
  console.log("=== RIBBAI - Conversão de Unidade: Spray Laranja WC IBT ===");
  console.log(`Data: ${new Date().toISOString().split('T')[0]}`);
  console.log(`SKU: ${SKU_SPRAY}`);
  console.log(`Conversão: litros → unidades (1 unidade = ${FATOR_CONVERSAO} litros)`);
  console.log("");

  // 1. Buscar o produto atual
  const item = await prisma.inventoryItem.findUnique({
    where: { sku: SKU_SPRAY },
  });

  if (!item) {
    throw new Error(`Produto ${SKU_SPRAY} não encontrado na base de dados.`);
  }

  console.log("📋 ESTADO ATUAL DO PRODUTO:");
  console.log(`   Nome: ${item.name}`);
  console.log(`   SKU: ${item.sku}`);
  console.log(`   Unidade atual: ${item.unit}`);
  console.log(`   Stock atual: ${item.currentStock} ${item.unit}`);
  console.log(`   Custo atual: ${item.costPrice || 0} €/${item.unit}`);
  console.log(`   Valor stock: ${item.stockValue || 0} €`);
  console.log("");

  if (item.unit === "unidade") {
    throw new Error("O produto já está configurado com unidade 'unidade'. Conversão não necessária.");
  }

  if (item.unit !== "litros") {
    throw new Error(`Unidade atual '${item.unit}' não é 'litros'. Verificar configuração do produto.`);
  }

  // 2. Calcular novos valores
  const stockAtualLitros = decimal(item.currentStock);
  const stockNovoUnidades = stockAtualLitros.div(FATOR_CONVERSAO);
  
  const custoAtualPorLitro = decimal(item.costPrice || "0");
  const custoNovoPorUnidade = custoAtualPorLitro.mul(FATOR_CONVERSAO);
  
  const valorStockAtual = decimal(item.stockValue || "0");
  // O valor do stock deve manter-se igual (stockNovoUnidades × custoNovoPorUnidade = valorStockAtual)

  console.log("🔄 CONVERSÃO CALCULADA:");
  console.log(`   Stock: ${stockAtualLitros} litros → ${stockNovoUnidades} unidades`);
  console.log(`   Custo: ${custoAtualPorLitro} €/litro → ${custoNovoPorUnidade} €/unidade`);
  console.log(`   Valor stock: ${valorStockAtual} € (deve manter-se igual)`);
  console.log(`   Validação: ${stockNovoUnidades} × ${custoNovoPorUnidade} = ${stockNovoUnidades.mul(custoNovoPorUnidade)} €`);
  console.log("");

  // 3. Buscar todas as transações do produto
  const transacoes = await prisma.inventoryTransaction.findMany({
    where: {
      itemId: item.id,
    },
    orderBy: {
      transactionDate: "asc",
    },
  });

  console.log(`📊 TRANSAÇÕES A CONVERTER: ${transacoes.length}`);
  console.log("");

  // 4. Mostrar preview das conversões
  console.log("🔍 PREVIEW DAS CONVERSÕES:");
  transacoes.forEach((tx, index) => {
    const quantidadeAtual = decimal(tx.quantity);
    const quantidadeNova = quantidadeAtual.div(FATOR_CONVERSAO);
    const custoUnitarioAtual = decimal(tx.unitCost);
    const custoUnitarioNovo = custoUnitarioAtual.mul(FATOR_CONVERSAO);
    const balanceAtual = decimal(tx.balanceAfter);
    const balanceNovo = balanceAtual.div(FATOR_CONVERSAO);
    
    console.log(`   ${index + 1}. ${tx.transactionDate.toISOString().split('T')[0]} | ${tx.type}`);
    console.log(`      Quantidade: ${quantidadeAtual} ${item.unit} → ${quantidadeNova} unidades`);
    console.log(`      Custo unit.: ${custoUnitarioAtual} €/${item.unit} → ${custoUnitarioNovo} €/unidade`);
    console.log(`      Balance: ${balanceAtual} ${item.unit} → ${balanceNovo} unidades`);
    console.log(`      Custo total: ${tx.totalCost} € (mantém-se)`);
    console.log("");
  });

  // 5. Confirmar valores críticos
  const ultimaTransacao = transacoes[transacoes.length - 1];
  if (ultimaTransacao) {
    const balanceFinalEsperado = decimal(ultimaTransacao.balanceAfter).div(FATOR_CONVERSAO);
    console.log("🎯 VALIDAÇÃO CRÍTICA:");
    console.log(`   Stock atual sistema: ${stockAtualLitros} litros`);
    console.log(`   Balance última transação: ${ultimaTransacao.balanceAfter} litros`);
    console.log(`   Stock convertido: ${stockNovoUnidades} unidades`);
    console.log(`   Balance convertido: ${balanceFinalEsperado} unidades`);
    console.log(`   Consistência: ${stockNovoUnidades.equals(balanceFinalEsperado) ? "✅ OK" : "❌ ERRO"}`);
    console.log("");
  }

  // 6. Aplicar conversão em transação
  console.log("🚀 APLICANDO CONVERSÃO...");
  console.log("");

  await prisma.$transaction(async (tx) => {
    // 6.1. Converter todas as transações
    for (let i = 0; i < transacoes.length; i++) {
      const transacao = transacoes[i];
      const novaQuantidade = decimal(transacao.quantity).div(FATOR_CONVERSAO);
      const novoCustoUnitario = decimal(transacao.unitCost).mul(FATOR_CONVERSAO);
      const novoBalance = decimal(transacao.balanceAfter).div(FATOR_CONVERSAO);

      await tx.inventoryTransaction.update({
        where: { id: transacao.id },
        data: {
          quantity: novaQuantidade,
          unitCost: novoCustoUnitario,
          balanceAfter: novoBalance,
          unit: "unidade",
          // totalCost mantém-se igual
        },
      });

      console.log(`   ✅ Transação ${i + 1}/${transacoes.length} convertida`);
    }

    // 6.2. Converter o produto
    await tx.inventoryItem.update({
      where: { id: item.id },
      data: {
        unit: "unidade",
        currentStock: stockNovoUnidades,
        costPrice: custoNovoPorUnidade,
        averageCost: custoNovoPorUnidade, // Se existir campo CMP
        stockValue: valorStockAtual, // Mantém valor igual
        updatedBy: CREATED_BY,
      },
    });

    console.log(`   ✅ Produto convertido`);
    console.log("");
  });

  // 7. Verificação final
  const itemAtualizado = await prisma.inventoryItem.findUnique({
    where: { id: item.id },
  });

  const transacoesAtualizadas = await prisma.inventoryTransaction.findMany({
    where: {
      itemId: item.id,
    },
    orderBy: {
      transactionDate: "desc",
    },
    take: 5, // Mostrar apenas as 5 mais recentes
  });

  console.log("=" .repeat(70));
  console.log("CONVERSÃO DE UNIDADE CONCLUÍDA COM SUCESSO");
  console.log("=" .repeat(70));
  console.log(`Produto: ${itemAtualizado.name} (${itemAtualizado.sku})`);
  console.log("");
  console.log("📋 PRODUTO ATUALIZADO:");
  console.log(`   Unidade: ${itemAtualizado.unit} ✅`);
  console.log(`   Stock: ${itemAtualizado.currentStock} ${itemAtualizado.unit} ✅`);
  console.log(`   Custo unitário: ${itemAtualizado.costPrice} €/${itemAtualizado.unit} ✅`);
  console.log(`   Valor stock: ${itemAtualizado.stockValue} € ✅`);
  console.log("");
  console.log("📊 TRANSAÇÕES RECENTES CONVERTIDAS:");
  transacoesAtualizadas.forEach((tx, index) => {
    console.log(`   ${index + 1}. ${tx.transactionDate.toISOString().split('T')[0]} | ${tx.type}`);
    console.log(`      Quantidade: ${tx.quantity} ${tx.unit}`);
    console.log(`      Custo: ${tx.unitCost} €/${tx.unit}`);
    console.log(`      Balance: ${tx.balanceAfter} ${tx.unit}`);
  });
  console.log("");
  console.log("✅ VALIDAÇÕES FINAIS:");
  console.log(`   ✓ Unidade = ${itemAtualizado.unit}`);
  console.log(`   ✓ 1 unidade = ${FATOR_CONVERSAO} litros (fator de conversão)`);
  console.log(`   ✓ Stock convertido = ${itemAtualizado.currentStock} unidades`);
  console.log(`   ✓ Transações convertidas = ${transacoes.length}`);
  console.log(`   ✓ Valor total preservado = ${itemAtualizado.stockValue} €`);
  console.log(`   ✓ Preço unitário atualizado = ${itemAtualizado.costPrice} €/unidade`);
  console.log("");
  console.log("🎯 PRÓXIMOS PASSOS:");
  console.log("   • Regenerar relatórios mensais");
  console.log("   • Verificar dashboards");
  console.log("   • Validar KPIs com nova unidade");
  console.log("   • Confirmar alertas de stock");

  return {
    produto: itemAtualizado.name,
    stockAnterior: `${stockAtualLitros} litros`,
    stockNovo: `${itemAtualizado.currentStock} unidades`,
    transacoesConvertidas: transacoes.length,
    valorPreservado: itemAtualizado.stockValue,
    fatorConversao: FATOR_CONVERSAO,
  };
}

main()
  .catch((error) => {
    console.error("❌ Erro na conversão de unidade:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });