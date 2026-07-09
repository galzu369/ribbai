-- Ajustes de uniformização de inventário (copos e aliases) – 2026-07-08

-- 1) Copos Médios Café Take Away
-- Unidade base em sacos e custo por saco (1,85 €/saco).
UPDATE "inventory_items"
SET "unit" = 'saco',
    "costPrice" = 1.85
WHERE "sku" = 'CONS-TAKEAWAY-MEDIUM-COFFEE-CUPS';

-- 2) Aliases depreciados – não devem aparecer em relatórios mensais
--    CONS-TAKEAWAY-CUPS-SMALL  → CONS-TAKEAWAY-MEDIUM-COFFEE-CUPS
--    CLEAN-D50                 → CLEAN-D-50
--    CLEAN-LAVA-LOUCAS         → CLEAN-DISH-UNIVERSAL
UPDATE "inventory_items"
SET "status" = 'INACTIVE'
WHERE "sku" IN ('CONS-TAKEAWAY-CUPS-SMALL', 'CLEAN-D50', 'CLEAN-LAVA-LOUCAS');

