-- AlterTable
ALTER TABLE "inventory_items" ADD COLUMN     "averageCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "lastInventoryDate" TIMESTAMP(3),
ADD COLUMN     "lastPurchaseCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "lastPurchaseDate" TIMESTAMP(3),
ADD COLUMN     "stockValue" DECIMAL(12,2) NOT NULL DEFAULT 0;
