-- CreateTable
CREATE TABLE "Book" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "pages" INTEGER NOT NULL,
    "binding" TEXT NOT NULL,
    "genre" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "year" INTEGER,
    "isbn" TEXT,
    "coverUrl" TEXT,
    "openLibraryKey" TEXT,
    "status" TEXT NOT NULL DEFAULT 'read',
    "rating" INTEGER,
    "review" TEXT,
    "reviewedAt" DATETIME,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Book_openLibraryKey_key" ON "Book"("openLibraryKey");

-- CreateIndex
CREATE INDEX "Book_status_idx" ON "Book"("status");
