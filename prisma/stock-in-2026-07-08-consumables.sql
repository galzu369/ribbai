-- Entrada de stock de consumiveis - 2026-07-08
-- Referencia: STOCK-IN-2026-07-08-CONSUMABLES-DELIVERY
-- Regista a entrada de stock e atualiza precos base para futuro.

-- Pauzinhos - CONS-TAKEAWAY-CHOPSTICKS
UPDATE inventory_items
SET
  "currentStock"      = "currentStock" + 10,
  "costPrice"         = 2.94,
  "averageCost"       = 2.94,
  "lastPurchaseCost"  = 2.94,
  "lastPurchaseDate"  = '2026-07-08',
  "stockValue"        = ("currentStock" + 10) * 2.94
WHERE sku = 'CONS-TAKEAWAY-CHOPSTICKS';

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
  'STOCK-IN-2026-07-08-CONS-TAKEAWAY-CHOPSTICKS',
  "id",
  'IN',
  10,
  "unit",
  2.94,
  10 * 2.94,
  'SUPPLIER_DELIVERY',
  'STOCK-IN-2026-07-08-CONSUMABLES-DELIVERY',
  "currentStock",
  'Entrada de stock de fornecedor (pauzinhos).',
  'OPS-STOCK-ENTRY-2026-07-08',
  '2026-07-08'
FROM "inventory_items"
WHERE "sku" = 'CONS-TAKEAWAY-CHOPSTICKS';


-- Colheres Take Away - CONS-TAKEAWAY-SPOONS
UPDATE inventory_items
SET
  "currentStock"      = "currentStock" + 3,
  "costPrice"         = 6.78,
  "averageCost"       = 6.78,
  "lastPurchaseCost"  = 6.78,
  "lastPurchaseDate"  = '2026-07-08',
  "stockValue"        = ("currentStock" + 3) * 6.78
WHERE sku = 'CONS-TAKEAWAY-SPOONS';

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
  'STOCK-IN-2026-07-08-CONS-TAKEAWAY-SPOONS',
  "id",
  'IN',
  3,
  "unit",
  6.78,
  3 * 6.78,
  'SUPPLIER_DELIVERY',
  'STOCK-IN-2026-07-08-CONSUMABLES-DELIVERY',
  "currentStock",
  'Entrada de stock de fornecedor (colheres take away).',
  'OPS-STOCK-ENTRY-2026-07-08',
  '2026-07-08'
FROM "inventory_items"
WHERE "sku" = 'CONS-TAKEAWAY-SPOONS';


-- Box Media 1350 - CONS-TAKEAWAY-TOAST-BOX
UPDATE inventory_items
SET
  "currentStock"      = "currentStock" + 4,
  "costPrice"         = 8.40,
  "averageCost"       = 8.40,
  "lastPurchaseCost"  = 8.40,
  "lastPurchaseDate"  = '2026-07-08',
  "stockValue"        = ("currentStock" + 4) * 8.40
WHERE sku = 'CONS-TAKEAWAY-TOAST-BOX';

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
  'STOCK-IN-2026-07-08-CONS-TAKEAWAY-TOAST-BOX',
  "id",
  'IN',
  4,
  "unit",
  8.40,
  4 * 8.40,
  'SUPPLIER_DELIVERY',
  'STOCK-IN-2026-07-08-CONSUMABLES-DELIVERY',
  "currentStock",
  'Entrada de stock de fornecedor (box media 1350).',
  'OPS-STOCK-ENTRY-2026-07-08',
  '2026-07-08'
FROM "inventory_items"
WHERE "sku" = 'CONS-TAKEAWAY-TOAST-BOX';


-- Box grande 1980ml - CONS-TAKEAWAY-BURGER-BOX
UPDATE inventory_items
SET
  "currentStock"      = "currentStock" + 4,
  "costPrice"         = 11.90,
  "averageCost"       = 11.90,
  "lastPurchaseCost"  = 11.90,
  "lastPurchaseDate"  = '2026-07-08',
  "stockValue"        = ("currentStock" + 4) * 11.90
WHERE sku = 'CONS-TAKEAWAY-BURGER-BOX';

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
  'STOCK-IN-2026-07-08-CONS-TAKEAWAY-BURGER-BOX',
  "id",
  'IN',
  4,
  "unit",
  11.90,
  4 * 11.90,
  'SUPPLIER_DELIVERY',
  'STOCK-IN-2026-07-08-CONSUMABLES-DELIVERY',
  "currentStock",
  'Entrada de stock de fornecedor (box grande 1980ml).',
  'OPS-STOCK-ENTRY-2026-07-08',
  '2026-07-08'
FROM "inventory_items"
WHERE "sku" = 'CONS-TAKEAWAY-BURGER-BOX';


-- Box POKE + Tampas - CONS-TAKEAWAY-ROUND-BOX-LID
UPDATE inventory_items
SET
  "currentStock"      = "currentStock" + 6,
  "costPrice"         = 10.08,
  "averageCost"       = 10.08,
  "lastPurchaseCost"  = 10.08,
  "lastPurchaseDate"  = '2026-07-08',
  "stockValue"        = ("currentStock" + 6) * 10.08
WHERE sku = 'CONS-TAKEAWAY-ROUND-BOX-LID';

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
  'STOCK-IN-2026-07-08-CONS-TAKEAWAY-ROUND-BOX-LID',
  "id",
  'IN',
  6,
  "unit",
  10.08,
  6 * 10.08,
  'SUPPLIER_DELIVERY',
  'STOCK-IN-2026-07-08-CONSUMABLES-DELIVERY',
  "currentStock",
  'Entrada de stock de fornecedor (box POKE + tampas).',
  'OPS-STOCK-ENTRY-2026-07-08',
  '2026-07-08'
FROM "inventory_items"
WHERE "sku" = 'CONS-TAKEAWAY-ROUND-BOX-LID';


-- Luvas L - CLEAN-GLOVES-L
UPDATE inventory_items
SET
  "currentStock"      = "currentStock" + 10,
  "costPrice"         = 2.77,
  "averageCost"       = 2.77,
  "lastPurchaseCost"  = 2.77,
  "lastPurchaseDate"  = '2026-07-08',
  "stockValue"        = ("currentStock" + 10) * 2.77
WHERE sku = 'CLEAN-GLOVES-L';

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
  'STOCK-IN-2026-07-08-CLEAN-GLOVES-L',
  "id",
  'IN',
  10,
  "unit",
  2.77,
  10 * 2.77,
  'SUPPLIER_DELIVERY',
  'STOCK-IN-2026-07-08-CONSUMABLES-DELIVERY',
  "currentStock",
  'Entrada de stock de fornecedor (luvas L).',
  'OPS-STOCK-ENTRY-2026-07-08',
  '2026-07-08'
FROM "inventory_items"
WHERE "sku" = 'CLEAN-GLOVES-L';


-- Rolo TNT - CONS-OPS-TNT-ROLLS
UPDATE inventory_items
SET
  "currentStock"      = "currentStock" + 1,
  "costPrice"         = 27.42,
  "averageCost"       = 27.42,
  "lastPurchaseCost"  = 27.42,
  "lastPurchaseDate"  = '2026-07-08',
  "stockValue"        = ("currentStock" + 1) * 27.42
WHERE sku = 'CONS-OPS-TNT-ROLLS';

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
  'STOCK-IN-2026-07-08-CONS-OPS-TNT-ROLLS',
  "id",
  'IN',
  1,
  "unit",
  27.42,
  1 * 27.42,
  'SUPPLIER_DELIVERY',
  'STOCK-IN-2026-07-08-CONSUMABLES-DELIVERY',
  "currentStock",
  'Entrada de stock de fornecedor (rolo TNT).',
  'OPS-STOCK-ENTRY-2026-07-08',
  '2026-07-08'
FROM "inventory_items"
WHERE "sku" = 'CONS-OPS-TNT-ROLLS';

