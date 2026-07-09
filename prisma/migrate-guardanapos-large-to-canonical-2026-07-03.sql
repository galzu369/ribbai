-- Migrar transacoes IN de 03-07-2026 do SKU alias
-- CONS-SERVICE-NAPKINS-LARGE para o SKU canónico
-- CONS-SERVICE-NAPKINS, sem alterar stock atual.

UPDATE "inventory_transactions" it
SET "itemId" = (
  SELECT "id"
  FROM "inventory_items"
  WHERE "sku" = 'CONS-SERVICE-NAPKINS'
)
WHERE
  "itemId" = (
    SELECT "id"
    FROM "inventory_items"
    WHERE "sku" = 'CONS-SERVICE-NAPKINS-LARGE'
  )
  AND "type" = 'IN'
  AND "referenceType" = 'SUPPLIER_DELIVERY'
  AND "referenceId" = 'STOCK-IN-2026-07-03-CONSUMABLES-DELIVERY'
  AND "transactionDate" >= '2026-07-03'::date
  AND "transactionDate" < '2026-07-04'::date;

