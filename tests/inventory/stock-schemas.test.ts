import {
  stockEntryInputSchema,
  stockExitInputSchema,
  weeklyCountInputSchema,
} from "../../scripts/stock/lib/schemas";

describe("stock-schemas", () => {
  describe("stockEntryInputSchema", () => {
    it("accepts a valid entry payload", () => {
      const result = stockEntryInputSchema.parse({
        referenceId: "STOCK-IN-TEST",
        date: "2026-07-20",
        supplierCode: "SUP-1",
        supplierName: "Fornecedor Teste",
        lines: [
          {
            sku: "SKU-1",
            name: "Item 1",
            category: "Consumiveis",
            subCategory: "Operacionais",
            unit: "unidade",
            quantity: "5",
            unitCost: "1.5",
          },
        ],
      });

      expect(result.createdBy).toBe("SYSTEM");
      expect(result.lines).toHaveLength(1);
    });

    it("rejects a payload with no lines", () => {
      expect(() =>
        stockEntryInputSchema.parse({
          referenceId: "STOCK-IN-TEST",
          date: "2026-07-20",
          supplierCode: "SUP-1",
          supplierName: "Fornecedor Teste",
          lines: [],
        }),
      ).toThrow();
    });

    it("rejects a payload missing required fields", () => {
      expect(() =>
        stockEntryInputSchema.parse({
          date: "2026-07-20",
          lines: [{ sku: "SKU-1" }],
        }),
      ).toThrow();
    });
  });

  describe("stockExitInputSchema", () => {
    it("defaults type to OUT", () => {
      const result = stockExitInputSchema.parse({
        referenceId: "STOCK-OUT-TEST",
        date: "2026-07-20",
        reason: "Consumo",
        lines: [{ sku: "SKU-1", quantity: "2" }],
      });

      expect(result.type).toBe("OUT");
    });

    it("accepts WASTAGE as an explicit type", () => {
      const result = stockExitInputSchema.parse({
        referenceId: "STOCK-OUT-TEST",
        date: "2026-07-20",
        type: "WASTAGE",
        reason: "Quebra",
        lines: [{ sku: "SKU-1", quantity: "2" }],
      });

      expect(result.type).toBe("WASTAGE");
    });

    it("rejects an invalid type", () => {
      expect(() =>
        stockExitInputSchema.parse({
          referenceId: "STOCK-OUT-TEST",
          date: "2026-07-20",
          type: "IN",
          reason: "Invalido",
          lines: [{ sku: "SKU-1", quantity: "2" }],
        }),
      ).toThrow();
    });
  });

  describe("weeklyCountInputSchema", () => {
    it("accepts a valid weekly count payload", () => {
      const result = weeklyCountInputSchema.parse({
        date: "2026-07-21",
        weekNumber: 30,
        year: 2026,
        lines: [{ sku: "SKU-1", name: "Item 1", unit: "unidade", quantity: "3" }],
      });

      expect(result.lines[0].quantity).toBe("3");
    });

    it("rejects a payload with no lines", () => {
      expect(() =>
        weeklyCountInputSchema.parse({
          date: "2026-07-21",
          lines: [],
        }),
      ).toThrow();
    });
  });
});
