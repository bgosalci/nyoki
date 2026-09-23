-- AlterTable
ALTER TABLE "products" ADD COLUMN     "vat_rate" INTEGER NOT NULL DEFAULT 20;

-- CreateTable
CREATE TABLE "cost_lines" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "unit_pence" INTEGER NOT NULL,
    "quantity_hundredths" INTEGER NOT NULL DEFAULT 100,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "cost_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_list_entries" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "note" TEXT,
    "photo_url" TEXT,
    "photo_hash" TEXT,
    "photo_filename" TEXT,
    "vat_rate" INTEGER NOT NULL,
    "price_pence" INTEGER NOT NULL,
    "lines" JSONB NOT NULL,
    "product_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_list_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cost_lines_product_id_idx" ON "cost_lines"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "price_list_entries_product_id_key" ON "price_list_entries"("product_id");

-- AddForeignKey
ALTER TABLE "cost_lines" ADD CONSTRAINT "cost_lines_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_list_entries" ADD CONSTRAINT "price_list_entries_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
