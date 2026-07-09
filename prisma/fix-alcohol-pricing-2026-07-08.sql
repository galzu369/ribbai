-- Atualizar preço do Álcool (CLEAN-ALCOHOL)
-- Preço indicado: 0,93 €/unidade.
-- Assumimos que a última compra relevante é de 2026-07-03 para alinhamento com outras correções de julho.

UPDATE inventory_items
SET
  "costPrice"        = 0.93,
  "averageCost"      = 0.93,
  "lastPurchaseCost" = 0.93,
  "lastPurchaseDate" = '2026-07-03',
  "stockValue"       = "currentStock" * 0.93
WHERE sku = 'CLEAN-ALCOHOL';

