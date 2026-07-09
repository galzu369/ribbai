import { Prisma } from "@prisma/client";

/**
 * RIBBAI Inventory Financial Engine
 * Weighted-Average Cost (CMP) Management System
 * 
 * This module implements the CMP algorithm for inventory valuation
 * following accounting best practices for cost management.
 */

export interface CMPCalculationInput {
  currentStock: Prisma.Decimal;
  currentAverageCost: Prisma.Decimal;
  incomingQuantity: Prisma.Decimal;
  incomingUnitCost: Prisma.Decimal;
}

export interface CMPCalculationResult {
  newAverageCost: Prisma.Decimal;
  newStockValue: Prisma.Decimal;
  newTotalQuantity: Prisma.Decimal;
  entryValue: Prisma.Decimal;
}

export interface StockExitCalculationInput {
  currentStock: Prisma.Decimal;
  currentAverageCost: Prisma.Decimal;
  exitQuantity: Prisma.Decimal;
}

export interface StockExitCalculationResult {
  consumptionValue: Prisma.Decimal;
  newStockValue: Prisma.Decimal;
  newTotalQuantity: Prisma.Decimal;
  averageCost: Prisma.Decimal; // Remains unchanged for exits
}

/**
 * Calculate new weighted-average cost when stock comes in
 * 
 * CMP Formula:
 * New Average Cost = (Current Stock Value + Entry Value) / (Current Stock + Entry Quantity)
 * 
 * Where:
 * - Current Stock Value = Current Stock × Current Average Cost  
 * - Entry Value = Entry Quantity × Entry Unit Cost
 */
export function calculateCMPForStockEntry(input: CMPCalculationInput): CMPCalculationResult {
  const { currentStock, currentAverageCost, incomingQuantity, incomingUnitCost } = input;
  
  // Current stock value (existing inventory value)
  const currentStockValue = currentStock.mul(currentAverageCost);
  
  // New entry value
  const entryValue = incomingQuantity.mul(incomingUnitCost);
  
  // New total quantity after entry
  const newTotalQuantity = currentStock.add(incomingQuantity);
  
  // Calculate new weighted-average cost
  let newAverageCost: Prisma.Decimal;
  
  if (newTotalQuantity.eq(0)) {
    // Edge case: no stock after transaction
    newAverageCost = new Prisma.Decimal(0);
  } else {
    // Standard CMP calculation
    const totalValue = currentStockValue.add(entryValue);
    newAverageCost = totalValue.div(newTotalQuantity);
  }
  
  // New stock value = New Quantity × New Average Cost
  const newStockValue = newTotalQuantity.mul(newAverageCost);
  
  return {
    newAverageCost,
    newStockValue,
    newTotalQuantity,
    entryValue,
  };
}

/**
 * Calculate consumption value when stock goes out
 * 
 * For stock exits, we use the current average cost to value the consumption
 * but do not recalculate the average cost (it remains unchanged).
 */
export function calculateConsumptionValue(input: StockExitCalculationInput): StockExitCalculationResult {
  const { currentStock, currentAverageCost, exitQuantity } = input;
  
  // Consumption value = Exit Quantity × Current Average Cost
  const consumptionValue = exitQuantity.mul(currentAverageCost);
  
  // New quantity after exit
  const newTotalQuantity = currentStock.sub(exitQuantity);
  
  // New stock value = Remaining Quantity × Same Average Cost
  const newStockValue = newTotalQuantity.mul(currentAverageCost);
  
  return {
    consumptionValue,
    newStockValue,
    newTotalQuantity,
    averageCost: currentAverageCost, // Unchanged for exits
  };
}

/**
 * Generate CMP update data for Prisma operations
 * This helper creates the data object needed to update InventoryItem with CMP fields
 */
export function generateCMPUpdateData(
  calculation: CMPCalculationResult,
  lastPurchaseCost: Prisma.Decimal,
  lastPurchaseDate: Date
) {
  return {
    averageCost: calculation.newAverageCost,
    stockValue: calculation.newStockValue,
    currentStock: calculation.newTotalQuantity,
    lastPurchaseCost,
    lastPurchaseDate,
  };
}

/**
 * Generate stock exit update data for Prisma operations
 */
export function generateStockExitUpdateData(calculation: StockExitCalculationResult) {
  return {
    stockValue: calculation.newStockValue,
    currentStock: calculation.newTotalQuantity,
    // averageCost remains unchanged for exits
  };
}

/**
 * Validate CMP calculation inputs
 */
export function validateCMPInputs(input: CMPCalculationInput): void {
  if (input.currentStock.lt(0)) {
    throw new Error("Current stock cannot be negative");
  }
  if (input.incomingQuantity.lte(0)) {
    throw new Error("Incoming quantity must be positive");
  }
  if (input.incomingUnitCost.lt(0)) {
    throw new Error("Incoming unit cost cannot be negative");
  }
}

/**
 * Validate stock exit inputs
 */
export function validateStockExitInputs(input: StockExitCalculationInput): void {
  if (input.currentStock.lt(0)) {
    throw new Error("Current stock cannot be negative");
  }
  if (input.exitQuantity.lte(0)) {
    throw new Error("Exit quantity must be positive");
  }
  if (input.exitQuantity.gt(input.currentStock)) {
    throw new Error("Cannot exit more stock than available");
  }
  if (input.currentAverageCost.lt(0)) {
    throw new Error("Current average cost cannot be negative");
  }
}

// ============================================================================
// UNIT CONVERSION SUPPORT
// ============================================================================

export interface UnitConversionInput {
  currentStock: Prisma.Decimal;
  currentAverageCost: Prisma.Decimal;
  conversionFactor: Prisma.Decimal;
  newUnitPrice: Prisma.Decimal;
}

export interface UnitConversionResult {
  newStock: Prisma.Decimal;
  newAverageCost: Prisma.Decimal;
  newStockValue: Prisma.Decimal;
  oldStockValue: Prisma.Decimal;
}

/**
 * Calculate unit conversion preserving stock value
 * 
 * When converting between units (e.g., saco → caixa), we need to:
 * 1. Convert the quantity based on the conversion factor
 * 2. Adjust the average cost to maintain the same total stock value
 * 3. Update the cost price to the new unit price
 * 
 * Example: 25 sacos × 7.93€/saco → 5 caixas × 39.65€/caixa
 * Total value remains: 198.25€
 */
export function convertUnitWithCMP(input: UnitConversionInput): UnitConversionResult {
  const { currentStock, currentAverageCost, conversionFactor } = input;
  
  // Calculate current stock value (to be preserved)
  const oldStockValue = currentStock.mul(currentAverageCost);
  
  // Convert quantity (divide by conversion factor for saco→caixa)
  const newStock = currentStock.div(conversionFactor);
  
  // Calculate new average cost to maintain same total value
  let newAverageCost: Prisma.Decimal;
  
  if (newStock.eq(0)) {
    // Edge case: no stock after conversion
    newAverageCost = new Prisma.Decimal(0);
  } else {
    // Preserve stock value: New Average Cost = Old Stock Value / New Quantity
    newAverageCost = oldStockValue.div(newStock);
  }
  
  // New stock value should equal old stock value (value preservation)
  const newStockValue = newStock.mul(newAverageCost);
  
  return {
    newStock,
    newAverageCost,
    newStockValue,
    oldStockValue,
  };
}

/**
 * Generate unit conversion update data for Prisma operations
 */
export function generateUnitConversionUpdateData(
  conversion: UnitConversionResult,
  newUnit: string,
  newCostPrice: Prisma.Decimal,
  newMinimumStock?: Prisma.Decimal,
  newReorderPoint?: Prisma.Decimal
) {
  const updateData: Record<string, unknown> = {
    unit: newUnit,
    currentStock: conversion.newStock,
    averageCost: conversion.newAverageCost,
    stockValue: conversion.newStockValue,
    costPrice: newCostPrice,
  };

  if (newMinimumStock !== undefined) {
    updateData.minimumStock = newMinimumStock;
  }

  if (newReorderPoint !== undefined) {
    updateData.reorderPoint = newReorderPoint;
  }

  return updateData;
}

/**
 * Validate unit conversion inputs
 */
export function validateUnitConversionInputs(input: UnitConversionInput): void {
  if (input.currentStock.lt(0)) {
    throw new Error("Current stock cannot be negative");
  }
  if (input.conversionFactor.lte(0)) {
    throw new Error("Conversion factor must be positive");
  }
  if (input.newUnitPrice.lt(0)) {
    throw new Error("New unit price cannot be negative");
  }
  if (input.currentAverageCost.lt(0)) {
    throw new Error("Current average cost cannot be negative");
  }
}