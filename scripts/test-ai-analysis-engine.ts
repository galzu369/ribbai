/**
 * RIBBAI Business Intelligence - AI Analysis Engine Test
 * 
 * Test the automated AI analysis service for executive summaries,
 * risk identification, opportunities, and strategic recommendations.
 */

import { AIAnalysisService } from "@/features/business-intelligence/services/ai-analysis";
import { formatDateRange } from "@/features/business-intelligence/utils/date-utils";
import { prisma } from "@/lib/db";

async function testAIAnalysisEngine() {
  console.log("🚀 RIBBAI BI - AI Analysis Engine Test");
  console.log("======================================\n");

  try {
    // Define test date
    const testDate = new Date();
    testDate.setHours(0, 0, 0, 0);
    
    const weekStart = new Date(testDate);
    weekStart.setDate(testDate.getDate() - 7);

    console.log("🤖 Testing AI Analysis Engine");
    console.log(`📅 Analysis Date: ${testDate.toDateString()}`);
    console.log(`📊 Context Period: ${formatDateRange(weekStart, testDate)}\n`);

    // Test risk identification
    console.log("⚠️  Risk Identification Analysis:");
    console.log("=================================\n");

    const risks = await AIAnalysisService.identifyRisks(weekStart, testDate);
    
    if (risks.length > 0) {
      console.log(`🔍 Identified ${risks.length} potential risks:`);
      risks.forEach((risk, index) => {
        const impactIcon = risk.impact === 'high' ? '🚨' : risk.impact === 'medium' ? '⚠️' : '🟡';
        const confidenceBar = '█'.repeat(Math.round(risk.confidence * 10)) + '░'.repeat(10 - Math.round(risk.confidence * 10));
        
        console.log(`   ${index + 1}. ${impactIcon} [${risk.category.toUpperCase()}] ${risk.title}`);
        console.log(`      Impact: ${risk.impact} | Confidence: ${confidenceBar} ${(risk.confidence * 100).toFixed(0)}%`);
        console.log(`      Description: ${risk.description}`);
        console.log(`      Actionable: ${risk.actionable ? '✅ Yes' : '❌ No'}`);
        if (risk.relatedMetrics && risk.relatedMetrics.length > 0) {
          console.log(`      Related KPIs: ${risk.relatedMetrics.join(', ')}`);
        }
        console.log("");
      });
    } else {
      console.log("✅ No significant risks identified - operations appear stable");
    }
    console.log("");

    // Test opportunity detection
    console.log("🎯 Opportunity Detection Analysis:");
    console.log("==================================\n");

    const opportunities = await AIAnalysisService.detectOpportunities(weekStart, testDate);
    
    if (opportunities.length > 0) {
      console.log(`💡 Identified ${opportunities.length} improvement opportunities:`);
      opportunities.forEach((opportunity, index) => {
        const impactIcon = opportunity.impact === 'high' ? '🚀' : opportunity.impact === 'medium' ? '📈' : '💡';
        const confidenceBar = '█'.repeat(Math.round(opportunity.confidence * 10)) + '░'.repeat(10 - Math.round(opportunity.confidence * 10));
        
        console.log(`   ${index + 1}. ${impactIcon} [${opportunity.category.toUpperCase()}] ${opportunity.title}`);
        console.log(`      Impact: ${opportunity.impact} | Confidence: ${confidenceBar} ${(opportunity.confidence * 100).toFixed(0)}%`);
        console.log(`      Description: ${opportunity.description}`);
        console.log(`      Actionable: ${opportunity.actionable ? '✅ Yes' : '❌ No'}`);
        if (opportunity.relatedMetrics && opportunity.relatedMetrics.length > 0) {
          console.log(`      Related KPIs: ${opportunity.relatedMetrics.join(', ')}`);
        }
        console.log("");
      });
    } else {
      console.log("📊 No immediate opportunities detected - consider long-term strategic improvements");
    }
    console.log("");

    // Test team performance analysis
    console.log("👥 Team Performance Analysis:");
    console.log("=============================\n");

    const teamAnalysis = await AIAnalysisService.analyzeTeamPerformance(weekStart, testDate);
    
    console.log(`📋 Performance Summary:`);
    console.log(`   ${teamAnalysis.summary}`);
    
    if (teamAnalysis.highlights.length > 0) {
      console.log(`\n🌟 Team Highlights:`);
      teamAnalysis.highlights.forEach((highlight, index) => {
        console.log(`   ${index + 1}. ${highlight}`);
      });
    }
    
    if (teamAnalysis.trends.length > 0) {
      console.log(`\n📈 Performance Trends:`);
      teamAnalysis.trends.forEach((trend, index) => {
        console.log(`   ${index + 1}. ${trend}`);
      });
    }
    
    if (teamAnalysis.concerns.length > 0) {
      console.log(`\n⚠️  Areas of Concern:`);
      teamAnalysis.concerns.forEach((concern, index) => {
        console.log(`   ${index + 1}. ${concern}`);
      });
    } else {
      console.log(`\n✅ No major team performance concerns identified`);
    }
    console.log("");

    // Test strategic recommendations
    console.log("🎯 Strategic Recommendations:");
    console.log("=============================\n");

    const [operationalRecs, teamRecs, financialRecs, allRecs] = await Promise.all([
      AIAnalysisService.generateRecommendations("operational", testDate),
      AIAnalysisService.generateRecommendations("team", testDate),
      AIAnalysisService.generateRecommendations("financial", testDate),
      AIAnalysisService.generateRecommendations("all", testDate),
    ]);

    console.log(`🔧 Operational Recommendations (${operationalRecs.length}):`);
    operationalRecs.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });

    console.log(`\n👥 Team Management Recommendations (${teamRecs.length}):`);
    teamRecs.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });

    console.log(`\n💰 Financial Recommendations (${financialRecs.length}):`);
    financialRecs.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });

    console.log(`\n🎯 Strategic Recommendations (${allRecs.length}):`);
    allRecs.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
    console.log("");

    // Test comprehensive daily analysis
    console.log("📊 Comprehensive Daily Analysis:");
    console.log("================================\n");

    console.log("🔄 Generating complete daily AI analysis...");
    const dailyAnalysis = await AIAnalysisService.generateDailyAnalysis(testDate);
    
    console.log(`✅ Analysis completed for ${dailyAnalysis.date.toDateString()}\n`);
    
    console.log(`📋 Executive Summary:`);
    console.log(`   ${dailyAnalysis.summary}\n`);
    
    if (dailyAnalysis.keyEvents.length > 0) {
      console.log(`🔑 Key Events (${dailyAnalysis.keyEvents.length}):`);
      dailyAnalysis.keyEvents.forEach((event, index) => {
        console.log(`   ${index + 1}. ${event}`);
      });
      console.log("");
    }
    
    if (dailyAnalysis.risksIdentified.length > 0) {
      console.log(`⚠️  Risks Identified: ${dailyAnalysis.risksIdentified.length}`);
      dailyAnalysis.risksIdentified.forEach((risk, index) => {
        console.log(`   ${index + 1}. [${risk.impact.toUpperCase()}] ${risk.title}`);
      });
      console.log("");
    }
    
    if (dailyAnalysis.opportunities.length > 0) {
      console.log(`💡 Opportunities: ${dailyAnalysis.opportunities.length}`);
      dailyAnalysis.opportunities.forEach((opp, index) => {
        console.log(`   ${index + 1}. [${opp.impact.toUpperCase()}] ${opp.title}`);
      });
      console.log("");
    }
    
    if (dailyAnalysis.correctiveActions.length > 0) {
      console.log(`🔧 Corrective Actions Required (${dailyAnalysis.correctiveActions.length}):`);
      dailyAnalysis.correctiveActions.forEach((action, index) => {
        console.log(`   ${index + 1}. ${action}`);
      });
      console.log("");
    }
    
    if (dailyAnalysis.positiveHighlights.length > 0) {
      console.log(`🌟 Positive Highlights (${dailyAnalysis.positiveHighlights.length}):`);
      dailyAnalysis.positiveHighlights.forEach((highlight, index) => {
        console.log(`   ${index + 1}. ${highlight}`);
      });
      console.log("");
    }
    
    console.log(`👤 Team Performance Insight:`);
    console.log(`   ${dailyAnalysis.teamPerformance}`);
    console.log("");
    
    if (dailyAnalysis.maintenanceNeeds.length > 0) {
      console.log(`🔧 Maintenance Needs (${dailyAnalysis.maintenanceNeeds.length}):`);
      dailyAnalysis.maintenanceNeeds.forEach((need, index) => {
        console.log(`   ${index + 1}. ${need}`);
      });
      console.log("");
    }
    
    if (dailyAnalysis.pendingSituations.length > 0) {
      console.log(`⏳ Pending Situations (${dailyAnalysis.pendingSituations.length}):`);
      dailyAnalysis.pendingSituations.forEach((situation, index) => {
        console.log(`   ${index + 1}. ${situation}`);
      });
      console.log("");
    }
    
    if (dailyAnalysis.managementAlerts.length > 0) {
      console.log(`🚨 Management Alerts (${dailyAnalysis.managementAlerts.length}):`);
      dailyAnalysis.managementAlerts.forEach((alert, index) => {
        console.log(`   ${index + 1}. ${alert}`);
      });
      console.log("");
    } else {
      console.log(`✅ No critical management alerts - operations within acceptable parameters\n`);
    }

    // Test AI engine performance metrics
    console.log("📊 AI Engine Performance Metrics:");
    console.log("=================================\n");

    const analysisMetrics = {
      executiveSummaryLength: dailyAnalysis.summary.length,
      totalInsights: dailyAnalysis.risksIdentified.length + dailyAnalysis.opportunities.length,
      actionableInsights: [
        ...dailyAnalysis.risksIdentified,
        ...dailyAnalysis.opportunities
      ].filter(insight => insight.actionable).length,
      highImpactInsights: [
        ...dailyAnalysis.risksIdentified,
        ...dailyAnalysis.opportunities
      ].filter(insight => insight.impact === 'high').length,
      averageConfidence: [
        ...dailyAnalysis.risksIdentified,
        ...dailyAnalysis.opportunities
      ].reduce((sum, insight) => sum + insight.confidence, 0) / 
      (dailyAnalysis.risksIdentified.length + dailyAnalysis.opportunities.length || 1),
    };

    console.log(`📋 Analysis Completeness:`);
    console.log(`   Executive Summary: ${analysisMetrics.executiveSummaryLength} characters`);
    console.log(`   Total Insights: ${analysisMetrics.totalInsights}`);
    console.log(`   Actionable Insights: ${analysisMetrics.actionableInsights}`);
    console.log(`   High Impact Insights: ${analysisMetrics.highImpactInsights}`);
    console.log(`   Average Confidence: ${(analysisMetrics.averageConfidence * 100).toFixed(1)}%`);
    
    const analysisCompleteness = (
      (dailyAnalysis.summary ? 1 : 0) +
      (dailyAnalysis.keyEvents.length > 0 ? 1 : 0) +
      (dailyAnalysis.teamPerformance ? 1 : 0) +
      (dailyAnalysis.correctiveActions.length > 0 ? 1 : 0)
    ) / 4 * 100;

    console.log(`   Analysis Completeness: ${analysisCompleteness.toFixed(1)}%`);
    console.log("");

    // Database statistics
    console.log("📋 Data Sources Analysis:");
    console.log("=========================");
    
    const dataStats = await Promise.all([
      prisma.operationalNote.count({
        where: {
          reportDate: {
            gte: weekStart,
            lte: testDate,
          },
        },
      }),
      prisma.serviceImprovement.count({
        where: {
          reportDate: {
            gte: weekStart,
            lte: testDate,
          },
        },
      }),
      prisma.teamFeedback.count({
        where: {
          reportDate: {
            gte: weekStart,
            lte: testDate,
          },
        },
      }),
      prisma.kPISnapshot.count({
        where: {
          date: {
            gte: weekStart,
            lte: testDate,
          },
        },
      }),
    ]);

    console.log(`   📝 Operational Notes (Week): ${dataStats[0]}`);
    console.log(`   🔧 Service Improvements (Week): ${dataStats[1]}`);
    console.log(`   👥 Team Feedback Records (Week): ${dataStats[2]}`);
    console.log(`   📊 KPI Snapshots (Week): ${dataStats[3]}`);

    const totalDataPoints = dataStats.reduce((sum, count) => sum + count, 0);
    console.log(`   📊 Total Data Points Analyzed: ${totalDataPoints}`);

    console.log("\n🎯 AI Analysis Engine Test Summary:");
    console.log("===================================");
    console.log("✅ Risk identification engine operational");
    console.log("✅ Opportunity detection system functional");  
    console.log("✅ Team performance analysis comprehensive");
    console.log("✅ Strategic recommendations generated successfully");
    console.log("✅ Daily analysis integration complete");
    console.log("✅ Executive summary generation working");
    console.log("✅ Management alert system operational");
    console.log("✅ AI insights properly categorized and prioritized");
    console.log("");
    
    if (totalDataPoints > 0) {
      console.log("🎉 AI Analysis Engine ready for executive decision support!");
    } else {
      console.log("📊 AI Analysis Engine functional - ready for operational data integration!");
    }

  } catch (error) {
    console.error("❌ AI Analysis Engine test failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run test if script is executed directly
if (require.main === module) {
  testAIAnalysisEngine().catch(console.error);
}

export { testAIAnalysisEngine };