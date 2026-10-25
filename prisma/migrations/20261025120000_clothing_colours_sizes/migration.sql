-- Clothes are sold in colours and sizes, each colour in each size a variant
-- with stock of its own. Shopify's import left a variant's colour and size in
-- a blob of options; they become columns, and each product gets its colours
-- and sizes as lists, in the order they are shown.

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "colours" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "sizes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "product_variants" ADD COLUMN     "colour" TEXT,
ADD COLUMN     "size" TEXT;

-- Shopify spelt colour both ways. Nothing else it held - one piece had
-- "Inventory" - is a colour or a size.
UPDATE "product_variants" SET
  "colour" = NULLIF(btrim(COALESCE("options"->>'Colour', "options"->>'Color')), ''),
  "size" = NULLIF(btrim("options"->>'Size'), '');

-- Named as the Details tab names them: colour, then size.
UPDATE "product_variants" SET "name" = concat_ws(' / ', "colour", "size")
WHERE "colour" IS NOT NULL OR "size" IS NOT NULL;

-- Each product's colours and sizes, once each, in the order its variants came.
UPDATE "products" AS p SET "colours" = v.colours
FROM (
  SELECT "product_id", array_agg("colour" ORDER BY first_position, "colour") AS colours
  FROM (
    SELECT "product_id", "colour", MIN("position") AS first_position
    FROM "product_variants" WHERE "colour" IS NOT NULL
    GROUP BY "product_id", "colour"
  ) AS each_colour
  GROUP BY "product_id"
) AS v
WHERE p."id" = v."product_id";

UPDATE "products" AS p SET "sizes" = v.sizes
FROM (
  SELECT "product_id", array_agg("size" ORDER BY first_position, "size") AS sizes
  FROM (
    SELECT "product_id", "size", MIN("position") AS first_position
    FROM "product_variants" WHERE "size" IS NOT NULL
    GROUP BY "product_id", "size"
  ) AS each_size
  GROUP BY "product_id"
) AS v
WHERE p."id" = v."product_id";

-- A product's stock is the total of its variants'. The import left it at
-- nought on every piece with variants, so the products list read 0 for them.
UPDATE "products" AS p SET "stock" = v.total
FROM (SELECT "product_id", SUM("stock")::int AS total FROM "product_variants" GROUP BY "product_id") AS v
WHERE p."id" = v."product_id";

-- AlterTable
ALTER TABLE "product_variants" DROP COLUMN "options";
