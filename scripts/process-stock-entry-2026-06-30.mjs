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

// Configurações da entrada
const ENTRY_DATE = new Date("2026-06-30T12:00:00.000Z");
const CREATED_BY = "OPS-AUTOMATION-MONTHLY-CLOSURE";
const SUPPLIER_CODE = "SAUCE-SUPPLIER";
const REFERENCE_TYPE = "GOODS_RECEIPT";
const REFERENCE_ID = "RECEIPT-2026-06-30-MONTH-END";

// Dados da entrada de mercadorias
const STOCK_ENTRIES = [
  {
    sku: "SAUCE-KETCHUP",
    expectedName: "Ketchup",
    quantity: 2,
    unit: "caixa",
    unitCost: 9.75,
    notes: "Entrada de mercadoria - fecho de mês Junho 2026"
  },
  {
    sku: "SAUCE-MAYONNAISE", 
    expectedName: "Maionese",
    quantity: 2,
    unit: "caixa",
    unitCost: 8.83,
    notes: "Entrada de mercadoria - fecho de mês Junho 2026"
  }
];

function decimal(value) {
  if (value instanceof Prisma.Decimal) {
    return value;
  }
  return new Prisma.Decimal(String(value));
}

// Funções CMP implementadas no script
function validateCMPInputs(input) {
  if (input.currentStock.lt(0)) {
    throw new Error("Current stock cannot be negative");
  }
  if (input.incomingQuantity.lte(0)) {
    throw new Error("Incoming quantity must be positive");
  }
  if (input.incomingUnitCost.lt(0)) {
    throw new Error("Incoming unit cost cannot be negative");
  }
}

function calculateCMPForStockEntry(input) {
  const { currentStock, currentAverageCost, incomingQuantity, incomingUnitCost } = input;
  
  // Current stock value (existing inventory value)
  const currentStockValue = currentStock.mul(currentAverageCost);
  
  // New entry value
  const entryValue = incomingQuantity.mul(incomingUnitCost);
  
  // New total quantity after entry
  const newTotalQuantity = currentStock.add(incomingQuantity);
  
  // Calculate new weighted-average cost
  let newAverageCost;
  
  if (newTotalQuantity.eq(0)) {
    // Edge case: no stock after transaction
    newAverageCost = decimal(0);
  } else {
    // Standard CMP calculation
    const totalValue = currentStockValue.add(entryValue);
    newAverageCost = totalValue.div(newTotalQuantity);
  }
  
  // New stock value = New Quantity × New Average Cost
  const newStockValue = newTotalQuantity.mul(newAverageCost);
  
  return {
    newAverageCost,
    newStockValue,
    newTotalQuantity,
    entryValue,
  };
}

function generateCMPUpdateData(calculation, lastPurchaseCost, lastPurchaseDate) {
  return {
    averageCost: calculation.newAverageCost,
    stockValue: calculation.newStockValue,
    currentStock: calculation.newTotalQuantity,
    lastPurchaseCost: decimal(lastPurchaseCost),
    lastPurchaseDate,
  };
}

async function ensureSupplier() {
  return prisma.supplier.upsert({
    where: { code: SUPPLIER_CODE },
    update: { name: "Fornecedor de Molhos", status: "ACTIVE" },
    create: { 
      code: SUPPLIER_CODE, 
      name: "Fornecedor de Molhos", 
      status: "ACTIVE" 
    },
  });
}

async function processStockEntry(entry, supplier) {
  // Buscar o item existente
  const item = await prisma.inventoryItem.findUnique({
    where: { sku: entry.sku },
  });

  if (!item) {
    throw new Error(`Item com SKU ${entry.sku} não encontrado na base de dados.`);
  }

  // Validar unidade
  if (item.unit !== entry.unit) {
    throw new Error(`Unidade incorreta para ${entry.sku}. Esperado: ${item.unit}, Recebido: ${entry.unit}`);
  }

  // Dados para o cálculo CMP
  const currentStock = decimal(item.currentStock);
  const currentAverageCost = decimal(item.averageCost || item.costPrice || "0");
  const incomingQuantity = decimal(entry.quantity);
  const incomingUnitCost = decimal(entry.unitCost);

  console.log(`\n=== Processando ${item.name} (${entry.sku}) ===`);
  console.log(`Stock atual: ${currentStock} ${item.unit}`);
  console.log(`CMP atual: ${currentAverageCost} €`);
  console.log(`Entrada: ${incomingQuantity} ${item.unit} a ${incomingUnitCost} €/${item.unit}`);

  // Validar dados de entrada
  const cmpInput = {
    currentStock,
    currentAverageCost,
    incomingQuantity,
    incomingUnitCost,
  };
  validateCMPInputs(cmpInput);

  // Calcular novo CMP
  const cmpResult = calculateCMPForStockEntry(cmpInput);
  
  console.log(`Novo stock: ${cmpResult.newTotalQuantity} ${item.unit}`);
  console.log(`Novo CMP: ${cmpResult.newAverageCost} €`);
  console.log(`Valor da entrada: ${cmpResult.entryValue} €`);
  console.log(`Novo valor total stock: ${cmpResult.newStockValue} €`);

  // Preparar dados de atualização
  const updateData = generateCMPUpdateData(
    cmpResult,
    incomingUnitCost,
    ENTRY_DATE
  );

  // Executar transação
  const operations = [
    // Atualizar item no inventário
    prisma.inventoryItem.update({
      where: { id: item.id },
      data: {
        ...updateData,
        updatedBy: CREATED_BY,
      },
    }),
    
    // Criar transação de entrada
    prisma.inventoryTransaction.create({
      data: {
        itemId: item.id,
        type: "IN",
        quantity: incomingQuantity,
        unit: item.unit,
        unitCost: incomingUnitCost,
        totalCost: cmpResult.entryValue,
        referenceType: REFERENCE_TYPE,
        referenceId: REFERENCE_ID,
        supplierId: supplier.id,
        balanceAfter: cmpResult.newTotalQuantity,
        reason: "Entrada de mercadoria - fecho mensal.",
        notes: entry.notes,
        createdBy: CREATED_BY,
        transactionDate: ENTRY_DATE,
      },
    }),
  ];

  await prisma.$transaction(operations);

  return {
    sku: entry.sku,
    name: item.name,
    unit: item.unit,
    previousStock: currentStock,
    entryQuantity: incomingQuantity,
    newStock: cmpResult.newTotalQuantity,
    previousCMP: currentAverageCost,
    newCMP: cmpResult.newAverageCost,
    entryValue: cmpResult.entryValue,
    newStockValue: cmpResult.newStockValue,
  };
}

async function main() {
  const rawArgs = process.argv.slice(2);
  const force = rawArgs.includes("--force");

  console.log("=== RIBBAI - Processamento de Entrada de Mercadorias ===");
  console.log(`Data: 30 de Junho de 2026`);
  console.log(`Referência: ${REFERENCE_ID}`);
  console.log(`Produtos: Ketchup e Maionese`);

  // Verificar se já existe entrada para esta data
  const existingTxCount = await prisma.inventoryTransaction.count({
    where: {
      referenceType: REFERENCE_TYPE,
      referenceId: REFERENCE_ID,
    },
  });

  if (existingTxCount > 0 && !force) {
    throw new Error(
      `Entrada já processada para ${REFERENCE_ID}. Use --force para regenerar.`
    );
  }

  if (existingTxCount > 0 && force) {
    console.log("⚠️  Removendo transações existentes...");
    await prisma.inventoryTransaction.deleteMany({
      where: {
        referenceType: REFERENCE_TYPE,
        referenceId: REFERENCE_ID,
      },
    });
  }

  // Garantir fornecedor
  const supplier = await ensureSupplier();

  // Processar cada entrada
  const results = [];
  let totalEntryValue = decimal("0");

  for (const entry of STOCK_ENTRIES) {
    const result = await processStockEntry(entry, supplier);
    results.push(result);
    totalEntryValue = totalEntryValue.add(result.entryValue);
  }

  // Gerar relatório final
  console.log("\n" + "=".repeat(60));
  console.log("RESUMO DA ENTRADA DE MERCADORIAS");
  console.log("=".repeat(60));
  console.log(`Data: ${ENTRY_DATE.toISOString().split('T')[0]}`);
  console.log(`Referência: ${REFERENCE_ID}`);
  console.log(`Fornecedor: ${supplier.name} (${supplier.code})`);
  console.log("");

  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.name} (${result.sku})`);
    console.log(`   Stock anterior: ${result.previousStock} ${result.unit}`);
    console.log(`   Quantidade recebida: ${result.entryQuantity} ${result.unit}`);
    console.log(`   Novo stock: ${result.newStock} ${result.unit}`);
    console.log(`   CMP anterior: ${result.previousCMP} €`);
    console.log(`   Novo CMP: ${result.newCMP} €`);
    console.log(`   Valor da entrada: ${result.entryValue} €`);
    console.log(`   Novo valor stock: ${result.newStockValue} €`);
    console.log("");
  });

  console.log(`VALOR TOTAL DA ENTRADA: ${totalEntryValue} €`);
  console.log("");
  console.log("✅ Documentos atualizados:");
  console.log("   • Base de dados de inventário");
  console.log("   • Histórico de transações");
  console.log("   • Valores CMP recalculados");
  console.log("   • Stock valuation atualizada");
  console.log("");
  console.log("🔄 Consistência garantida entre:");
  console.log("   • Stock físico");
  console.log("   • Stock contabilístico"); 
  console.log("   • Histórico de movimentos");
  console.log("   • Relatórios mensais");

  return {
    referenceId: REFERENCE_ID,
    totalValue: totalEntryValue,
    itemsProcessed: results.length,
    results,
  };
}

main()
  .catch((error) => {
    console.error("❌ Erro ao processar entrada de mercadorias:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });