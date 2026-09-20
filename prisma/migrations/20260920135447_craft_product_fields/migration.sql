-- AlterTable
ALTER TABLE "products" ADD COLUMN     "care_instructions" TEXT,
ADD COLUMN     "dimensions" TEXT,
ADD COLUMN     "lead_time_days" INTEGER,
ADD COLUMN     "made_to_order" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "materials" TEXT,
ADD COLUMN     "one_of_a_kind" BOOLEAN NOT NULL DEFAULT false;
