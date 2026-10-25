-- Questions a shopper sends from a piece's page or the Contact page, kept
-- for the admin's Questions list.

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "product_id" TEXT,
    "product_name" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "answered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "questions_email_created_at_idx" ON "questions"("email", "created_at");

-- CreateIndex
CREATE INDEX "questions_answered_at_created_at_idx" ON "questions"("answered_at", "created_at");

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Pieces imported from Not On The High Street point shoppers at its "Ask
-- seller a question" button, which the shop does not have. Point them at the
-- shop's own Ask a question, beneath the details on the same page. Only the
-- exact wording is touched, so a piece reworded since is left as it is.
UPDATE "products"
SET "materials" = replace(
  replace("materials", 'click ''Ask seller a question''', 'use ''Ask a question'' below'),
  'via ''Ask seller a question''', 'via ''Ask a question'' below'
)
WHERE "materials" LIKE '%''Ask seller a question''%';
