-- Corrigir preço do Abrilhantador/Secante SPLIT LV canónico (CLEAN-SPLIT-LV-RINSE)
-- Baseado na entrada de stock de 2026-07-03: 12,62 €/unidade em CLEAN-SPLIT-LV-RINSE

UPDATE inventory_items
SET
  "costPrice"        = 12.62,
  "averageCost"      = 12.62,
  "lastPurchaseCost" = 12.62,
  "lastPurchaseDate" = '2026-07-03',
  "stockValue"       = "currentStock" * 12.62,
  "updatedBy"        = 'OPS-PRICING-INTELLIGENCE-2026-07-08'
WHERE sku = 'CLEAN-SPLIT-LV-RINSE';

