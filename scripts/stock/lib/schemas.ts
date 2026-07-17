import { z } from "zod";

const decimalString = z
  .union([z.string(), z.number()])
  .transform((value) => String(value));

export const stockEntryLineSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  subCategory: z.string().min(1),
  unit: z.string().min(1),
  quantity: decimalString,
  unitCost: decimalString,
  minimumStock: decimalString.optional(),
  reorderPoint: decimalString.optional(),
  notes: z.string().optional(),
});

export const stockEntryInputSchema = z.object({
  referenceId: z.string().min(1),
  date: z.string().min(1),
  supplierCode: z.string().min(1),
  supplierName: z.string().min(1),
  createdBy: z.string().default("SYSTEM"),
  lines: z.array(stockEntryLineSchema).min(1),
});

export type StockEntryInput = z.infer<typeof stockEntryInputSchema>;
export type StockEntryLine = z.infer<typeof stockEntryLineSchema>;

export const stockExitLineSchema = z.object({
  sku: z.string().min(1),
  quantity: decimalString,
  notes: z.string().optional(),
});

export const stockExitInputSchema = z.object({
  referenceId: z.string().min(1),
  date: z.string().min(1),
  type: z.enum(["OUT", "WASTAGE"]).default("OUT"),
  reason: z.string().min(1),
  createdBy: z.string().default("SYSTEM"),
  lines: z.array(stockExitLineSchema).min(1),
});

export type StockExitInput = z.infer<typeof stockExitInputSchema>;
export type StockExitLine = z.infer<typeof stockExitLineSchema>;

export const weeklyCountLineSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  unit: z.string().min(1),
  quantity: decimalString,
});

export const weeklyCountInputSchema = z.object({
  date: z.string().min(1),
  weekNumber: z.number().int().optional(),
  year: z.number().int().optional(),
  createdBy: z.string().default("SYSTEM"),
  lines: z.array(weeklyCountLineSchema).min(1),
});

export type WeeklyCountInput = z.infer<typeof weeklyCountInputSchema>;
export type WeeklyCountLine = z.infer<typeof weeklyCountLineSchema>;
