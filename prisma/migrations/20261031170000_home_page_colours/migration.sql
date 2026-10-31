-- The banner's colour and its words', and each tile's colour of words, all
-- as brand tokens. Existing rows keep the design: ink on sage, white words.

-- AlterTable
ALTER TABLE "home_page" ADD COLUMN     "banner_ground" TEXT NOT NULL DEFAULT 'nyoki-sage',
ADD COLUMN     "banner_ink" TEXT NOT NULL DEFAULT 'nyoki-ink';

-- AlterTable
ALTER TABLE "home_tiles" ADD COLUMN     "word_colour" TEXT NOT NULL DEFAULT 'nyoki-white';

