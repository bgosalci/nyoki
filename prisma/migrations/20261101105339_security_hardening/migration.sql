-- Orders already placed stay unflagged: none has been paid for, so none is
-- in any shopper's list yet, and which were placed signed in is not known.
-- AlterTable
ALTER TABLE "admin_users" ADD COLUMN     "sessions_valid_from" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "sessions_valid_from" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "signed_in" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "rate_limit_hits" (
    "id" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rate_limit_hits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rate_limit_hits_bucket_key_created_at_idx" ON "rate_limit_hits"("bucket", "key", "created_at");

-- CreateIndex
CREATE INDEX "rate_limit_hits_created_at_idx" ON "rate_limit_hits"("created_at");
