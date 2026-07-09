import { DataIntegrationService } from '../features/business-intelligence/services/data-integration';
import { prisma } from '../lib/db';
import { logger } from '../features/business-intelligence/utils/logger';

async function runCompleteDataMigration() {
  console.log('🚀 COMPLETE DATA MIGRATION - June 2026');
  console.log('═'.repeat(60));
  console.log();

  try {
    console.log('📊 Starting migration with fixed parsers...');
    console.log('• Table format support for service improvements ✓');
    console.log('• Table format support for incidents ✓');
    console.log('• Enhanced team feedback parsing ✓');
    console.log('• Section title variants support ✓');
    console.log('• Overtime data persistence ✓');
    console.log('• Weekly candidates storage ✓');
    console.log('• Inventory context preservation ✓');
    console.log();

    // Run the complete migration
    const startTime = Date.now();
    const result = await DataIntegrationService.migrateHistoricalRecords();
    const endTime = Date.now();

    console.log('📈 MIGRATION RESULTS');
    console.log('-'.repeat(40));
    console.log(`✅ Files processed: ${result.processed}`);
    console.log(`📝 Operational notes: ${result.summary.operationalNotes}`);
    console.log(`🚀 Service improvements: ${result.summary.serviceImprovements}`);
    console.log(`⚠️  Incidents: ${result.summary.incidents}`);
    console.log(`👥 Team feedback: ${result.summary.teamFeedback}`);
    console.log(`⏰ Overtime records: ${result.summary.overtimeRecords}`);
    console.log(`📊 KPI snapshots: ${result.summary.kpiSnapshots}`);
    console.log();
    console.log(`⏱️  Processing time: ${endTime - startTime}ms`);
    console.log();

    // Verify results
    console.log('🔍 VERIFICATION');
    console.log('-'.repeat(40));

    const totalOperationalNotes = await prisma.operationalNote.count();
    const serviceImprovements = await prisma.serviceImprovement.count();
    const teamFeedback = await prisma.teamFeedback.count();
    const kpiSnapshots = await prisma.kPISnapshot.count();

    console.log(`📋 Total operational notes in DB: ${totalOperationalNotes}`);
    console.log(`🚀 Total service improvements in DB: ${serviceImprovements}`);
    console.log(`👥 Total team feedback in DB: ${teamFeedback}`);
    console.log(`📊 Total KPI snapshots in DB: ${kpiSnapshots}`);
    console.log();

    // Check for overtime in attendance
    const attendanceWithOvertime = await prisma.attendance.count({
      where: {
        overtimeHours: {
          gt: 0
        }
      }
    });

    console.log(`⏰ Attendance records with overtime: ${attendanceWithOvertime}`);

    // Check for weekly candidates and inventory context
    const weeklyCandidates = await prisma.operationalNote.count({
      where: { noteType: "WEEKLY_CANDIDATE" }
    });

    const inventoryContext = await prisma.operationalNote.count({
      where: { noteType: "INVENTORY_CONTEXT" }
    });

    console.log(`📋 Weekly report candidates: ${weeklyCandidates}`);
    console.log(`📦 Inventory context notes: ${inventoryContext}`);
    console.log();

    if (result.errors.length > 0) {
      console.log('⚠️  ERRORS ENCOUNTERED:');
      for (const error of result.errors) {
        console.log(`   • ${error}`);
      }
      console.log();
    }

    // Expected vs Actual analysis
    console.log('📊 EXPECTED vs ACTUAL');
    console.log('-'.repeat(40));
    console.log(`Expected: ~22 daily records processed`);
    console.log(`Actual: ${result.processed} files processed`);
    console.log();
    console.log(`Expected: ~154 KPI snapshots (7 × 22 days)`);
    console.log(`Actual: ${kpiSnapshots} KPI snapshots`);
    console.log();

    const improvementRate = serviceImprovements > 0 ? 'SUCCESS' : 'NEEDS REVIEW';
    const teamFeedbackRate = teamFeedback > 0 ? 'SUCCESS' : 'NEEDS REVIEW';
    
    console.log(`Service Improvements Status: ${improvementRate}`);
    console.log(`Team Feedback Status: ${teamFeedbackRate}`);
    console.log();

    if (serviceImprovements === 0) {
      console.log('⚠️  No service improvements found - check parser format compatibility');
    }

    if (teamFeedback === 0) {
      console.log('⚠️  No team feedback found - check employee name extraction');
    }

    console.log('🎉 DATA MIGRATION COMPLETED!');
    console.log();
    
    if (result.errors.length === 0 && serviceImprovements > 0 && teamFeedback > 0) {
      console.log('✅ All parsers working correctly!');
      console.log('✅ Rich operational data now available for BI reports!');
    } else {
      console.log('⚠️  Some issues detected - see details above');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    logger.error('Data migration failed', { error: error.message, stack: error.stack });
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
if (require.main === module) {
  runCompleteDataMigration().catch(console.error);
}

export { runCompleteDataMigration };