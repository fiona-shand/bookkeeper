-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "goodreadsProfileId" TEXT,
    "goodreadsSyncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Book" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
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
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Book_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Book" ("addedAt", "author", "binding", "color", "coverUrl", "genre", "goodreadsId", "id", "isbn", "openLibraryKey", "pages", "rating", "review", "reviewedAt", "status", "title", "updatedAt", "year") SELECT "addedAt", "author", "binding", "color", "coverUrl", "genre", "goodreadsId", "id", "isbn", "openLibraryKey", "pages", "rating", "review", "reviewedAt", "status", "title", "updatedAt", "year" FROM "Book";
DROP TABLE "Book";
ALTER TABLE "new_Book" RENAME TO "Book";
CREATE INDEX "Book_userId_status_idx" ON "Book"("userId", "status");
CREATE UNIQUE INDEX "Book_userId_openLibraryKey_key" ON "Book"("userId", "openLibraryKey");
CREATE UNIQUE INDEX "Book_userId_goodreadsId_key" ON "Book"("userId", "goodreadsId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

