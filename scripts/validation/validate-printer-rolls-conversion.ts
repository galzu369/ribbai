import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logging";

/**
 * Validation Script for Printer Rolls Unit Conversion
 * 
 * This script validates that the unit conversion from "saco" to "caixa"
 * for CONS-OPS-PRINTER-ROLLS was completed successfully and correctly.
 */

// Expected values after conversion
const VALIDATION_DATA = {
  sku: "CONS-OPS-PRINTER-ROLLS",
  expectedUnit: "caixa",
  expectedStock: new Prisma.Decimal("5"), // 25 sacos ÷ 5 = 5 caixas
  expectedCostPrice: new Prisma.Decimal("39.65"), // 7.93 × 5 = 39.65
  expectedStockValue: new Prisma.Decimal("198.25"), // 5 × 39.65 = 198.25
  expectedMinimumStock: new Prisma.Decimal("2"),
  expectedReorderPoint: new Prisma.Decimal("2"),
  conversionFactor: new Prisma.Decimal("5"),
  tolerance: new Prisma.Decimal("0.01"), // 1 cent tolerance for rounding
};

interface ValidationResult {
  check: string;
  expected: string;
  actual: string;
  passed: boolean;
  error?: string;
}

function formatDecimal(value: Prisma.Decimal) {
  return Number(value).toLocaleString("pt-PT", { maximumFractionDigits: 3 });
}

function formatCurrency(value: Prisma.Decimal) {
  return Number(value).toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
}

function createValidationResult(
  check: string, 
  expected: any, 
  actual: any, 
  passed: boolean,
  error?: string
): ValidationResult {
  return {
    check,
    expected: String(expected),
    actual: String(actual),
    passed,
    error,
  };
}

function validateDecimalWithTolerance(
  actual: Prisma.Decimal, 
  expected: Prisma.Decimal, 
  tolerance: Prisma.Decimal
): boolean {
  const difference = actual.sub(expected).abs();
  return difference.lte(tolerance);
}

async function validateInventoryItem(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];
  
  try {
    // Fetch the inventory item
    const item = await prisma.inventoryItem.findUnique({
      where: { sku: VALIDATION_DATA.sku },
    });
    
    if (!item) {
      results.push(createValidationResult(
        "Item Existence",
        "Item exists",
        "Item not found",
        false,
        "Inventory item not found in database"
      ));
      return results;
    }
    
    // Validate unit
    results.push(createValidationResult(
      "Unit of Measure",
      VALIDATION_DATA.expectedUnit,
      item.unit,
      item.unit === VALIDATION_DATA.expectedUnit
    ));
    
    // Validate stock quantity
    const stockValid = validateDecimalWithTolerance(
      item.currentStock,
      VALIDATION_DATA.expectedStock,
      VALIDATION_DATA.tolerance
    );
    results.push(createValidationResult(
      "Current Stock",
      formatDecimal(VALIDATION_DATA.expectedStock),
      formatDecimal(item.currentStock),
      stockValid
    ));
    
    // Validate cost price
    const costPriceValid = validateDecimalWithTolerance(
      item.costPrice,
      VALIDATION_DATA.expectedCostPrice,
      VALIDATION_DATA.tolerance
    );
    results.push(createValidationResult(
      "Cost Price",
      formatCurrency(VALIDATION_DATA.expectedCostPrice),
      formatCurrency(item.costPrice),
      costPriceValid
    ));
    
    // Validate stock value
    const stockValueValid = validateDecimalWithTolerance(
      item.stockValue,
      VALIDATION_DATA.expectedStockValue,
      VALIDATION_DATA.tolerance
    );
    results.push(createValidationResult(
      "Stock Value",
      formatCurrency(VALIDATION_DATA.expectedStockValue),
      formatCurrency(item.stockValue),
      stockValueValid
    ));
    
    // Validate minimum stock
    const minStockValid = validateDecimalWithTolerance(
      item.minimumStock,
      VALIDATION_DATA.expectedMinimumStock,
      VALIDATION_DATA.tolerance
    );
    results.push(createValidationResult(
      "Minimum Stock",
      formatDecimal(VALIDATION_DATA.expectedMinimumStock),
      formatDecimal(item.minimumStock),
      minStockValid
    ));
    
    // Validate reorder point
    const reorderPointValid = validateDecimalWithTolerance(
      item.reorderPoint,
      VALIDATION_DATA.expectedReorderPoint,
      VALIDATION_DATA.tolerance
    );
    results.push(createValidationResult(
      "Reorder Point",
      formatDecimal(VALIDATION_DATA.expectedReorderPoint),
      formatDecimal(item.reorderPoint),
      reorderPointValid
    ));
    
    // Validate average cost makes sense
    const avgCostReasonable = item.averageCost.gt(0) && item.averageCost.lte(item.costPrice.mul(1.2));
    results.push(createValidationResult(
      "Average Cost Range",
      `> 0 and ≤ ${formatCurrency(item.costPrice.mul(1.2))}`,
      formatCurrency(item.averageCost),
      avgCostReasonable
    ));
    
    // Validate stock value calculation
    const calculatedStockValue = item.currentStock.mul(item.averageCost);
    const stockValueCalculationValid = validateDecimalWithTolerance(
      item.stockValue,
      calculatedStockValue,
      VALIDATION_DATA.tolerance
    );
    results.push(createValidationResult(
      "Stock Value Calculation",
      formatCurrency(calculatedStockValue),
      formatCurrency(item.stockValue),
      stockValueCalculationValid
    ));
    
  } catch (error) {
    results.push(createValidationResult(
      "Database Query",
      "Success",
      "Error",
      false,
      error instanceof Error ? error.message : "Unknown error"
    ));
  }
  
  return results;
}

async function validateConversionTransaction(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];
  
  try {
    // Check for conversion transaction
    const conversionTransaction = await prisma.inventoryTransaction.findFirst({
      where: {
        referenceType: "UNIT_CONVERSION",
        referenceId: "UNIT-CONVERSION-2026-07-01-PRINTER-ROLLS",
        type: "ADJUSTMENT",
      },
      include: {
        item: true,
      },
    });
    
    if (!conversionTransaction) {
      results.push(createValidationResult(
        "Conversion Transaction",
        "Transaction exists",
        "Transaction not found",
        false,
        "Unit conversion transaction not found in database"
      ));
      return results;
    }
    
    // Validate transaction item
    const correctItem = conversionTransaction.item.sku === VALIDATION_DATA.sku;
    results.push(createValidationResult(
      "Transaction Item",
      VALIDATION_DATA.sku,
      conversionTransaction.item.sku,
      correctItem
    ));
    
    // Validate transaction unit
    const correctUnit = conversionTransaction.unit === VALIDATION_DATA.expectedUnit;
    results.push(createValidationResult(
      "Transaction Unit",
      VALIDATION_DATA.expectedUnit,
      conversionTransaction.unit,
      correctUnit
    ));
    
    // Validate transaction type
    const correctType = conversionTransaction.type === "ADJUSTMENT";
    results.push(createValidationResult(
      "Transaction Type",
      "ADJUSTMENT",
      conversionTransaction.type,
      correctType
    ));
    
    // Validate balance after matches current stock
    const item = await prisma.inventoryItem.findUnique({
      where: { sku: VALIDATION_DATA.sku },
    });
    
    if (item) {
      const balanceMatches = validateDecimalWithTolerance(
        conversionTransaction.balanceAfter,
        item.currentStock,
        VALIDATION_DATA.tolerance
      );
      results.push(createValidationResult(
        "Transaction Balance",
        formatDecimal(item.currentStock),
        formatDecimal(conversionTransaction.balanceAfter),
        balanceMatches
      ));
    }
    
  } catch (error) {
    results.push(createValidationResult(
      "Transaction Query",
      "Success",
      "Error",
      false,
      error instanceof Error ? error.message : "Unknown error"
    ));
  }
  
  return results;
}

async function validateNoOtherItemsChanged(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];
  
  try {
    // Check that no other items have transactions from the conversion date
    const otherTransactions = await prisma.inventoryTransaction.findMany({
      where: {
        referenceId: "UNIT-CONVERSION-2026-07-01-PRINTER-ROLLS",
        item: {
          sku: {
            not: VALIDATION_DATA.sku,
          },
        },
      },
    });
    
    const noOtherItemsChanged = otherTransactions.length === 0;
    results.push(createValidationResult(
      "Other Items Unchanged",
      "0 transactions",
      `${otherTransactions.length} transactions`,
      noOtherItemsChanged,
      noOtherItemsChanged ? undefined : "Other inventory items were modified during conversion"
    ));
    
  } catch (error) {
    results.push(createValidationResult(
      "Other Items Check",
      "Success",
      "Error",
      false,
      error instanceof Error ? error.message : "Unknown error"
    ));
  }
  
  return results;
}

async function main() {
  logger.info("Starting unit conversion validation for Printer Rolls", {
    sku: VALIDATION_DATA.sku,
    validationDate: new Date().toISOString(),
  });
  
  console.log("\n=== VALIDAÇÃO DA CONVERSÃO DE UNIDADE ===");
  console.log(`Artigo: ${VALIDATION_DATA.sku}`);
  console.log(`Data: ${new Date().toLocaleString("pt-PT")}`);
  console.log("=========================================\n");
  
  // Run all validations
  const [itemResults, transactionResults, otherItemsResults] = await Promise.all([
    validateInventoryItem(),
    validateConversionTransaction(),
    validateNoOtherItemsChanged(),
  ]);
  
  const allResults = [...itemResults, ...transactionResults, ...otherItemsResults];
  
  // Display results
  let passedCount = 0;
  let failedCount = 0;
  
  console.log("RESULTADOS DA VALIDAÇÃO:\n");
  
  for (const result of allResults) {
    const status = result.passed ? "✅ PASS" : "❌ FAIL";
    console.log(`${status} ${result.check}`);
    console.log(`   Esperado: ${result.expected}`);
    console.log(`   Actual: ${result.actual}`);
    
    if (result.error) {
      console.log(`   Erro: ${result.error}`);
    }
    
    console.log("");
    
    if (result.passed) {
      passedCount++;
    } else {
      failedCount++;
    }
  }
  
  // Summary
  console.log("=========================================");
  console.log(`RESUMO: ${passedCount} testes passaram, ${failedCount} falharam`);
  
  const allPassed = failedCount === 0;
  const statusMessage = allPassed 
    ? "✅ CONVERSÃO VALIDADA COM SUCESSO" 
    : "❌ CONVERSÃO COM PROBLEMAS DETECTADOS";
    
  console.log(statusMessage);
  console.log("=========================================\n");
  
  // Log results
  logger.info("Unit conversion validation completed", {
    sku: VALIDATION_DATA.sku,
    totalTests: allResults.length,
    passed: passedCount,
    failed: failedCount,
    allPassed,
    results: allResults.map(r => ({
      check: r.check,
      passed: r.passed,
      error: r.error,
    })),
  });
  
  // Exit with appropriate code
  process.exitCode = allPassed ? 0 : 1;
}

main()
  .catch((error: unknown) => {
    logger.error("Validation script failed", { 
      error, 
      sku: VALIDATION_DATA.sku 
    });
    console.error("❌ ERRO NA VALIDAÇÃO:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });