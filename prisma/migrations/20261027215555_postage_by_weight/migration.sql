-- CreateEnum
CREATE TYPE "ParcelSize" AS ENUM ('LETTER', 'LARGE_LETTER', 'SMALL_PARCEL', 'MEDIUM_PARCEL');

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "usual_grams" INTEGER,
ADD COLUMN     "usual_parcel_size" "ParcelSize",
ADD COLUMN     "usual_thickness_mm" INTEGER;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "parcel_grams" INTEGER,
ADD COLUMN     "parcel_mm" INTEGER,
ADD COLUMN     "parcel_size" "ParcelSize";

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "parcel_size" "ParcelSize",
ADD COLUMN     "thickness_mm" INTEGER;

-- AlterTable
ALTER TABLE "shipping_rates" ADD COLUMN     "by_weight" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "shipping_bands" (
    "id" TEXT NOT NULL,
    "rate_id" TEXT NOT NULL,
    "size" "ParcelSize" NOT NULL,
    "up_to_grams" INTEGER NOT NULL,
    "price_pence" INTEGER NOT NULL,

    CONSTRAINT "shipping_bands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_settings" (
    "id" TEXT NOT NULL DEFAULT 'delivery',
    "unweighed_grams" INTEGER NOT NULL DEFAULT 500,
    "unweighed_size" "ParcelSize" NOT NULL DEFAULT 'SMALL_PARCEL',
    "letter_pack_grams" INTEGER NOT NULL DEFAULT 10,
    "letter_pack_mm" INTEGER NOT NULL DEFAULT 1,
    "large_letter_pack_grams" INTEGER NOT NULL DEFAULT 40,
    "large_letter_pack_mm" INTEGER NOT NULL DEFAULT 2,
    "small_parcel_pack_grams" INTEGER NOT NULL DEFAULT 110,
    "medium_parcel_pack_grams" INTEGER NOT NULL DEFAULT 300,
    "prices_checked_on" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shipping_bands_rate_id_size_up_to_grams_key" ON "shipping_bands"("rate_id", "size", "up_to_grams");

-- AddForeignKey
ALTER TABLE "shipping_bands" ADD CONSTRAINT "shipping_bands_rate_id_fkey" FOREIGN KEY ("rate_id") REFERENCES "shipping_rates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
