-- CreateTable
CREATE TABLE "also_like" (
    "product_id" TEXT NOT NULL,
    "piece_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "also_like_pkey" PRIMARY KEY ("product_id","piece_id")
);

-- CreateIndex
CREATE INDEX "also_like_piece_id_idx" ON "also_like"("piece_id");

-- AddForeignKey
ALTER TABLE "also_like" ADD CONSTRAINT "also_like_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "also_like" ADD CONSTRAINT "also_like_piece_id_fkey" FOREIGN KEY ("piece_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
