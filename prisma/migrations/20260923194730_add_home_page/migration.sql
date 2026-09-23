-- CreateTable
CREATE TABLE "home_page" (
    "id" TEXT NOT NULL DEFAULT 'home',
    "headline" TEXT NOT NULL,
    "intro" TEXT,
    "cta_label" TEXT NOT NULL,
    "featured_heading" TEXT NOT NULL,
    "promises" TEXT[],
    "hero_product_id" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "home_page_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "home_page" ADD CONSTRAINT "home_page_hero_product_id_fkey" FOREIGN KEY ("hero_product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
