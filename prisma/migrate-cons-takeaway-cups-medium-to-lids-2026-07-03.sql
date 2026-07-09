-- Migrar transacoes IN de 03-07-2026 do SKU alias
-- CONS-TAKEAWAY-CUPS-MEDIUM para o SKU canónico
-- CONS-TAKEAWAY-MEDIUM-CUPS-LIDS, sem alterar stock atual.

UPDATE "inventory_transactions" it
SET "itemId" = (
  SELECT "id"
  FROM "inventory_items"
  WHERE "sku" = 'CONS-TAKEAWAY-MEDIUM-CUPS-LIDS'
)
WHERE
  "itemId" = (
    SELECT "id"
    FROM "inventory_items"
    WHERE "sku" = 'CONS-TAKEAWAY-CUPS-MEDIUM'
  )
  AND "type" = 'IN'
  AND "referenceType" = 'SUPPLIER_DELIVERY'
  AND "referenceId" = 'STOCK-IN-2026-07-03-CONSUMABLES-DELIVERY'
  AND "transactionDate" >= '2026-07-03'::date
  AND "transactionDate" < '2026-07-04'::date;

