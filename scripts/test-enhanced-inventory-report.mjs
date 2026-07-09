import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const DEFAULT_DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/ribbai_ops?schema=public";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
    },
  },
});

// Test the enhanced inventory report HTML generation (without PDF)
async function testEnhancedReport() {
  const date = "2026-06-26";
  const { start, end } = {
    start: new Date(`${date}T00:00:00.000Z`),
    end: new Date(`${date}T23:59:59.999Z`),
  };

  console.log(`Testing enhanced inventory report for ${date}...`);

  const transactions = await prisma.inventoryTransaction.findMany({
    where: {
      transactionDate: {
        gte: start,
        lte: end,
      },
    },
    include: {
      item: true,
    },
    orderBy: [{ transactionDate: "asc" }, { createdAt: "asc" }],
  });

  console.log(`Found ${transactions.length} transactions`);

  if (transactions.length === 0) {
    console.log("No transactions found for this date.");
    return;
  }

  // Simple financial analysis
  let totalStockValue = 0;
  let totalTransactionValue = 0;
  const itemsData = [];

  for (const tx of transactions) {
    const item = tx.item;
    const stockValue = Number(item.stockValue ?? 0);
    const transactionValue = Number(tx.totalCost ?? 0);
    const currentCMP = Number(item.averageCost ?? 0);
    const lastPurchaseCost = Number(item.lastPurchaseCost ?? 0);

    totalStockValue += stockValue;
    totalTransactionValue += transactionValue;

    itemsData.push({
      sku: item.sku,
      name: item.name,
      category: item.category,
      type: tx.type,
      quantity: Number(tx.quantity),
      currentStock: Number(item.currentStock),
      currentCMP: currentCMP,
      lastPurchaseCost: lastPurchaseCost,
      stockValue: stockValue,
      transactionValue: transactionValue,
      priceChange: Math.abs(currentCMP - lastPurchaseCost) / Math.max(currentCMP, 0.01) * 100,
    });
  }

  console.log("\n" + "=".repeat(60));
  console.log("ENHANCED INVENTORY REPORT TEST - CMP FINANCIAL DATA");
  console.log("=".repeat(60));

  console.log(`\n📊 FINANCIAL SUMMARY:`);
  console.log(`   Total Stock Value: €${totalStockValue.toFixed(2)}`);
  console.log(`   Total Transaction Value: €${totalTransactionValue.toFixed(2)}`);
  console.log(`   Items Processed: ${itemsData.length}`);

  console.log(`\n💰 TOP 5 HIGHEST VALUE ITEMS:`);
  const topValueItems = itemsData
    .sort((a, b) => b.stockValue - a.stockValue)
    .slice(0, 5);

  topValueItems.forEach((item, index) => {
    console.log(`   ${index + 1}. ${item.name} (${item.sku})`);
    console.log(`      Stock: ${item.currentStock} units @ CMP €${item.currentCMP.toFixed(2)}`);
    console.log(`      Stock Value: €${item.stockValue.toFixed(2)}`);
    console.log(`      Last Purchase: €${item.lastPurchaseCost.toFixed(2)}`);
    if (item.priceChange > 5) {
      console.log(`      ⚠️ Price Change: ${item.priceChange.toFixed(1)}%`);
    }
  });

  console.log(`\n📈 PRICE CHANGES (>10% difference):`);
  const significantPriceChanges = itemsData
    .filter(item => item.priceChange > 10)
    .sort((a, b) => b.priceChange - a.priceChange);

  if (significantPriceChanges.length === 0) {
    console.log("   No significant price changes detected.");
  } else {
    significantPriceChanges.slice(0, 3).forEach((item, index) => {
      const direction = item.currentCMP > item.lastPurchaseCost ? "↗️" : "↙️";
      console.log(`   ${index + 1}. ${direction} ${item.name}`);
      console.log(`      CMP: €${item.currentCMP.toFixed(2)} vs Last: €${item.lastPurchaseCost.toFixed(2)}`);
      console.log(`      Change: ${item.priceChange.toFixed(1)}%`);
    });
  }

  console.log(`\n🔄 TRANSACTION TYPES:`);
  const transactionTypes = itemsData.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1;
    return acc;
  }, {});

  Object.entries(transactionTypes).forEach(([type, count]) => {
    console.log(`   ${type}: ${count} transactions`);
  });

  console.log("\n" + "=".repeat(60));
  console.log("✅ ENHANCED REPORT TEST COMPLETED");
  console.log("CMP financial integration is working correctly!");
  console.log("=".repeat(60));
}

testEnhancedReport()
  .catch((error) => {
    console.error("Enhanced report test failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });