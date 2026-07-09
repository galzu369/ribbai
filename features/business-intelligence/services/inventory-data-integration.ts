/**
 * RIBBAI Inventory Data Integration Service
 * 
 * Integrates rich inventory markdown artifacts into the BI system:
 * - Weekly consumption trend analysis
 * - Purchasing metrics
 * - Stock variance reports 
 * - Alert summaries
 * - JSON count data
 */

import { readFileSync } from "fs";
import { join } from "path";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logging";

interface PurchasingMetrics {
  date: Date;
  reference: string;
  itemsCount: number;
  totalQuantity: number;
  totalCost: number;
  monthlyMovements?: number;
  monthlyQuantity?: number;
  monthlyCost?: number;
}

interface ConsumptionTrendItem {
  date: Date;
  category: string;
  itemName: string;
  sku: string;
  period: string;
  opening: number;
  closing: number;
  entries: number;
  exits: number;
  consumption: number;
  isAbnormal: boolean;
  historicalBase: string;
  unit: string;
}

interface AlertItem {
  date: Date;
  status: 'CRITICO' | 'ALERTA' | 'NORMAL';
  itemName: string;
  sku: string;
  currentStock: number;
  criticalThreshold: number;
  recommendedAction: string;
  unit: string;
}

interface WeeklyCountItem {
  date: Date;
  weekNumber: number;
  year: number;
  sku: string;
  itemName: string;
  unit: string;
  quantity: number;
}

export class InventoryDataIntegrationService {
  /**
   * Parse and integrate all inventory markdown artifacts
   */
  static async integrateInventoryArtifacts(): Promise<{
    success: boolean;
    processed: number;
    recordsCreated: {
      purchasingMetrics: number;
      consumptionTrends: number;
      alerts: number;
      weeklyCounts: number;
      operationalNotes: number;
    };
    errors: string[];
  }> {
    const errors: string[] = [];
    const recordsCreated = {
      purchasingMetrics: 0,
      consumptionTrends: 0,
      alerts: 0,
      weeklyCounts: 0,
      operationalNotes: 0,
    };

    let processed = 0;

    try {
      logger.info("Starting inventory artifacts integration");
      
      const { readdirSync, existsSync } = await import("fs");
      const inventoryDir = "docs/operational-records/2026/06-june/inventory-updates";
      
      if (!existsSync(inventoryDir)) {
        errors.push(`Inventory directory not found: ${inventoryDir}`);
        return { success: false, processed: 0, recordsCreated, errors };
      }

      const files = readdirSync(inventoryDir);
      logger.info(`Found ${files.length} inventory artifact files`);

      for (const file of files) {
        try {
          const filePath = join(inventoryDir, file);
          processed++;

          if (file.includes("purchasing-metrics") && file.endsWith(".md")) {
            const metrics = await this.parsePurchasingMetrics(filePath);
            if (metrics) {
              await this.storePurchasingMetrics(metrics);
              recordsCreated.purchasingMetrics++;
            }
          }
          
          else if (file.includes("consumption-trend-analysis") && file.endsWith(".md")) {
            const trends = await this.parseConsumptionTrends(filePath);
            for (const trend of trends) {
              await this.storeConsumptionTrend(trend);
              recordsCreated.consumptionTrends++;
            }
          }
          
          else if (file.includes("alert-summary") && file.endsWith(".md")) {
            const alerts = await this.parseAlerts(filePath);
            for (const alert of alerts) {
              await this.storeAlert(alert);
              recordsCreated.alerts++;
            }
          }
          
          else if (file.includes("weekly-count") && file.endsWith(".json")) {
            const counts = await this.parseWeeklyCounts(filePath);
            for (const count of counts) {
              await this.storeWeeklyCount(count);
              recordsCreated.weeklyCounts++;
            }
          }
          
          else if (file.endsWith(".md") && 
                   (file.includes("inventory-change-summary") || 
                    file.includes("inventory-movement-log") ||
                    file.includes("dashboard-metrics"))) {
            // Store as operational notes for general inventory context
            const content = readFileSync(filePath, "utf-8");
            const date = this.extractDateFromFilename(file);
            
            await prisma.operationalNote.create({
              data: {
                reportDate: date,
                noteType: "INVENTORY_CONTEXT",
                content: content.substring(0, 2000), // Truncate if too long
                author: "System",
                priority: "LOW",
                tags: ["inventory", this.getFileType(file), "automated"],
                metadata: {
                  source: "inventory_artifact",
                  filename: file,
                  type: this.getFileType(file)
                },
                createdBy: "inventory-integration-service",
              },
            });
            recordsCreated.operationalNotes++;
          }

          if (processed % 10 === 0) {
            logger.info(`Processed ${processed}/${files.length} inventory files`);
          }

        } catch (error) {
          errors.push(`Failed to process ${file}: ${error}`);
        }
      }

      logger.info("Inventory artifacts integration completed", {
        processed,
        recordsCreated,
        errorsCount: errors.length
      });

      return {
        success: errors.length === 0,
        processed,
        recordsCreated,
        errors,
      };

    } catch (error) {
      logger.error("Inventory integration failed", { error: error.message });
      return {
        success: false,
        processed,
        recordsCreated,
        errors: [`Integration failed: ${error.message}`],
      };
    }
  }

  /**
   * Parse purchasing metrics from markdown file
   */
  private static async parsePurchasingMetrics(filePath: string): Promise<PurchasingMetrics | null> {
    try {
      const content = readFileSync(filePath, "utf-8");
      const lines = content.split("\n");
      const date = this.extractDateFromFilename(filePath);

      let reference = "";
      let itemsCount = 0;
      let totalQuantity = 0;
      let totalCost = 0;
      let monthlyMovements = 0;
      let monthlyQuantity = 0;
      let monthlyCost = 0;

      for (const line of lines) {
        if (line.includes("| Referencia |")) {
          const match = lines[lines.indexOf(line) + 1]?.match(/\| .* \| (.*) \|/);
          if (match) reference = match[1].trim();
        }
        else if (line.includes("| Artigos |")) {
          const match = lines[lines.indexOf(line) + 1]?.match(/\| .* \| (\d+) \|/);
          if (match) itemsCount = parseInt(match[1]);
        }
        else if (line.includes("| Quantidade comprada |")) {
          const match = lines[lines.indexOf(line) + 1]?.match(/\| .* \| ([\d,\.]+) \|/);
          if (match) totalQuantity = parseFloat(match[1].replace(",", "."));
        }
        else if (line.includes("| Custo total compra |")) {
          const match = lines[lines.indexOf(line) + 1]?.match(/\| .* \| ([\d,\.]+) € \|/);
          if (match) totalCost = parseFloat(match[1].replace(",", "."));
        }
        else if (line.includes("| Movimentos IN |")) {
          const match = lines[lines.indexOf(line) + 1]?.match(/\| .* \| (\d+) \|/);
          if (match) monthlyMovements = parseInt(match[1]);
        }
        else if (line.includes("| Custo total compras |")) {
          const match = lines[lines.indexOf(line) + 1]?.match(/\| .* \| ([\d,\.]+) € \|/);
          if (match) monthlyCost = parseFloat(match[1].replace(",", "."));
        }
      }

      return {
        date,
        reference,
        itemsCount,
        totalQuantity,
        totalCost,
        monthlyMovements,
        monthlyQuantity,
        monthlyCost,
      };

    } catch (error) {
      logger.warn("Failed to parse purchasing metrics", { filePath, error });
      return null;
    }
  }

  /**
   * Parse consumption trends from markdown file
   */
  private static async parseConsumptionTrends(filePath: string): Promise<ConsumptionTrendItem[]> {
    try {
      const content = readFileSync(filePath, "utf-8");
      const lines = content.split("\n");
      const date = this.extractDateFromFilename(filePath);
      const trends: ConsumptionTrendItem[] = [];

      // Find table data (skip header rows)
      let inTable = false;
      for (const line of lines) {
        if (line.includes("| Categoria | Artigo | SKU |")) {
          inTable = true;
          continue;
        }
        if (inTable && line.includes("| --- |")) {
          continue; // Skip separator
        }
        if (inTable && line.startsWith("| ") && line.includes(" | ")) {
          const parts = line.split(" | ").map(p => p.replace(/^\||\|$/g, "").trim());
          
          if (parts.length >= 11) {
            const [category, itemName, sku, period, opening, closing, entries, exits, consumption, abnormal, base] = parts;
            
            trends.push({
              date,
              category,
              itemName,
              sku,
              period,
              opening: this.parseQuantityValue(opening),
              closing: this.parseQuantityValue(closing),
              entries: this.parseQuantityValue(entries),
              exits: this.parseQuantityValue(exits),
              consumption: this.parseQuantityValue(consumption),
              isAbnormal: abnormal.toLowerCase() === "sim",
              historicalBase: base,
              unit: this.extractUnit(opening) || this.extractUnit(closing) || "unidade"
            });
          }
        }
        if (inTable && line.startsWith("## ")) {
          break; // End of table
        }
      }

      return trends;

    } catch (error) {
      logger.warn("Failed to parse consumption trends", { filePath, error });
      return [];
    }
  }

  /**
   * Parse alerts from markdown file
   */
  private static async parseAlerts(filePath: string): Promise<AlertItem[]> {
    try {
      const content = readFileSync(filePath, "utf-8");
      const lines = content.split("\n");
      const date = this.extractDateFromFilename(filePath);
      const alerts: AlertItem[] = [];

      // Find table data
      let inTable = false;
      for (const line of lines) {
        if (line.includes("| Estado | Artigo | SKU |")) {
          inTable = true;
          continue;
        }
        if (inTable && line.includes("| --- |")) {
          continue;
        }
        if (inTable && line.startsWith("| ") && line.includes(" | ")) {
          const parts = line.split(" | ").map(p => p.replace(/^\||\|$/g, "").trim());
          
          if (parts.length >= 6) {
            const [status, itemName, sku, currentStock, threshold, action] = parts;
            
            alerts.push({
              date,
              status: status.toUpperCase() as 'CRITICO' | 'ALERTA' | 'NORMAL',
              itemName,
              sku,
              currentStock: this.parseQuantityValue(currentStock),
              criticalThreshold: this.parseQuantityValue(threshold),
              recommendedAction: action,
              unit: this.extractUnit(currentStock) || "unidade"
            });
          }
        }
        if (inTable && line.startsWith("## ")) {
          break;
        }
      }

      return alerts;

    } catch (error) {
      logger.warn("Failed to parse alerts", { filePath, error });
      return [];
    }
  }

  /**
   * Parse weekly counts from JSON file
   */
  private static async parseWeeklyCounts(filePath: string): Promise<WeeklyCountItem[]> {
    try {
      const content = readFileSync(filePath, "utf-8");
      const data = JSON.parse(content);
      const date = new Date(data.date);

      return data.lines.map((item: any) => ({
        date,
        weekNumber: data.weekNumber,
        year: data.year,
        sku: item.sku,
        itemName: item.name,
        unit: item.unit,
        quantity: item.quantity
      }));

    } catch (error) {
      logger.warn("Failed to parse weekly counts", { filePath, error });
      return [];
    }
  }

  /**
   * Store purchasing metrics in database
   */
  private static async storePurchasingMetrics(metrics: PurchasingMetrics): Promise<void> {
    await prisma.operationalNote.create({
      data: {
        reportDate: metrics.date,
        noteType: "PURCHASING_METRICS",
        content: `Purchasing: ${metrics.itemsCount} items, €${metrics.totalCost.toFixed(2)}`,
        author: "System",
        priority: "MEDIUM",
        tags: ["purchasing", "metrics", "inventory"],
        metadata: {
          type: "purchasing_metrics",
          reference: metrics.reference,
          itemsCount: metrics.itemsCount,
          totalQuantity: metrics.totalQuantity,
          totalCost: metrics.totalCost,
          monthlyMovements: metrics.monthlyMovements,
          monthlyCost: metrics.monthlyCost
        },
        createdBy: "inventory-integration-service",
      },
    });
  }

  /**
   * Store consumption trend in database
   */
  private static async storeConsumptionTrend(trend: ConsumptionTrendItem): Promise<void> {
    await prisma.operationalNote.create({
      data: {
        reportDate: trend.date,
        noteType: "CONSUMPTION_TREND",
        content: `${trend.itemName} (${trend.sku}): consumed ${trend.consumption} ${trend.unit}${trend.isAbnormal ? ' [ABNORMAL]' : ''}`,
        author: "System",
        priority: trend.isAbnormal ? "HIGH" : "LOW",
        tags: ["consumption", "trend", trend.category.toLowerCase().replace(/ /g, "-"), trend.isAbnormal ? "abnormal" : "normal"],
        metadata: {
          type: "consumption_trend",
          category: trend.category,
          sku: trend.sku,
          period: trend.period,
          opening: trend.opening,
          closing: trend.closing,
          consumption: trend.consumption,
          isAbnormal: trend.isAbnormal,
          historicalBase: trend.historicalBase,
          unit: trend.unit
        },
        createdBy: "inventory-integration-service",
      },
    });
  }

  /**
   * Store alert in database
   */
  private static async storeAlert(alert: AlertItem): Promise<void> {
    await prisma.operationalNote.create({
      data: {
        reportDate: alert.date,
        noteType: "INVENTORY_ALERT",
        content: `ALERT ${alert.status}: ${alert.itemName} - ${alert.currentStock} ${alert.unit} (threshold: ${alert.criticalThreshold})`,
        author: "System", 
        priority: alert.status === "CRITICO" ? "HIGH" : "MEDIUM",
        tags: ["alert", "inventory", alert.status.toLowerCase(), alert.sku.toLowerCase()],
        metadata: {
          type: "inventory_alert",
          status: alert.status,
          sku: alert.sku,
          currentStock: alert.currentStock,
          criticalThreshold: alert.criticalThreshold,
          recommendedAction: alert.recommendedAction,
          unit: alert.unit
        },
        createdBy: "inventory-integration-service",
      },
    });
  }

  /**
   * Store weekly count in database
   */
  private static async storeWeeklyCount(count: WeeklyCountItem): Promise<void> {
    await prisma.operationalNote.create({
      data: {
        reportDate: count.date,
        noteType: "WEEKLY_COUNT",
        content: `Weekly count: ${count.itemName} - ${count.quantity} ${count.unit}`,
        author: "System",
        priority: "LOW",
        tags: ["weekly-count", "inventory", "counting"],
        metadata: {
          type: "weekly_count",
          weekNumber: count.weekNumber,
          year: count.year,
          sku: count.sku,
          quantity: count.quantity,
          unit: count.unit
        },
        createdBy: "inventory-integration-service",
      },
    });
  }

  // Helper methods
  private static extractDateFromFilename(filePath: string): Date {
    const filename = filePath.split(/[/\\]/).pop() || "";
    const match = filename.match(/(\d{4}-\d{2}-\d{2})/);
    return match ? new Date(match[1]) : new Date();
  }

  private static getFileType(filename: string): string {
    if (filename.includes("purchasing-metrics")) return "purchasing";
    if (filename.includes("consumption-trend")) return "consumption";
    if (filename.includes("alert-summary")) return "alerts";
    if (filename.includes("movement-log")) return "movements";
    if (filename.includes("change-summary")) return "changes";
    if (filename.includes("dashboard-metrics")) return "dashboard";
    return "general";
  }

  private static parseQuantityValue(value: string): number {
    // Handle values like "3 caixa", "1,5 pack", "-0,5 caixa"
    const match = value.match(/([-]?[\d,\.]+)/);
    if (match) {
      return parseFloat(match[1].replace(",", "."));
    }
    return 0;
  }

  private static extractUnit(value: string): string | null {
    // Extract unit from values like "3 caixa", "1,5 pack"
    const match = value.match(/[\d,\.\-]+\s+([a-zA-Z]+)/);
    return match ? match[1] : null;
  }
}