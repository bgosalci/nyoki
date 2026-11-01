-- Shoppers' reviews of pieces, read before they go on the shop.

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'PUBLISHED', 'HIDDEN');

-- CreateEnum
CREATE TYPE "ReviewHiddenReason" AS ENUM ('OFFENSIVE', 'PERSONAL_DETAILS', 'ADVERTISING', 'NOT_GENUINE');

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "verified_order_number" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "hidden_reason" "ReviewHiddenReason",
    "moderated_at" TIMESTAMP(3),
    "reply" TEXT,
    "replied_at" TIMESTAMP(3),
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id"),
    -- One to five stars, whatever writes the row: the average is worked out
    -- from these, and a sixth star would lift it.
    CONSTRAINT "reviews_rating_check" CHECK ("rating" BETWEEN 1 AND 5)
);

-- CreateIndex
CREATE UNIQUE INDEX "reviews_customer_id_product_id_key" ON "reviews"("customer_id", "product_id");

-- CreateIndex
CREATE INDEX "reviews_product_id_status_submitted_at_idx" ON "reviews"("product_id", "status", "submitted_at");

-- CreateIndex
CREATE INDEX "reviews_status_submitted_at_idx" ON "reviews"("status", "submitted_at");

-- CreateIndex
CREATE INDEX "reviews_submitted_at_idx" ON "reviews"("submitted_at");

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
