-- CreateTable
CREATE TABLE "category_cost_lines" (
    "id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "unit_pence" INTEGER NOT NULL,
    "quantity_hundredths" INTEGER NOT NULL DEFAULT 100,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "category_cost_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "category_cost_lines_category_id_idx" ON "category_cost_lines"("category_id");

-- AddForeignKey
ALTER TABLE "category_cost_lines" ADD CONSTRAINT "category_cost_lines_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
