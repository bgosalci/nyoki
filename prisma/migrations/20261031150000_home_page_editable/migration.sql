-- The home page as approved after the Amazon store: badges, a banner, photo
-- tiles in blocks of five, a band above the pieces and a button beneath.
-- The hero photo, its headline and paragraph, and the promise strip go: the
-- badges say what the promises said, and the Kosovo story is on About us.
-- Existing rows take the approved design's words from the column defaults.

-- DropForeignKey
ALTER TABLE "home_page" DROP CONSTRAINT "home_page_hero_product_id_fkey";

-- AlterTable
ALTER TABLE "home_page" DROP COLUMN "featured_heading",
DROP COLUMN "headline",
DROP COLUMN "hero_product_id",
DROP COLUMN "intro",
DROP COLUMN "promises",
ADD COLUMN     "band_text" TEXT NOT NULL DEFAULT 'Our most-loved handmade pieces, from friendship to forever love, for every heartfelt occasion.',
ADD COLUMN     "banner_text" TEXT NOT NULL DEFAULT 'Start with who you’re thinking of',
ADD COLUMN     "cta_category_id" TEXT,
ADD COLUMN     "cta_href" TEXT,
ADD COLUMN     "show_badges" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "home_tiles" (
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "category_id" TEXT,
    "href" TEXT,
    "product_image_id" TEXT,
    "photo_id" TEXT,

    CONSTRAINT "home_tiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "home_photos" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "home_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "home_tiles_position_idx" ON "home_tiles"("position");

-- AddForeignKey
ALTER TABLE "home_page" ADD CONSTRAINT "home_page_cta_category_id_fkey" FOREIGN KEY ("cta_category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "home_tiles" ADD CONSTRAINT "home_tiles_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "home_tiles" ADD CONSTRAINT "home_tiles_product_image_id_fkey" FOREIGN KEY ("product_image_id") REFERENCES "product_images"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "home_tiles" ADD CONSTRAINT "home_tiles_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "home_photos"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- The button now sits beneath the pieces rather than beside the hero photo.
-- Only the old default wording is changed; anything typed is kept.
UPDATE "home_page" SET "cta_label" = 'See everything' WHERE "cta_label" = 'Shop everything';
