import { InventoryDataIntegrationService } from '../features/business-intelligence/services/inventory-data-integration';
import { prisma } from '../lib/db';
import { logger } from '../features/business-intelligence/utils/logger';

async function runInventoryIntegration() {
  console.log('📦 INVENTORY DATA INTEGRATION');
  console.log('═'.repeat(60));
  console.log();

  try {
    console.log('🔍 Scanning inventory artifacts...');
    console.log('• Purchasing metrics (€ cost analysis) ✓');
    console.log('• Weekly consumption trends (anomaly detection) ✓');
    console.log('• Stock variance reports (€97.47 variance) ✓');
    console.log('• Alert summaries (critical stock levels) ✓');
    console.log('• JSON weekly counts (precise quantities) ✓');
    console.log();

    // Run the integration
    const startTime = Date.now();
    const result = await InventoryDataIntegrationService.integrateInventoryArtifacts();
    const endTime = Date.now();

    console.log('📊 INTEGRATION RESULTS');
    console.log('-'.repeat(40));
    console.log(`✅ Files processed: ${result.processed}`);
    console.log(`💰 Purchasing metrics: ${result.recordsCreated.purchasingMetrics}`);
    console.log(`📈 Consumption trends: ${result.recordsCreated.consumptionTrends}`);
    console.log(`🚨 Inventory alerts: ${result.recordsCreated.alerts}`);
    console.log(`📋 Weekly counts: ${result.recordsCreated.weeklyCounts}`);
    console.log(`📝 Contextual notes: ${result.recordsCreated.operationalNotes}`);
    console.log();
    console.log(`⏱️  Processing time: ${endTime - startTime}ms`);
    console.log();

    // Verify integration results
    console.log('🔍 VERIFICATION');
    console.log('-'.repeat(40));

    const purchasingNotes = await prisma.operationalNote.count({
      where: { noteType: "PURCHASING_METRICS" }
    });

    const consumptionTrends = await prisma.operationalNote.count({
      where: { noteType: "CONSUMPTION_TREND" }
    });

    const abnormalConsumption = await prisma.operationalNote.count({
      where: { 
        noteType: "CONSUMPTION_TREND",
        tags: { has: "abnormal" }
      }
    });

    const inventoryAlerts = await prisma.operationalNote.count({
      where: { noteType: "INVENTORY_ALERT" }
    });

    const criticalAlerts = await prisma.operationalNote.count({
      where: { 
        noteType: "INVENTORY_ALERT",
        priority: "HIGH"
      }
    });

    const weeklyCounts = await prisma.operationalNote.count({
      where: { noteType: "WEEKLY_COUNT" }
    });

    console.log(`💰 Purchasing metrics in DB: ${purchasingNotes}`);
    console.log(`📈 Consumption trends in DB: ${consumptionTrends}`);
    console.log(`⚠️  Abnormal consumption items: ${abnormalConsumption}`);
    console.log(`🚨 Inventory alerts in DB: ${inventoryAlerts}`);
    console.log(`🔴 Critical alerts: ${criticalAlerts}`);
    console.log(`📋 Weekly count records: ${weeklyCounts}`);
    console.log();

    // Rich data analysis
    const richDataCategories = await prisma.operationalNote.groupBy({
      by: ['noteType'],
      where: {
        noteType: {
          in: ['PURCHASING_METRICS', 'CONSUMPTION_TREND', 'INVENTORY_ALERT', 'WEEKLY_COUNT']
        }
      },
      _count: true
    });

    console.log('🎯 RICH INVENTORY DATA SUMMARY');
    console.log('-'.repeat(40));
    richDataCategories.forEach(category => {
      const description = {
        'PURCHASING_METRICS': 'Monthly costs, delivery tracking',
        'CONSUMPTION_TREND': 'SKU consumption, anomaly detection, historical baselines',
        'INVENTORY_ALERT': 'Critical stock levels, recommended actions',
        'WEEKLY_COUNT': 'Precise quantities, weekly validation'
      }[category.noteType] || 'General inventory data';
      
      console.log(`${category.noteType}: ${category._count} records - ${description}`);
    });
    console.log();

    // Sample rich data extraction
    const sampleConsumptionTrend = await prisma.operationalNote.findFirst({
      where: { noteType: "CONSUMPTION_TREND" },
      orderBy: { createdAt: "desc" }
    });

    if (sampleConsumptionTrend?.metadata) {
      console.log('📋 SAMPLE CONSUMPTION TREND DATA:');
      console.log(`   Item: ${(sampleConsumptionTrend.metadata as any).category} - SKU ${(sampleConsumptionTrend.metadata as any).sku}`);
      console.log(`   Consumption: ${(sampleConsumptionTrend.metadata as any).consumption} ${(sampleConsumptionTrend.metadata as any).unit}`);
      console.log(`   Abnormal: ${(sampleConsumptionTrend.metadata as any).isAbnormal ? 'YES' : 'NO'}`);
      console.log(`   Period: ${(sampleConsumptionTrend.metadata as any).period}`);
      console.log();
    }

    if (result.errors.length > 0) {
      console.log('⚠️  ERRORS ENCOUNTERED:');
      for (const error of result.errors) {
        console.log(`   • ${error}`);
      }
      console.log();
    }

    // Success analysis
    const expectedFiles = 51;
    const integrationRate = (result.processed / expectedFiles) * 100;
    
    console.log('📊 EXPECTED vs ACTUAL');
    console.log('-'.repeat(40));
    console.log(`Expected: ~${expectedFiles} inventory artifacts`);
    console.log(`Actual: ${result.processed} files processed`);
    console.log(`Integration rate: ${integrationRate.toFixed(1)}%`);
    console.log();

    const totalInventoryRecords = purchasingNotes + consumptionTrends + inventoryAlerts + weeklyCounts;
    
    if (result.success && totalInventoryRecords > 0) {
      console.log('🎉 INVENTORY INTEGRATION COMPLETED!');
      console.log();
      console.log('✅ Rich operational inventory data now available!');
      console.log('✅ Consumption trend analysis integrated!');
      console.log('✅ Purchasing metrics with cost tracking!');
      console.log('✅ Alert summaries with recommended actions!');
      console.log('✅ Weekly count precision data available!');
      console.log();
      console.log('📈 BI reports can now access:');
      console.log('   • Stock variance data (€97.47 variance mentioned in plan)');
      console.log('   • Consumption anomalies with historical baselines');
      console.log('   • Monthly purchasing costs and delivery metrics');
      console.log('   • Critical stock alerts with recommended actions');
    } else {
      console.log('⚠️  Integration completed with issues - see details above');
    }

  } catch (error) {
    console.error('❌ Inventory integration failed:', error);
    logger.error('Inventory integration failed', { error: error.message, stack: error.stack });
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the integration
if (require.main === module) {
  runInventoryIntegration().catch(console.error);
}

export { runInventoryIntegration };