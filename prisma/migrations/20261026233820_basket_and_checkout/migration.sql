-- The basket, and what an order needs to be made and sent.

-- Order numbers: NYK-1001 upwards, handed out by the database so two
-- checkouts at once can never share one.
CREATE SEQUENCE "order_number_seq" START WITH 1001;

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "details" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "vat_rate" INTEGER NOT NULL DEFAULT 20;

-- Any line already there sold at the standard rate; from now on every line
-- says its own, so the column keeps no default.
ALTER TABLE "order_items" ALTER COLUMN "vat_rate" DROP DEFAULT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "basket_id" TEXT,
ADD COLUMN     "gift" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "gift_note" TEXT,
ADD COLUMN     "hide_prices" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "shipping_method" TEXT,
ALTER COLUMN "order_number" SET DEFAULT ('NYK-'::text || nextval('order_number_seq'::regclass));

ALTER SEQUENCE "order_number_seq" OWNED BY "orders"."order_number";

-- CreateTable
CREATE TABLE "baskets" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "baskets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "basket_lines" (
    "id" TEXT NOT NULL,
    "basket_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "variant_id" TEXT,
    "pack_id" TEXT,
    "message" TEXT,
    "message_text" TEXT NOT NULL DEFAULT '',
    "personalise" BOOLEAN NOT NULL DEFAULT false,
    "personalisation" JSONB NOT NULL DEFAULT '{}',
    "quantity" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "added_price_pence" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "basket_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "baskets_customer_id_key" ON "baskets"("customer_id");

-- CreateIndex
CREATE INDEX "basket_lines_product_id_idx" ON "basket_lines"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "basket_lines_basket_id_key_key" ON "basket_lines"("basket_id", "key");

-- CreateIndex
CREATE INDEX "orders_basket_id_idx" ON "orders"("basket_id");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_basket_id_fkey" FOREIGN KEY ("basket_id") REFERENCES "baskets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baskets" ADD CONSTRAINT "baskets_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "basket_lines" ADD CONSTRAINT "basket_lines_basket_id_fkey" FOREIGN KEY ("basket_id") REFERENCES "baskets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "basket_lines" ADD CONSTRAINT "basket_lines_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "basket_lines" ADD CONSTRAINT "basket_lines_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "basket_lines" ADD CONSTRAINT "basket_lines_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "product_packs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
