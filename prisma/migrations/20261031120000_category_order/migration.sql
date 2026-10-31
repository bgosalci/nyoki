-- AlterTable
CREATE SEQUENCE categories_position_seq;
ALTER TABLE "categories" ALTER COLUMN "position" SET DEFAULT nextval('categories_position_seq');
ALTER SEQUENCE categories_position_seq OWNED BY "categories"."position";

-- Start from the order the shop has always shown: by name within each group,
-- since every position was 0. Numbered across the whole table, which keeps
-- that order within each group - only siblings are ever compared.
UPDATE "categories" AS c
SET "position" = ranked.rn
FROM (SELECT "id", ROW_NUMBER() OVER (ORDER BY "position" ASC, "name" ASC, "id" ASC) AS rn FROM "categories") AS ranked
WHERE c."id" = ranked."id";

-- The next category made goes after all of them.
SELECT setval('categories_position_seq', GREATEST((SELECT MAX("position") FROM "categories"), 1));
