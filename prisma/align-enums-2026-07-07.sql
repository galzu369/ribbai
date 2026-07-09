-- Align Postgres types with Prisma enums used for inventory.

-- 1) InventoryItemStatus enum + coluna inventory_items.status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'InventoryItemStatus'
  ) THEN
    CREATE TYPE "InventoryItemStatus" AS ENUM ('ACTIVE', 'INACTIVE');
  END IF;
END
$$;

ALTER TABLE "inventory_items"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "InventoryItemStatus"
    USING "status"::"InventoryItemStatus",
  ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- 2) InventoryTransactionType enum + coluna inventory_transactions.type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'InventoryTransactionType'
  ) THEN
    CREATE TYPE "InventoryTransactionType" AS ENUM ('IN', 'OUT', 'WASTAGE', 'ADJUSTMENT');
  END IF;
END
$$;

ALTER TABLE "inventory_transactions"
  ALTER COLUMN "type" TYPE "InventoryTransactionType"
  USING "type"::"InventoryTransactionType";

-- 3) WeeklyInventoryStatus enum + coluna weekly_inventories.status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'WeeklyInventoryStatus'
  ) THEN
    CREATE TYPE "WeeklyInventoryStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'CANCELLED');
  END IF;
END
$$;

ALTER TABLE "weekly_inventories"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "WeeklyInventoryStatus"
    USING "status"::"WeeklyInventoryStatus",
  ALTER COLUMN "status" SET DEFAULT 'DRAFT';

