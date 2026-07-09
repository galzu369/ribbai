-- Entrada de stock de Abrilhantador/Secante SPLIT LV - 2026-07-09
-- Referencia: STOCK-IN-2026-07-09-CONSUMABLES-DELIVERY
-- Regista a entrada de stock de 2 unidade e atualiza preços base para futuro.

-- Abrilhantador/Secante SPLIT LV - CLEAN-SPLIT-LV-RINSE
UPDATE inventory_items
SET
  "currentStock"      = "currentStock" + 2,
  "costPrice"         = 17.58,
  "averageCost"       = 17.58,
  "lastPurchaseCost"  = 17.58,
  "lastPurchaseDate"  = '2026-07-09',
  "stockValue"        = ("currentStock" + 2) * 17.58
WHERE "sku" = 'CLEAN-SPLIT-LV-RINSE';

INSERT INTO inventory_transactions (
  "id",
  "itemId",
  "type",
  "quantity",
  "unit",
  "unitCost",
  "totalCost",
  "referenceType",
  "referenceId",
  "balanceAfter",
  "reason",
  "createdBy",
  "transactionDate"
)
SELECT
  'STOCK-IN-2026-07-09-CLEAN-SPLIT-LV-RINSE',
  "id",
  'IN',
  2,
  "unit",
  17.58,
  2 * 17.58,
  'SUPPLIER_DELIVERY',
  'STOCK-IN-2026-07-09-CONSUMABLES-DELIVERY',
  "currentStock",
  'Entrada de stock de fornecedor (Abrilhantador/Secante SPLIT LV).',
  'OPS-STOCK-ENTRY-2026-07-09',
  '2026-07-09'
FROM "inventory_items"
WHERE "sku" = 'CLEAN-SPLIT-LV-RINSE';

