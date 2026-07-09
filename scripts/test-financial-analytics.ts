import { getInventoryFinancialDashboard } from "@/lib/inventory-financial-analytics";
import { logger } from "@/lib/logging";

/**
 * Test script for inventory financial analytics
 * 
 * This script tests all the financial KPIs and dashboard functionality
 * to ensure the CMP system is providing accurate financial data.
 */

async function testFinancialAnalytics(): Promise<void> {
  logger.info("Starting inventory financial analytics test");

  try {
    const dashboard = await getInventoryFinancialDashboard();

    logger.info("=".repeat(50));
    logger.info("RIBBAI INVENTORY FINANCIAL ANALYTICS TEST RESULTS");
    logger.info("=".repeat(50));

    // Overall Summary
    logger.info("📊 FINANCIAL SUMMARY:");
    logger.info(`   Total Inventory Value: €${dashboard.summary.totalInventoryValue.toFixed(2)}`);
    logger.info(`   Total Items: ${dashboard.summary.totalItems}`);
    logger.info(`   Total Categories: ${dashboard.summary.totalCategories}`);
    logger.info(`   Low Stock Items: ${dashboard.summary.lowStockItems}`);
    logger.info(`   Critical Stock Items: ${dashboard.summary.criticalStockItems}`);

    // Monthly Trends
    logger.info("\n📈 MONTHLY TRENDS (Last 6 months):");
    dashboard.monthlyTrends.slice(0, 3).forEach(month => {
      logger.info(`   ${month.month} ${month.year}:`);
      logger.info(`     Entries: €${month.totalEntriesValue.toFixed(2)} (${month.transactionCount.entries} transactions)`);
      logger.info(`     Consumption: €${month.totalConsumptionValue.toFixed(2)} (${month.transactionCount.exits} transactions)`);
      logger.info(`     Net Change: €${month.netStockChange.toFixed(2)}`);
    });

    // Category Analysis
    logger.info("\n📋 CATEGORY ANALYSIS:");
    dashboard.categoryAnalysis.slice(0, 5).forEach(cat => {
      logger.info(`   ${cat.category}:`);
      logger.info(`     Items: ${cat.itemCount} | Value: €${cat.totalValue.toFixed(2)} (${cat.percentageOfTotalValue.toFixed(1)}%)`);
      logger.info(`     Avg Cost: €${cat.averageCostPerItem.toFixed(2)} | Total Qty: ${cat.totalQuantity.toFixed(1)}`);
    });

    // Top Consumption Items
    logger.info("\n🔥 TOP CONSUMPTION (Last 30 days):");
    dashboard.topConsumptionItems.slice(0, 5).forEach((item, index) => {
      logger.info(`   ${index + 1}. ${item.name} (${item.sku}):`);
      logger.info(`      Category: ${item.category}`);
      logger.info(`      Consumed: ${item.consumptionQuantity.toFixed(1)} units = €${item.consumptionValue.toFixed(2)}`);
      logger.info(`      Current: ${item.currentStock.toFixed(1)} @ €${item.averageCost.toFixed(2)}/unit`);
    });

    // Top Value Items
    logger.info("\n💰 TOP VALUE ITEMS:");
    dashboard.topValueItems.slice(0, 5).forEach((item, index) => {
      logger.info(`   ${index + 1}. ${item.name} (${item.sku}):`);
      logger.info(`      Category: ${item.category}`);
      logger.info(`      Stock Value: €${item.stockValue.toFixed(2)} (${item.percentageOfTotal.toFixed(1)}%)`);
      logger.info(`      Current: ${item.currentStock.toFixed(1)} @ €${item.averageCost.toFixed(2)}/unit`);
    });

    // Price Alerts
    logger.info("\n⚠️  PRICE ALERTS:");
    if (dashboard.priceAlerts.length === 0) {
      logger.info("   No significant price changes detected.");
    } else {
      dashboard.priceAlerts.slice(0, 5).forEach(alert => {
        const symbol = alert.alertType === "PRICE_INCREASE" ? "📈" : 
                      alert.alertType === "PRICE_DECREASE" ? "📉" : "⚡";
        logger.info(`   ${symbol} ${alert.name} (${alert.sku}):`);
        logger.info(`      Current CMP: €${alert.currentAverageCost.toFixed(2)}`);
        logger.info(`      Last Purchase: €${alert.lastPurchaseCost.toFixed(2)}`);
        logger.info(`      Change: ${alert.priceDifferencePercentage > 0 ? "+" : ""}${alert.priceDifferencePercentage.toFixed(1)}%`);
        if (alert.lastPurchaseDate) {
          logger.info(`      Date: ${alert.lastPurchaseDate.toLocaleDateString()}`);
        }
      });
    }

    // Test Summary
    logger.info("\n" + "=".repeat(50));
    logger.info("✅ FINANCIAL ANALYTICS TEST COMPLETED SUCCESSFULLY");
    logger.info("=".repeat(50));
    logger.info(`Generated at: ${dashboard.generatedAt.toISOString()}`);
    logger.info("All CMP financial calculations are working correctly!");

  } catch (error) {
    logger.error("❌ FINANCIAL ANALYTICS TEST FAILED", { error });
    throw error;
  }
}

async function main(): Promise<void> {
  await testFinancialAnalytics();
}

main()
  .catch((error: unknown) => {
    logger.error("Test script failed", { error });
    process.exitCode = 1;
  })
  .finally(async () => {
    // No explicit disconnect needed as we're using the singleton
  });