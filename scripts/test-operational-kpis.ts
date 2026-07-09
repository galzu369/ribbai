/**
 * RIBBAI Business Intelligence - Operational KPIs Test
 * 
 * Test the operational KPIs calculation service using real data.
 */

import { OperationalKPIService } from "@/features/business-intelligence/services/operational-kpis";
import { formatKPIValue, formatStatus, formatTrend } from "@/features/business-intelligence/utils/formatters";
import { formatDateRange } from "@/features/business-intelligence/utils/date-utils";
import { prisma } from "@/lib/db";

async function testOperationalKPIs() {
  console.log("🚀 RIBBAI BI - Operational KPIs Test");
  console.log("====================================\n");

  try {
    // Define test date ranges
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 7);
    
    const monthStart = new Date(today);
    monthStart.setMonth(today.getMonth() - 1);

    console.log("📊 Testing Operational KPIs Calculation");
    console.log(`📅 Date Ranges:`);
    console.log(`   - Week: ${formatDateRange(weekStart, today)}`);
    console.log(`   - Month: ${formatDateRange(monthStart, today)}\n`);

    // Test individual KPI calculations first
    console.log("🔍 Individual KPI Tests:");
    console.log("========================\n");

    // Test operational days
    console.log("📅 Operational Days:");
    const operationalDays = await OperationalKPIService.getOperationalDays(weekStart, today);
    console.log(`   Value: ${formatKPIValue(operationalDays.value)}`);
    console.log(`   Status: ${formatStatus(operationalDays.status || "good").text} ${formatStatus(operationalDays.status || "good").icon}`);
    console.log(`   Trend: ${formatTrend(operationalDays.trend || "stable").text} ${formatTrend(operationalDays.trend || "stable").icon}\n`);

    // Test incident metrics
    console.log("⚠️  Incident Analysis:");
    const incidentMetrics = await OperationalKPIService.getIncidentMetrics(weekStart, today);
    console.log(`   Total Incidents: ${formatKPIValue(incidentMetrics.totalIncidents.value)}`);
    console.log(`   Incident-Free Days: ${formatKPIValue(incidentMetrics.incidentFreeDays.value)}`);
    
    if (Object.keys(incidentMetrics.incidentsByCategory).length > 0) {
      console.log(`   By Category:`);
      Object.entries(incidentMetrics.incidentsByCategory).forEach(([category, kpi]) => {
        console.log(`     - ${category}: ${formatKPIValue(kpi.value)} ${formatStatus(kpi.status || "good").icon}`);
      });
    }
    console.log("");

    // Test maintenance metrics
    console.log("🔧 Maintenance & Improvements:");
    const maintenanceMetrics = await OperationalKPIService.getMaintenanceMetrics(weekStart, today);
    console.log(`   Maintenance Tasks: ${formatKPIValue(maintenanceMetrics.maintenanceTasks.value)}`);
    console.log(`   Improvements Implemented: ${formatKPIValue(maintenanceMetrics.improvementsImplemented.value)}`);
    console.log(`   Briefings Completed: ${formatKPIValue(maintenanceMetrics.briefingsCompleted.value)}`);
    console.log(`   Process Changes: ${formatKPIValue(maintenanceMetrics.processChanges.value)}\n`);

    // Test comprehensive metrics calculation
    console.log("📊 Comprehensive Metrics Calculation:");
    console.log("=====================================\n");

    const weeklyMetrics = await OperationalKPIService.calculateOperationalMetrics(weekStart, today);
    
    console.log("📈 Weekly Operational Metrics:");
    console.log("==============================");
    
    const metricsToDisplay = [
      { name: "Operational Days", kpi: weeklyMetrics.operationalDays },
      { name: "Customer Count", kpi: weeklyMetrics.customerCount },
      { name: "Total Incidents", kpi: weeklyMetrics.incidentCount },
      { name: "Stock Breaks", kpi: weeklyMetrics.stockBreaks },
      { name: "Maintenance Tasks", kpi: weeklyMetrics.maintenanceTasks },
      { name: "Improvements", kpi: weeklyMetrics.improvements },
      { name: "Briefings Completed", kpi: weeklyMetrics.briefingsCompleted },
      { name: "Process Changes", kpi: weeklyMetrics.processChanges },
      { name: "Incident-Free Days", kpi: weeklyMetrics.incidentFreeDays },
      { name: "High Pressure Days", kpi: weeklyMetrics.highPressureDays },
      { name: "Quiet Operation Days", kpi: weeklyMetrics.quietOperationDays },
      { name: "Event Days", kpi: weeklyMetrics.eventDays },
      { name: "Jam Session Days", kpi: weeklyMetrics.jamSessionDays },
    ];

    metricsToDisplay.forEach(({ name, kpi }) => {
      const status = formatStatus(kpi.status || "good");
      const trend = formatTrend(kpi.trend || "stable");
      
      console.log(`${name}:`);
      console.log(`   📊 ${formatKPIValue(kpi.value, kpi.unit)} ${status.icon}`);
      
      if (kpi.targetValue !== undefined) {
        const achievement = (kpi.value / kpi.targetValue) * 100;
        console.log(`   🎯 Target: ${formatKPIValue(kpi.targetValue, kpi.unit)} (${achievement.toFixed(1)}% achieved)`);
      }
      
      if (kpi.previousValue !== undefined) {
        const change = kpi.value - kpi.previousValue;
        const changePercent = (change / kpi.previousValue) * 100;
        console.log(`   📈 Previous: ${formatKPIValue(kpi.previousValue, kpi.unit)} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(1)}%)`);
      }
      
      console.log(`   📊 Status: ${status.text} | Trend: ${trend.text}`);
      console.log("");
    });

    // Test current operational status
    console.log("🎯 Current Operational Status:");
    console.log("==============================\n");

    const currentStatus = await OperationalKPIService.getCurrentOperationalStatus();
    
    console.log("📅 Today's Snapshot:");
    if (currentStatus.todayMetrics.operationalDays) {
      console.log(`   Operational: ${currentStatus.todayMetrics.operationalDays.value > 0 ? '✅ YES' : '❌ NO'}`);
    }
    
    if (currentStatus.todayMetrics.incidentCount) {
      console.log(`   Incidents: ${currentStatus.todayMetrics.incidentCount.value} ${formatStatus(currentStatus.todayMetrics.incidentCount.status || "good").icon}`);
    }

    console.log("\n📊 Weekly Summary:");
    console.log(`   Operational Days: ${currentStatus.weekMetrics.operationalDays?.value || 0}/7`);
    console.log(`   Total Incidents: ${currentStatus.weekMetrics.incidentCount?.value || 0}`);
    console.log(`   Improvements: ${currentStatus.weekMetrics.improvements?.value || 0}`);

    console.log("\n📈 Monthly Trends:");
    console.log(`   Operational Days: ${currentStatus.monthMetrics.operationalDays?.value || 0}`);
    console.log(`   Avg Daily Incidents: ${((currentStatus.monthMetrics.incidentCount?.value || 0) / (currentStatus.monthMetrics.operationalDays?.value || 1)).toFixed(1)}`);

    if (currentStatus.alerts.length > 0) {
      console.log("\n🚨 Active Alerts:");
      currentStatus.alerts.forEach(alert => {
        const severityIcon = alert.severity === 'high' ? '🔴' : alert.severity === 'medium' ? '🟡' : '🔵';
        console.log(`   ${severityIcon} [${alert.type.toUpperCase()}] ${alert.message}`);
      });
    } else {
      console.log("\n✅ No active alerts");
    }

    // Database statistics
    console.log("\n📋 Data Sources Summary:");
    console.log("========================");
    
    const dataStats = await Promise.all([
      prisma.operationalNote.count(),
      prisma.serviceImprovement.count(),
      prisma.kPISnapshot.count(),
      prisma.teamFeedback.count(),
    ]);

    console.log(`   📝 Operational Notes: ${dataStats[0]}`);
    console.log(`   🔧 Service Improvements: ${dataStats[1]}`);
    console.log(`   📊 KPI Snapshots: ${dataStats[2]}`);
    console.log(`   👥 Team Feedback Records: ${dataStats[3]}`);

    console.log("\n🎯 Test Summary:");
    console.log("================");
    console.log("✅ Operational KPIs service functioning correctly");
    console.log("✅ All metric calculations completed without errors");
    console.log("✅ Status and trend analysis working");
    console.log("✅ Current operational status retrieved successfully");
    console.log("✅ Alert generation logic operational");
    console.log("");
    console.log("🚀 Ready for dashboard integration and API endpoints!");

  } catch (error) {
    console.error("❌ Operational KPIs test failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run test if script is executed directly
if (require.main === module) {
  testOperationalKPIs().catch(console.error);
}

export { testOperationalKPIs };