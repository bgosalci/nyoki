-- A category can be taken off the shop without deleting it. Every one
-- already there stays on the shop.
ALTER TABLE "categories" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
