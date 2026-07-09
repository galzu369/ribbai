-- Deprecar SKUs alias que causam duplicações no relatório mensal – 2026-07-08

-- 1) Guardanapos (alias de serviço → canónico operacional)
--    CONS-SERVICE-NAPKINS-LARGE  → alias de CONS-SERVICE-NAPKINS
--    CONS-SERVICE-SMALL-NAPKINS  → alias de CONS-SERVICE-NAPKINS-SMALL
UPDATE "inventory_items"
SET "status" = 'INACTIVE'
WHERE "sku" IN ('CONS-SERVICE-NAPKINS-LARGE', 'CONS-SERVICE-SMALL-NAPKINS');

-- 2) Split LV (SKU antigo) – já remapeado logicamente para CLEAN-SPLIT-LV-RINSE
UPDATE "inventory_items"
SET "status" = 'INACTIVE'
WHERE "sku" = 'CLEAN-SPLIT-LV';

-- 3) Copos Medios Take Away + Tampas – garantir unidade em sacos
UPDATE "inventory_items"
SET "unit" = 'saco'
WHERE "sku" = 'CONS-TAKEAWAY-MEDIUM-CUPS-LIDS';

