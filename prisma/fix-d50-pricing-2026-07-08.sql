-- Atualizar preço do D-50 (CLEAN-D-50 / CLEAN-D50)
-- Baseado na entrada de 03-07-2026: 4 unidades a 17,58 €/unidade.

UPDATE inventory_items
SET
  "costPrice"        = 17.58,
  "averageCost"      = 17.58,
  "lastPurchaseCost" = 17.58,
  "lastPurchaseDate" = '2026-07-03',
  "stockValue"       = "currentStock" * 17.58
WHERE sku IN ('CLEAN-D-50', 'CLEAN-D50');

