-- AlterTable
ALTER TABLE "Book" ADD COLUMN "goodreadsId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Book_goodreadsId_key" ON "Book"("goodreadsId");

