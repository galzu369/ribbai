import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PrismaClient } from "@prisma/client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const DEFAULT_DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5432/ribbai_ops?schema=public";
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
    },
  },
});

function formatQuantity(value) {
  return Number(value).toLocaleString("pt-PT", {
    maximumFractionDigits: 3,
  });
}

function formatCurrency(value) {
  return Number(value).toLocaleString("pt-PT", {
    style: "currency",
    currency: "EUR",
  });
}

function getCriticalStockThreshold(item) {
  return Number(item.reorderPoint ?? item.minimumStock ?? 0);
}

function getStockStatus(item) {
  const currentStock = Number(item.currentStock);
  const criticalThreshold = getCriticalStockThreshold(item);

  if (currentStock === 0 || currentStock <= criticalThreshold) {
    return "Critico";
  }

  return "Saudavel";
}

async function getJuneFinalStock() {
  console.log("🔍 Retrieving June 2026 final stock from last weekly count...");
  
  // Get the last weekly inventory of June 2026
  const juneEndDate = new Date(2026, 5, 30, 23, 59, 59); // June 30, 2026
  const juneStartDate = new Date(2026, 5, 1); // June 1, 2026
  
  const lastJuneCount = await prisma.weeklyInventory.findFirst({
    where: {
      weekStartDate: {
        gte: juneStartDate,
        lte: juneEndDate,
      },
      items: {
        some: {
          item: {
            category: {
              in: ["Consumiveis", "Produtos de Limpeza"],
            },
          },
        },
      },
    },
    include: {
      items: {
        where: {
          item: {
            category: {
              in: ["Consumiveis", "Produtos de Limpeza"],
            },
          },
        },
        include: {
          item: true,
        },
      },
    },
    orderBy: {
      weekStartDate: "desc",
    },
  });

  if (!lastJuneCount) {
    throw new Error("No weekly inventory found for June 2026. Cannot validate continuity.");
  }

  const juneStock = new Map();
  for (const item of lastJuneCount.items) {
    juneStock.set(item.item.sku, {
      sku: item.item.sku,
      name: item.item.name,
      finalQuantity: Number(item.actualQuantity),
      unit: item.item.unit,
      costPrice: Number(item.item.costPrice),
      averageCost: Number(item.item.averageCost),
      status: getStockStatus(item.item),
      weekEndDate: lastJuneCount.weekEndDate,
    });
  }

  console.log(`✅ Found June final stock from week ending ${lastJuneCount.weekEndDate.toLocaleDateString("pt-PT")} with ${juneStock.size} items`);
  return juneStock;
}

async function getJulyCurrentStock() {
  console.log("🔍 Retrieving July 2026 current stock...");
  
  const activeItems = await prisma.inventoryItem.findMany({
    where: {
      category: {
        in: ["Consumiveis", "Produtos de Limpeza"],
      },
      status: "ACTIVE",
    },
  });

  const julyStock = new Map();
  for (const item of activeItems) {
    julyStock.set(item.sku, {
      sku: item.sku,
      name: item.name,
      currentQuantity: Number(item.currentStock),
      unit: item.unit,
      costPrice: Number(item.costPrice),
      averageCost: Number(item.averageCost),
      status: getStockStatus(item),
      category: item.category,
      subCategory: item.subCategory,
    });
  }

  console.log(`✅ Found July current stock with ${julyStock.size} active items`);
  return julyStock;
}

async function validateStockContinuity(juneStock, julyStock) {
  console.log("\n📊 Validating stock continuity (June final = July initial)...");
  
  const issues = [];
  const matchedItems = [];
  let totalVariance = 0;

  for (const [sku, juneItem] of juneStock) {
    const julyItem = julyStock.get(sku);
    
    if (!julyItem) {
      issues.push({
        type: "MISSING_ITEM",
        sku: sku,
        message: `Item ${juneItem.name} (${sku}) exists in June final stock but not in July active items`,
        severity: "ERROR",
      });
      continue;
    }

    const variance = Math.abs(julyItem.currentQuantity - juneItem.finalQuantity);
    totalVariance += variance;

    if (variance > 0.001) { // Allow for minimal rounding differences
      issues.push({
        type: "STOCK_VARIANCE",
        sku: sku,
        message: `Stock variance for ${juneItem.name}: June final ${formatQuantity(juneItem.finalQuantity)} ${juneItem.unit}, July current ${formatQuantity(julyItem.currentQuantity)} ${julyItem.unit} (difference: ${formatQuantity(variance)})`,
        severity: variance > 1 ? "ERROR" : "WARNING",
        juneQuantity: juneItem.finalQuantity,
        julyQuantity: julyItem.currentQuantity,
        variance: variance,
      });
    } else {
      matchedItems.push({
        sku: sku,
        name: juneItem.name,
        quantity: juneItem.finalQuantity,
        unit: juneItem.unit,
      });
    }
  }

  // Check for items that exist in July but not in June
  for (const [sku, julyItem] of julyStock) {
    if (!juneStock.has(sku)) {
      issues.push({
        type: "NEW_ITEM",
        sku: sku,
        message: `New item in July: ${julyItem.name} (${sku}) - ${formatQuantity(julyItem.currentQuantity)} ${julyItem.unit}`,
        severity: "INFO",
      });
    }
  }

  console.log(`✅ Stock continuity validation complete:`);
  console.log(`   - ${matchedItems.length} items with perfect continuity`);
  console.log(`   - ${issues.filter(i => i.type === "STOCK_VARIANCE").length} items with stock variance`);
  console.log(`   - ${issues.filter(i => i.type === "NEW_ITEM").length} new items in July`);
  console.log(`   - ${issues.filter(i => i.type === "MISSING_ITEM").length} missing items from June`);
  console.log(`   - Total variance: ${formatQuantity(totalVariance)} units`);

  return { issues, matchedItems, totalVariance };
}

async function validateItemConsistency(juneStock, julyStock) {
  console.log("\n🔍 Validating item consistency (units, prices, CMP)...");
  
  const issues = [];
  let consistentItems = 0;

  for (const [sku, juneItem] of juneStock) {
    const julyItem = julyStock.get(sku);
    
    if (!julyItem) continue; // Already reported in stock continuity

    // Check unit consistency
    if (juneItem.unit !== julyItem.unit) {
      issues.push({
        type: "UNIT_CHANGE",
        sku: sku,
        message: `Unit changed for ${juneItem.name}: June "${juneItem.unit}" → July "${julyItem.unit}"`,
        severity: "ERROR",
      });
    }

    // Check cost price consistency (allow small differences for updates)
    const costVariance = Math.abs(julyItem.costPrice - juneItem.costPrice);
    if (costVariance > 0.01 && juneItem.costPrice > 0) {
      issues.push({
        type: "COST_PRICE_CHANGE",
        sku: sku,
        message: `Cost price changed for ${juneItem.name}: June ${formatCurrency(juneItem.costPrice)} → July ${formatCurrency(julyItem.costPrice)}`,
        severity: costVariance > (juneItem.costPrice * 0.1) ? "WARNING" : "INFO",
      });
    }

    // Check average cost (CMP) consistency
    const cmpVariance = Math.abs(julyItem.averageCost - juneItem.averageCost);
    if (cmpVariance > 0.01 && juneItem.averageCost > 0) {
      issues.push({
        type: "CMP_CHANGE",
        sku: sku,
        message: `Average cost (CMP) changed for ${juneItem.name}: June ${formatCurrency(juneItem.averageCost)} → July ${formatCurrency(julyItem.averageCost)}`,
        severity: "INFO", // CMP changes can be expected with new purchases
      });
    }

    if (juneItem.unit === julyItem.unit && costVariance <= 0.01 && cmpVariance <= 0.01) {
      consistentItems++;
    }
  }

  console.log(`✅ Item consistency validation complete:`);
  console.log(`   - ${consistentItems} items fully consistent`);
  console.log(`   - ${issues.filter(i => i.type === "UNIT_CHANGE").length} unit changes`);
  console.log(`   - ${issues.filter(i => i.type === "COST_PRICE_CHANGE").length} cost price changes`);
  console.log(`   - ${issues.filter(i => i.type === "CMP_CHANGE").length} CMP changes`);

  return { issues, consistentItems };
}

async function validateCriticalItemTransition(juneStock, julyStock) {
  console.log("\n⚠️  Validating critical item transitions...");
  
  const issues = [];
  const recoveredItems = [];
  const newCriticalItems = [];
  let consistentCriticalItems = 0;

  for (const [sku, juneItem] of juneStock) {
    const julyItem = julyStock.get(sku);
    
    if (!julyItem) continue; // Already reported elsewhere

    if (juneItem.status === "Critico" && julyItem.status === "Saudavel") {
      recoveredItems.push({
        sku: sku,
        name: juneItem.name,
        juneQuantity: juneItem.finalQuantity,
        julyQuantity: julyItem.currentQuantity,
        unit: juneItem.unit,
      });
    } else if (juneItem.status === "Saudavel" && julyItem.status === "Critico") {
      newCriticalItems.push({
        sku: sku,
        name: juneItem.name,
        juneQuantity: juneItem.finalQuantity,
        julyQuantity: julyItem.currentQuantity,
        unit: juneItem.unit,
      });
      issues.push({
        type: "NEW_CRITICAL",
        sku: sku,
        message: `${juneItem.name} became critical: June ${formatQuantity(juneItem.finalQuantity)} → July ${formatQuantity(julyItem.currentQuantity)} ${julyItem.unit}`,
        severity: "WARNING",
      });
    } else if (juneItem.status === "Critico" && julyItem.status === "Critico") {
      issues.push({
        type: "PERSISTENT_CRITICAL",
        sku: sku,
        message: `${juneItem.name} remains critical: June ${formatQuantity(juneItem.finalQuantity)} → July ${formatQuantity(julyItem.currentQuantity)} ${julyItem.unit}`,
        severity: "WARNING",
      });
    } else {
      consistentCriticalItems++;
    }
  }

  console.log(`✅ Critical item transition validation complete:`);
  console.log(`   - ${recoveredItems.length} items recovered from critical status`);
  console.log(`   - ${newCriticalItems.length} items became critical`);
  console.log(`   - ${issues.filter(i => i.type === "PERSISTENT_CRITICAL").length} items remain critical`);
  console.log(`   - ${consistentCriticalItems} items with stable healthy status`);

  return { issues, recoveredItems, newCriticalItems };
}

async function checkJulyTransactions() {
  console.log("\n📈 Checking July transactions that explain stock differences...");
  
  const julyStartDate = new Date(2026, 6, 1); // July 1, 2026
  const now = new Date();
  
  const transactions = await prisma.inventoryTransaction.findMany({
    where: {
      transactionDate: {
        gte: julyStartDate,
        lte: now,
      },
      item: {
        category: {
          in: ["Consumiveis", "Produtos de Limpeza"],
        },
      },
    },
    include: {
      item: {
        select: {
          sku: true,
          name: true,
        },
      },
    },
    orderBy: {
      transactionDate: "desc",
    },
  });

  const transactionSummary = new Map();
  for (const tx of transactions) {
    const key = tx.item.sku;
    const existing = transactionSummary.get(key) || {
      sku: tx.item.sku,
      name: tx.item.name,
      inTransactions: 0,
      outTransactions: 0,
      adjustmentTransactions: 0,
      totalIn: 0,
      totalOut: 0,
      totalAdjustment: 0,
    };

    if (tx.type === "IN") {
      existing.inTransactions++;
      existing.totalIn += Number(tx.quantity);
    } else if (tx.type === "OUT") {
      existing.outTransactions++;
      existing.totalOut += Number(tx.quantity);
    } else if (tx.type === "ADJUSTMENT") {
      existing.adjustmentTransactions++;
      existing.totalAdjustment += Number(tx.quantity);
    }

    transactionSummary.set(key, existing);
  }

  console.log(`✅ July transactions analysis:`);
  console.log(`   - ${transactions.length} total transactions`);
  console.log(`   - ${transactions.filter(t => t.type === "IN").length} IN transactions`);
  console.log(`   - ${transactions.filter(t => t.type === "OUT").length} OUT transactions`);
  console.log(`   - ${transactions.filter(t => t.type === "ADJUSTMENT").length} ADJUSTMENT transactions`);

  return { transactions, transactionSummary };
}

function generateValidationReport(validationResults) {
  const { stockValidation, consistencyValidation, criticalValidation, transactionData } = validationResults;
  const timestamp = new Date();
  
  const allIssues = [
    ...stockValidation.issues,
    ...consistencyValidation.issues,
    ...criticalValidation.issues,
  ];

  const errorCount = allIssues.filter(i => i.severity === "ERROR").length;
  const warningCount = allIssues.filter(i => i.severity === "WARNING").length;
  const infoCount = allIssues.filter(i => i.severity === "INFO").length;

  const overallStatus = errorCount > 0 ? "FAILED" : warningCount > 0 ? "WARNING" : "PASSED";

  return `# Relatório de Validação de Continuidade de Inventário
## Junho → Julho 2026

**Data da validação:** ${timestamp.toLocaleDateString("pt-PT")} às ${timestamp.toLocaleTimeString("pt-PT")}
**Status geral:** ${overallStatus}

---

## Resumo Executivo

- **Itens validados:** ${stockValidation.matchedItems.length} com continuidade perfeita
- **Variância total de stock:** ${formatQuantity(stockValidation.totalVariance)} unidades
- **Itens consistentes:** ${consistencyValidation.consistentItems}
- **Itens recuperados (crítico → saudável):** ${criticalValidation.recoveredItems.length}
- **Novos itens críticos:** ${criticalValidation.newCriticalItems.length}

### Contadores de Issues
- **Erros:** ${errorCount} ${errorCount > 0 ? "❌" : "✅"}
- **Avisos:** ${warningCount} ${warningCount > 0 ? "⚠️" : "✅"}
- **Informativos:** ${infoCount}

---

## Validação de Continuidade de Stock

${stockValidation.matchedItems.length > 0 ? `### ✅ Itens com Continuidade Perfeita (${stockValidation.matchedItems.length})

${stockValidation.matchedItems.map(item => 
  `- **${item.name}** (${item.sku}): ${formatQuantity(item.quantity)} ${item.unit}`
).join('\n')}
` : ''}

${stockValidation.issues.filter(i => i.type === "STOCK_VARIANCE").length > 0 ? `### ⚠️ Variâncias de Stock

${stockValidation.issues.filter(i => i.type === "STOCK_VARIANCE").map(issue =>
  `- **${issue.severity}**: ${issue.message}`
).join('\n')}
` : ''}

${stockValidation.issues.filter(i => i.type === "NEW_ITEM").length > 0 ? `### 📦 Novos Itens em Julho

${stockValidation.issues.filter(i => i.type === "NEW_ITEM").map(issue =>
  `- ${issue.message}`
).join('\n')}
` : ''}

${stockValidation.issues.filter(i => i.type === "MISSING_ITEM").length > 0 ? `### ❌ Itens em Falta

${stockValidation.issues.filter(i => i.type === "MISSING_ITEM").map(issue =>
  `- **ERRO**: ${issue.message}`
).join('\n')}
` : ''}

---

## Validação de Consistência

${consistencyValidation.issues.filter(i => i.type === "UNIT_CHANGE").length > 0 ? `### ❌ Mudanças de Unidade

${consistencyValidation.issues.filter(i => i.type === "UNIT_CHANGE").map(issue =>
  `- **ERRO**: ${issue.message}`
).join('\n')}
` : ''}

${consistencyValidation.issues.filter(i => i.type === "COST_PRICE_CHANGE").length > 0 ? `### 💰 Mudanças de Preço

${consistencyValidation.issues.filter(i => i.type === "COST_PRICE_CHANGE").map(issue =>
  `- **${issue.severity}**: ${issue.message}`
).join('\n')}
` : ''}

${consistencyValidation.issues.filter(i => i.type === "CMP_CHANGE").length > 0 ? `### 📊 Mudanças de CMP (Custo Médio Ponderado)

${consistencyValidation.issues.filter(i => i.type === "CMP_CHANGE").map(issue =>
  `- **INFO**: ${issue.message}`
).join('\n')}
` : ''}

---

## Validação de Itens Críticos

${criticalValidation.recoveredItems.length > 0 ? `### ✅ Itens Recuperados (Crítico → Saudável)

${criticalValidation.recoveredItems.map(item =>
  `- **${item.name}** (${item.sku}): ${formatQuantity(item.juneQuantity)} → ${formatQuantity(item.julyQuantity)} ${item.unit}`
).join('\n')}
` : ''}

${criticalValidation.newCriticalItems.length > 0 ? `### ⚠️ Novos Itens Críticos

${criticalValidation.newCriticalItems.map(item =>
  `- **${item.name}** (${item.sku}): ${formatQuantity(item.juneQuantity)} → ${formatQuantity(item.julyQuantity)} ${item.unit}`
).join('\n')}
` : ''}

${criticalValidation.issues.filter(i => i.type === "PERSISTENT_CRITICAL").length > 0 ? `### 🔴 Itens Persistentemente Críticos

${criticalValidation.issues.filter(i => i.type === "PERSISTENT_CRITICAL").map(issue =>
  `- **AVISO**: ${issue.message}`
).join('\n')}
` : ''}

---

## Análise de Transações de Julho

**Total de transações:** ${transactionData.transactions.length}
- **Entradas:** ${transactionData.transactions.filter(t => t.type === "IN").length}
- **Saídas:** ${transactionData.transactions.filter(t => t.type === "OUT").length}
- **Ajustes:** ${transactionData.transactions.filter(t => t.type === "ADJUSTMENT").length}

${Array.from(transactionData.transactionSummary.values()).filter(item => 
  item.inTransactions > 0 || item.outTransactions > 0 || item.adjustmentTransactions > 0
).length > 0 ? `### Resumo por Item

${Array.from(transactionData.transactionSummary.values())
  .filter(item => item.inTransactions > 0 || item.outTransactions > 0 || item.adjustmentTransactions > 0)
  .map(item => 
    `- **${item.name}** (${item.sku}): ${item.inTransactions} IN (+${formatQuantity(item.totalIn)}), ${item.outTransactions} OUT (-${formatQuantity(item.totalOut)}), ${item.adjustmentTransactions} ADJ (${item.totalAdjustment >= 0 ? '+' : ''}${formatQuantity(item.totalAdjustment)})`
  ).join('\n')}
` : ''}

---

## Conclusões e Recomendações

${overallStatus === "PASSED" ? `### ✅ Validação Bem-Sucedida

A continuidade do inventário entre Junho e Julho está validada. Todos os critérios foram atendidos:
- Stock final de Junho = Stock inicial de Julho
- Itens, unidades e preços consistentes
- Transição de itens críticos documentada corretamente

**Recomendação:** Proceder com a implementação da arquitetura de monitorização contínua.
` : ''}

${overallStatus === "WARNING" ? `### ⚠️ Validação com Avisos

A continuidade básica está garantida, mas existem alguns pontos de atenção:
${warningCount > 0 ? `- ${warningCount} avisos identificados que requerem revisão` : ''}
${criticalValidation.newCriticalItems.length > 0 ? `- ${criticalValidation.newCriticalItems.length} itens tornaram-se críticos` : ''}

**Recomendação:** Revisar os avisos antes de proceder. A implementação pode continuar com monitorização adicional.
` : ''}

${overallStatus === "FAILED" ? `### ❌ Validação Falhada

Foram identificados erros críticos que impedem a continuidade segura:
- ${errorCount} erros que requerem correção imediata
${stockValidation.issues.filter(i => i.type === "MISSING_ITEM").length > 0 ? `- Itens em falta do inventário de Junho` : ''}
${consistencyValidation.issues.filter(i => i.type === "UNIT_CHANGE").length > 0 ? `- Mudanças de unidade não documentadas` : ''}

**Recomendação:** Corrigir todos os erros antes de implementar a nova arquitetura.
` : ''}

---

*Relatório gerado automaticamente pelo sistema de validação de continuidade RIBBAI*
*Timestamp: ${timestamp.toISOString()}*
`;
}

async function main() {
  console.log("🔄 RIBBAI Inventory Continuity Validation: June → July 2026");
  console.log("=" .repeat(60));
  
  try {
    // Step 1: Get June final stock
    const juneStock = await getJuneFinalStock();
    
    // Step 2: Get July current stock
    const julyStock = await getJulyCurrentStock();
    
    // Step 3: Validate stock continuity
    const stockValidation = await validateStockContinuity(juneStock, julyStock);
    
    // Step 4: Validate item consistency
    const consistencyValidation = await validateItemConsistency(juneStock, julyStock);
    
    // Step 5: Validate critical item transitions
    const criticalValidation = await validateCriticalItemTransition(juneStock, julyStock);
    
    // Step 6: Analyze July transactions
    const transactionData = await checkJulyTransactions();
    
    // Step 7: Generate comprehensive report
    const report = generateValidationReport({
      stockValidation,
      consistencyValidation,
      criticalValidation,
      transactionData,
    });
    
    // Step 8: Save report
    const outputDir = path.join(
      rootDir,
      "docs",
      "operational-records",
      "2026",
      "07-july",
      "Relatorio-Mensal-Consumiveis",
      "Logs-Auditoria"
    );
    const reportPath = path.join(outputDir, `inventory-continuity-validation-${new Date().toISOString().split('T')[0]}.md`);
    
    await mkdir(outputDir, { recursive: true });
    await writeFile(reportPath, report, "utf8");
    
    // Step 9: Summary
    const totalIssues = [
      ...stockValidation.issues,
      ...consistencyValidation.issues,
      ...criticalValidation.issues,
    ];
    const errorCount = totalIssues.filter(i => i.severity === "ERROR").length;
    const warningCount = totalIssues.filter(i => i.severity === "WARNING").length;
    
    console.log("\n" + "=" .repeat(60));
    console.log("📊 VALIDATION SUMMARY");
    console.log("=" .repeat(60));
    console.log(`Status: ${errorCount > 0 ? "❌ FAILED" : warningCount > 0 ? "⚠️  WARNING" : "✅ PASSED"}`);
    console.log(`Errors: ${errorCount}`);
    console.log(`Warnings: ${warningCount}`);
    console.log(`Items with perfect continuity: ${stockValidation.matchedItems.length}`);
    console.log(`Report saved: ${reportPath}`);
    console.log("=" .repeat(60));
    
    if (errorCount > 0) {
      console.error("\n❌ Critical errors found. Review the report before proceeding.");
      process.exitCode = 1;
    } else if (warningCount > 0) {
      console.warn("\n⚠️  Warnings found. Review recommended but validation passed.");
    } else {
      console.log("\n✅ All validations passed. Inventory continuity confirmed.");
    }
    
  } catch (error) {
    console.error("\n💥 Validation failed with error:");
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(async (error) => {
  await prisma.$disconnect();
  console.error(error);
  process.exitCode = 1;
});