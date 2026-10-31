-- The colour of a category's name in the shop's header. Every category keeps
-- navy, as every name was.

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "label_colour" TEXT NOT NULL DEFAULT 'nyoki-navy';

