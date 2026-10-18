-- CreateEnum
CREATE TYPE "PersonalisationKind" AS ENUM ('TEXT', 'CHOICE');

-- CreateTable
CREATE TABLE "product_customisations" (
    "product_id" TEXT NOT NULL,
    "message" BOOLEAN NOT NULL DEFAULT false,
    "message_price_pence" INTEGER NOT NULL DEFAULT 0,
    "message_max_length" INTEGER NOT NULL DEFAULT 300,
    "personalisation" BOOLEAN NOT NULL DEFAULT false,
    "personalisation_price_pence" INTEGER NOT NULL DEFAULT 0,
    "personalisation_required" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_customisations_pkey" PRIMARY KEY ("product_id")
);

-- CreateTable
CREATE TABLE "personalisation_fields" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "kind" "PersonalisationKind" NOT NULL,
    "max_length" INTEGER,
    "choices" TEXT[],
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "personalisation_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_packs" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "cards" INTEGER NOT NULL,
    "price_pence" INTEGER NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_packs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "personalisation_fields_product_id_idx" ON "personalisation_fields"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_packs_product_id_cards_key" ON "product_packs"("product_id", "cards");

-- AddForeignKey
ALTER TABLE "product_customisations" ADD CONSTRAINT "product_customisations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personalisation_fields" ADD CONSTRAINT "personalisation_fields_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_packs" ADD CONSTRAINT "product_packs_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
