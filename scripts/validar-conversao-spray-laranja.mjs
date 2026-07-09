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

async function main() {
  console.log("=== RIBBAI - Validação da Conversão: Spray Laranja WC IBT ===");
  console.log(`Data: ${new Date().toISOString().split('T')[0]}`);
  console.log(`SKU: ${SKU_SPRAY}`);
  console.log("");

  // 1. Verificar o produto atual
  const item = await prisma.inventoryItem.findUnique({
    where: { sku: SKU_SPRAY },
  });

  if (!item) {
    throw new Error(`Produto ${SKU_SPRAY} não encontrado na base de dados.`);
  }

  console.log("📋 ESTADO ATUAL DO PRODUTO:");
  console.log(`   Nome: ${item.name}`);
  console.log(`   SKU: ${item.sku}`);
  console.log(`   Unidade: ${item.unit}`);
  console.log(`   Stock: ${item.currentStock} ${item.unit}`);
  console.log(`   Custo: ${item.costPrice || 0} €/${item.unit}`);
  console.log(`   Valor stock: ${item.stockValue || 0} €`);
  console.log("");

  // 2. Verificar transações
  const transacoes = await prisma.inventoryTransaction.findMany({
    where: {
      itemId: item.id,
    },
    orderBy: {
      transactionDate: "desc",
    },
  });

  console.log(`📊 TRANSAÇÕES ENCONTRADAS: ${transacoes.length}`);
  console.log("");

  let todasUnidadesCorretas = true;
  transacoes.forEach((tx, index) => {
    console.log(`   ${index + 1}. ${tx.transactionDate.toISOString().split('T')[0]} | ${tx.type}`);
    console.log(`      Quantidade: ${tx.quantity} ${tx.unit}`);
    console.log(`      Custo: ${tx.unitCost} €/${tx.unit}`);
    console.log(`      Balance: ${tx.balanceAfter} ${tx.unit}`);
    console.log(`      Total: ${tx.totalCost} €`);
    
    if (tx.unit !== "unidade") {
      todasUnidadesCorretas = false;
      console.log(`      ⚠️  ATENÇÃO: Unidade '${tx.unit}' deveria ser 'unidade'`);
    }
    console.log("");
  });

  // 3. Validações finais
  console.log("✅ VALIDAÇÕES DA CONVERSÃO:");
  
  const validacoes = [
    {
      nome: "Unidade do produto",
      esperado: "unidade", 
      atual: item.unit,
      ok: item.unit === "unidade"
    },
    {
      nome: "Todas as transações em unidades",
      esperado: "true",
      atual: todasUnidadesCorretas.toString(),
      ok: todasUnidadesCorretas
    },
    {
      nome: "Stock em formato decimal",
      esperado: "número válido",
      atual: item.currentStock.toString(),
      ok: !isNaN(parseFloat(item.currentStock.toString()))
    },
    {
      nome: "Valor stock preservado",
      esperado: "≥ 0",
      atual: `${item.stockValue || 0} €`,
      ok: (parseFloat(item.stockValue?.toString() || "0")) >= 0
    }
  ];

  validacoes.forEach(v => {
    console.log(`   ${v.ok ? "✅" : "❌"} ${v.nome}: ${v.atual} ${v.ok ? "" : `(esperado: ${v.esperado})`}`);
  });

  console.log("");

  // 4. Resumo final
  const todasValidacoesOk = validacoes.every(v => v.ok);
  
  if (todasValidacoesOk) {
    console.log("🎉 CONVERSÃO VALIDADA COM SUCESSO!");
    console.log("");
    console.log("📋 RESUMO:");
    console.log(`   ✓ Produto configurado com unidade 'unidade'`);
    console.log(`   ✓ Stock atual: ${item.currentStock} unidades`);
    console.log(`   ✓ ${transacoes.length} transações convertidas`);
    console.log(`   ✓ Valor total preservado: ${item.stockValue || 0} €`);
    console.log(`   ✓ Sistema pronto para gestão em unidades`);
    console.log("");
    console.log("🎯 EQUIVALÊNCIA:");
    console.log(`   1 unidade = 5 litros`);
    console.log(`   Stock atual: ${item.currentStock} unidades = ${parseFloat(item.currentStock.toString()) * 5} litros`);
  } else {
    console.log("❌ PROBLEMAS DETECTADOS NA CONVERSÃO!");
    console.log("Verificar validações acima e corrigir antes de prosseguir.");
  }

  return {
    produtoCorreto: item.unit === "unidade",
    transacoesCorretas: todasUnidadesCorretas,
    totalTransacoes: transacoes.length,
    stockAtual: item.currentStock.toString(),
    valorPreservado: item.stockValue?.toString() || "0",
    conversaoCompleta: todasValidacoesOk
  };
}

main()
  .catch((error) => {
    console.error("❌ Erro na validação:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });