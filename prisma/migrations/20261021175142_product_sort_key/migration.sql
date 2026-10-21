-- AlterTable
ALTER TABLE "products" ADD COLUMN     "sort_key" SERIAL NOT NULL;

-- Start from the order the shop has always shown: newest first. The newest
-- product takes the highest key, since the list is read highest first.
UPDATE "products" AS p
SET "sort_key" = ranked.rn
FROM (SELECT "id", ROW_NUMBER() OVER (ORDER BY "created_at" ASC, "id" ASC) AS rn FROM "products") AS ranked
WHERE p."id" = ranked."id";

-- The next product made goes above all of them.
SELECT setval(pg_get_serial_sequence('"products"', 'sort_key'), GREATEST((SELECT MAX("sort_key") FROM "products"), 1));

-- CreateIndex
CREATE INDEX "products_status_sort_key_idx" ON "products"("status", "sort_key");
