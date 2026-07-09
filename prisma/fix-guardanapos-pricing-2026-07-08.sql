-- Corrigir preço dos Guardanapos canónicos (CONS-SERVICE-NAPKINS)
-- Baseado na entrada de stock de 2026-07-03: 48,69 €/caixa em CONS-SERVICE-NAPKINS-LARGE

UPDATE inventory_items
SET
  "costPrice"        = 48.69,
  "averageCost"      = 48.69,
  "lastPurchaseCost" = 48.69,
  "lastPurchaseDate" = '2026-07-03',
  "stockValue"       = "currentStock" * 48.69,
  "updatedBy"        = 'OPS-PRICING-INTELLIGENCE-2026-07-08'
WHERE sku = 'CONS-SERVICE-NAPKINS';

