-- Unificar Lava-Louça Universal no SKU canónico CLEAN-DISH-UNIVERSAL,
-- migrando historico e removendo a duplicacao com CLEAN-LAVA-LOUCAS.

-- 1) Migrar TODO o historico de transacoes do alias para o canónico
UPDATE "inventory_transactions" it
SET "itemId" = (
  SELECT "id" FROM "inventory_items" WHERE "sku" = 'CLEAN-DISH-UNIVERSAL'
)
WHERE "itemId" = (
  SELECT "id" FROM "inventory_items" WHERE "sku" = 'CLEAN-LAVA-LOUCAS'
);

-- 2) Migrar tambem weekly_inventory_items para manter contagens agregadas
UPDATE "weekly_inventory_items" wii
SET "itemId" = (
  SELECT "id" FROM "inventory_items" WHERE "sku" = 'CLEAN-DISH-UNIVERSAL'
)
WHERE "itemId" = (
  SELECT "id" FROM "inventory_items" WHERE "sku" = 'CLEAN-LAVA-LOUCAS'
);

-- 3) Atualizar stock atual do canónico para o stock atual do alias
UPDATE "inventory_items"
SET
  "currentStock" = (
    SELECT "currentStock" FROM "inventory_items" WHERE "sku" = 'CLEAN-LAVA-LOUCAS'
  ),
  "stockValue" = (
    SELECT "currentStock" FROM "inventory_items" WHERE "sku" = 'CLEAN-LAVA-LOUCAS'
  ) * "costPrice"
WHERE "sku" = 'CLEAN-DISH-UNIVERSAL';

-- 4) Desativar o alias e limpar o stock para evitar duplicacoes futuras
UPDATE "inventory_items"
SET
  "currentStock" = 0,
  "stockValue"   = 0,
  "status"       = 'INACTIVE'
WHERE "sku" = 'CLEAN-LAVA-LOUCAS';

