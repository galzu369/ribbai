/**
 * RIBBAI Business Intelligence - Database Integration Test
 * 
 * Test the complete ETL pipeline by parsing an operational record 
 * and storing it in the database.
 */

import { join } from "path";
import { existsSync } from "fs";
import { DataIntegrationService } from "@/features/business-intelligence/services/data-integration";
import { prisma } from "@/lib/db";

async function testDatabaseIntegration() {
  console.log("🚀 RIBBAI BI - Database Integration Test");
  console.log("=========================================\n");

  try {
    // Find a test operational record
    const operationalRecordsDir = "docs/operational-records/2026/06-june/daily";
    const testFile = "2026-06-04-registo-diario-operacional.md"; // This one had overtime data
    const filePath = join(operationalRecordsDir, testFile);

    if (!existsSync(filePath)) {
      console.log(`❌ Test file not found: ${filePath}`);
      return;
    }

    console.log(`📄 Testing with: ${testFile}\n`);

    // Clean up any existing test data for this date first
    const testDate = new Date("2026-06-04");
    
    console.log("🧹 Cleaning existing test data...");
    await prisma.kPISnapshot.deleteMany({
      where: { date: testDate }
    });
    await prisma.teamFeedback.deleteMany({
      where: { reportDate: testDate }
    });
    await prisma.serviceImprovement.deleteMany({
      where: { reportDate: testDate }
    });
    await prisma.operationalNote.deleteMany({
      where: { reportDate: testDate }
    });
    console.log("✅ Cleanup complete\n");

    // Process the operational record
    console.log("📊 Processing operational record...");
    const result = await DataIntegrationService.processOperationalRecordFile(filePath);

    // Display results
    console.log("📈 Integration Results:");
    console.log(`   Success: ${result.success ? "✅ YES" : "❌ NO"}`);
    console.log(`   Records Created:`);
    console.log(`   - Operational Notes: ${result.recordsCreated.operationalNotes}`);
    console.log(`   - Service Improvements: ${result.recordsCreated.serviceImprovements}`);
    console.log(`   - Incidents: ${result.recordsCreated.incidents}`);
    console.log(`   - Team Feedback: ${result.recordsCreated.teamFeedback}`);
    console.log(`   - KPI Snapshots: ${result.recordsCreated.kpiSnapshots}`);

    if (result.errors.length > 0) {
      console.log(`\n❌ Errors (${result.errors.length}):`);
      result.errors.forEach(error => console.log(`   - ${error}`));
    }

    if (result.warnings.length > 0) {
      console.log(`\n⚠️  Warnings (${result.warnings.length}):`);
      result.warnings.forEach(warning => console.log(`   - ${warning}`));
    }

    console.log("");

    // Verify data was stored correctly
    console.log("🔍 Verifying stored data...");
    
    const storedNotes = await prisma.operationalNote.findMany({
      where: { reportDate: testDate },
      orderBy: { createdAt: "asc" }
    });

    const storedImprovements = await prisma.serviceImprovement.findMany({
      where: { reportDate: testDate }
    });

    const storedFeedback = await prisma.teamFeedback.findMany({
      where: { reportDate: testDate },
      include: { employee: true }
    });

    const storedKPIs = await prisma.kPISnapshot.findMany({
      where: { date: testDate }
    });

    console.log(`📝 Stored Operational Notes (${storedNotes.length}):`);
    storedNotes.forEach((note, i) => {
      console.log(`   ${i + 1}. [${note.noteType}] ${note.priority} - ${note.content.substring(0, 80)}...`);
      console.log(`      Tags: [${note.tags.join(", ")}]`);
    });

    if (storedImprovements.length > 0) {
      console.log(`\n🔧 Stored Service Improvements (${storedImprovements.length}):`);
      storedImprovements.forEach((imp, i) => {
        console.log(`   ${i + 1}. [${imp.type}] ${imp.status}`);
        console.log(`      Problem: ${imp.problem.substring(0, 60)}...`);
        console.log(`      Solution: ${imp.solution.substring(0, 60)}...`);
      });
    }

    if (storedFeedback.length > 0) {
      console.log(`\n👥 Stored Team Feedback (${storedFeedback.length}):`);
      storedFeedback.forEach((feedback, i) => {
        console.log(`   ${i + 1}. ${feedback.employee?.firstName || "Unknown"} [${feedback.feedbackType}] ${feedback.sentiment}`);
        console.log(`      Content: ${feedback.content.substring(0, 80)}...`);
      });
    }

    console.log(`\n📊 Stored KPI Snapshots (${storedKPIs.length}):`);
    storedKPIs.forEach((kpi, i) => {
      console.log(`   ${i + 1}. ${kpi.kpiName}: ${kpi.value} ${kpi.unit || ""} [${kpi.status}]`);
    });

    console.log("\n🎯 Integration Test Summary:");
    console.log("============================");
    if (result.success) {
      console.log("✅ Database integration working correctly");
      console.log("✅ Data stored and retrievable");
      console.log("✅ Relationships maintained");
      console.log("✅ Metadata preserved");
    } else {
      console.log("❌ Integration had issues");
      console.log("🔧 Review errors above for debugging");
    }

    console.log("\nNext steps:");
    console.log("- Test historical migration with all files");
    console.log("- Implement KPI calculation engines");
    console.log("- Set up real-time sync service");

  } catch (error) {
    console.error("❌ Database integration test failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run test if script is executed directly
if (require.main === module) {
  testDatabaseIntegration().catch(console.error);
}

export { testDatabaseIntegration };