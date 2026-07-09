-- Corrigir preço dos Copos Medios Take Away + Tampas canónicos (CONS-TAKEAWAY-MEDIUM-CUPS-LIDS)
-- Baseado na entrada de stock de 2026-07-03: 5,70 €/saco em CONS-TAKEAWAY-CUPS-MEDIUM

UPDATE inventory_items
SET
  "costPrice"        = 5.70,
  "averageCost"      = 5.70,
  "lastPurchaseCost" = 5.70,
  "lastPurchaseDate" = '2026-07-03',
  "stockValue"       = "currentStock" * 5.70,
  "updatedBy"        = 'OPS-PRICING-INTELLIGENCE-2026-07-08'
WHERE sku = 'CONS-TAKEAWAY-MEDIUM-CUPS-LIDS';

