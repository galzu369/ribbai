-- Deprecar CONS-TAKEAWAY-CUPS-MEDIUM (Copos Médios Take Away + Tampas)
-- Este SKU passa a alias histórico do canónico CONS-TAKEAWAY-MEDIUM-COFFEE-CUPS.
-- A contagem física válida a 07-07-2026 é 21 sacos no canónico.

UPDATE "inventory_items"
SET "currentStock" = 0,
    "status" = 'INACTIVE',
    "updatedAt" = NOW()
WHERE "sku" = 'CONS-TAKEAWAY-CUPS-MEDIUM';

