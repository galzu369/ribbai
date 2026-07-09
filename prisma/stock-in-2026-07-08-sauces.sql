-- Entrada de stock de molhos - 2026-07-08
-- Referencia: STOCK-IN-2026-07-08-CONSUMABLES-DELIVERY
-- Regista a entrada de stock para Ketchup, Maionese e Mostarda
-- usando os mesmos precos configurados atualmente (ou pendentes).

-- Ketchup - SAUCE-KETCHUP (3 caixas)
UPDATE "inventory_items"
SET
  "currentStock"     = "currentStock" + 3,
  "lastPurchaseCost" = 18.61,
  "lastPurchaseDate" = '2026-07-08',
  "stockValue"       = ("currentStock" + 3) * "costPrice"
WHERE "sku" = 'SAUCE-KETCHUP';

INSERT INTO "inventory_transactions" (
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
  'STOCK-IN-2026-07-08-SAUCE-KETCHUP',
  "id",
  'IN',
  3,
  "unit",
  18.61,
  3 * 18.61,
  'SUPPLIER_DELIVERY',
  'STOCK-IN-2026-07-08-CONSUMABLES-DELIVERY',
  "currentStock",
  'Entrada de stock de fornecedor (ketchup).',
  'OPS-STOCK-ENTRY-2026-07-08',
  '2026-07-08'
FROM "inventory_items"
WHERE "sku" = 'SAUCE-KETCHUP';


-- Maionese - SAUCE-MAYONNAISE (3 caixas)
UPDATE "inventory_items"
SET
  "currentStock"     = "currentStock" + 3,
  "lastPurchaseCost" = 17.80,
  "lastPurchaseDate" = '2026-07-08',
  "stockValue"       = ("currentStock" + 3) * "costPrice"
WHERE "sku" = 'SAUCE-MAYONNAISE';

INSERT INTO "inventory_transactions" (
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
  'STOCK-IN-2026-07-08-SAUCE-MAYONNAISE',
  "id",
  'IN',
  3,
  "unit",
  17.80,
  3 * 17.80,
  'SUPPLIER_DELIVERY',
  'STOCK-IN-2026-07-08-CONSUMABLES-DELIVERY',
  "currentStock",
  'Entrada de stock de fornecedor (maionese).',
  'OPS-STOCK-ENTRY-2026-07-08',
  '2026-07-08'
FROM "inventory_items"
WHERE "sku" = 'SAUCE-MAYONNAISE';


-- Mostarda - SAUCE-MUSTARD (1 caixa)
-- Mantem preco pendente (unitCost nulo) ate termos custo oficial.
UPDATE "inventory_items"
SET
  "currentStock"     = "currentStock" + 1,
  "lastPurchaseDate" = '2026-07-08',
  "stockValue"       = ("currentStock" + 1) * "costPrice"
WHERE "sku" = 'SAUCE-MUSTARD';

INSERT INTO "inventory_transactions" (
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
  'STOCK-IN-2026-07-08-SAUCE-MUSTARD',
  "id",
  'IN',
  1,
  "unit",
  NULL,
  NULL,
  'SUPPLIER_DELIVERY',
  'STOCK-IN-2026-07-08-CONSUMABLES-DELIVERY',
  "currentStock",
  'Entrada de stock de fornecedor (mostarda) com preco pendente.',
  'OPS-STOCK-ENTRY-2026-07-08',
  '2026-07-08'
FROM "inventory_items"
WHERE "sku" = 'SAUCE-MUSTARD';

