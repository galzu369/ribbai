import { NextResponse } from "next/server";

import { logger } from "@/lib/logging";
import { getInventoryFinancialDashboard } from "@/lib/inventory-financial-analytics";

/**
 * GET /api/analytics/inventory-financials
 * 
 * Returns comprehensive inventory financial analytics including:
 * - Overall financial summary
 * - Monthly financial trends
 * - Category analysis
 * - Top consumption and value items
 * - Price trend alerts
 */
export async function GET() {
  try {
    logger.info("Inventory financial analytics API called");

    const dashboard = await getInventoryFinancialDashboard();

    return NextResponse.json({
      success: true,
      data: dashboard,
      meta: {
        generatedAt: dashboard.generatedAt.toISOString(),
        version: "1.0.0",
        dataPoints: {
          totalItems: dashboard.summary.totalItems,
          categories: dashboard.categoryAnalysis.length,
          monthsAnalyzed: dashboard.monthlyTrends.length,
          topConsumptionItems: dashboard.topConsumptionItems.length,
          topValueItems: dashboard.topValueItems.length,
          priceAlerts: dashboard.priceAlerts.length,
        },
      },
    });
  } catch (error) {
    logger.error("Failed to generate inventory financial analytics", { error });
    
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate inventory financial analytics",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}