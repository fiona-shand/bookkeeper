-- Rebuild Book so external book identifiers are unique per Clerk user rather
-- than globally. Existing rows are assigned after deployment to their owner.
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Book" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
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
    "goodreadsId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'read',
    "rating" INTEGER,
    "review" TEXT,
    "reviewedAt" DATETIME,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "new_Book" (
    "id", "ownerId", "title", "author", "pages", "binding", "genre",
    "color", "year", "isbn", "coverUrl", "openLibraryKey", "goodreadsId",
    "status", "rating", "review", "reviewedAt", "addedAt", "updatedAt"
)
SELECT
    "id", '', "title", "author", "pages", "binding", "genre", "color",
    "year", "isbn", "coverUrl", "openLibraryKey", "goodreadsId", "status",
    "rating", "review", "reviewedAt", "addedAt", "updatedAt"
FROM "Book";

DROP TABLE "Book";
ALTER TABLE "new_Book" RENAME TO "Book";

CREATE UNIQUE INDEX "Book_ownerId_openLibraryKey_key"
    ON "Book"("ownerId", "openLibraryKey");
CREATE UNIQUE INDEX "Book_ownerId_goodreadsId_key"
    ON "Book"("ownerId", "goodreadsId");
CREATE INDEX "Book_ownerId_status_idx" ON "Book"("ownerId", "status");

PRAGMA foreign_keys=ON;
