import { Prisma } from "@prisma/client";

import {
  calculateCMPForStockEntry,
  calculateConsumptionValue,
  generateCMPUpdateData,
  generateStockExitUpdateData,
  validateCMPInputs,
  validateStockExitInputs,
} from "@/lib/inventory-cmp";

describe("inventory-cmp", () => {
  const d = (v: string) => new Prisma.Decimal(v);

  it("calculates CMP for stock entry correctly", () => {
    const input = {
      currentStock: d("10"),
      currentAverageCost: d("5.00"),
      incomingQuantity: d("5"),
      incomingUnitCost: d("6.00"),
    };

    const result = calculateCMPForStockEntry(input);

    expect(result.newTotalQuantity.toString()).toBe("15");
    expect(result.entryValue.toString()).toBe("30");
    expect(result.newAverageCost.toDecimalPlaces(2).toString()).toBe("5.33");
    expect(result.newStockValue.toDecimalPlaces(2).toString()).toBe("79.95");
  });

  it("calculates consumption value for exits without changing average cost", () => {
    const input = {
      currentStock: d("15"),
      currentAverageCost: d("5.33"),
      exitQuantity: d("3"),
    };

    const result = calculateConsumptionValue(input);

    expect(result.consumptionValue.toDecimalPlaces(2).toString()).toBe("15.99");
    expect(result.newTotalQuantity.toString()).toBe("12");
    expect(result.newStockValue.toDecimalPlaces(2).toString()).toBe("63.96");
    expect(result.averageCost.toString()).toBe("5.33");
  });

  it("generates CMP update data including last purchase info", () => {
    const calc = {
      newAverageCost: d("5.33"),
      newStockValue: d("79.95"),
      newTotalQuantity: d("15"),
      entryValue: d("30"),
    };
    const lastPurchaseCost = d("6.00");
    const lastPurchaseDate = new Date("2026-06-30T12:00:00.000Z");

    const update = generateCMPUpdateData(calc, lastPurchaseCost, lastPurchaseDate);

    expect(update.averageCost.toString()).toBe("5.33");
    expect(update.stockValue.toString()).toBe("79.95");
    expect(update.currentStock.toString()).toBe("15");
    expect(update.lastPurchaseCost.toString()).toBe("6.00");
    expect(update.lastPurchaseDate).toEqual(lastPurchaseDate);
  });

  it("generates stock exit update data keeping average cost unchanged", () => {
    const result = {
      consumptionValue: d("15.99"),
      newStockValue: d("63.96"),
      newTotalQuantity: d("12"),
      averageCost: d("5.33"),
    };

    const update = generateStockExitUpdateData(result);

    expect(update.stockValue.toString()).toBe("63.96");
    expect(update.currentStock.toString()).toBe("12");
    expect((update as any).averageCost).toBeUndefined();
  });

  it("validates CMP inputs and throws on invalid data", () => {
    expect(() =>
      validateCMPInputs({
        currentStock: d("-1"),
        currentAverageCost: d("5"),
        incomingQuantity: d("1"),
        incomingUnitCost: d("1"),
      }),
    ).toThrow();

    expect(() =>
      validateCMPInputs({
        currentStock: d("1"),
        currentAverageCost: d("5"),
        incomingQuantity: d("0"),
        incomingUnitCost: d("1"),
      }),
    ).toThrow();

    expect(() =>
      validateCMPInputs({
        currentStock: d("1"),
        currentAverageCost: d("5"),
        incomingQuantity: d("1"),
        incomingUnitCost: d("-1"),
      }),
    ).toThrow();
  });

  it("validates stock exit inputs and throws on invalid data", () => {
    expect(() =>
      validateStockExitInputs({
        currentStock: d("-1"),
        currentAverageCost: d("5"),
        exitQuantity: d("1"),
      }),
    ).toThrow();

    expect(() =>
      validateStockExitInputs({
        currentStock: d("1"),
        currentAverageCost: d("5"),
        exitQuantity: d("0"),
      }),
    ).toThrow();

    expect(() =>
      validateStockExitInputs({
        currentStock: d("1"),
        currentAverageCost: d("-1"),
        exitQuantity: d("1"),
      }),
    ).toThrow();

    expect(() =>
      validateStockExitInputs({
        currentStock: d("1"),
        currentAverageCost: d("5"),
        exitQuantity: d("2"),
      }),
    ).toThrow();
  });
});

