-- Ajustar preço do Abrilhantador/Secante SPLIT LV (CLEAN-SPLIT-LV-RINSE) para 17,58 €/unidade
-- Sobrepõe a correção anterior de 12,62 €, conforme indicação do utilizador.

UPDATE inventory_items
SET
  "costPrice"        = 17.58,
  "averageCost"      = 17.58,
  "lastPurchaseCost" = 17.58,
  "lastPurchaseDate" = '2026-07-03',
  "stockValue"       = "currentStock" * 17.58,
  "updatedBy"        = 'OPS-PRICING-INTELLIGENCE-2026-07-08-V2'
WHERE sku = 'CLEAN-SPLIT-LV-RINSE';

