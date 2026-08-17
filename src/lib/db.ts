import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@/generated/prisma/client";
import { DATABASE_URL } from "./database-url";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Two ways to reach the same SQLite schema.
 *
 * Locally it's a file on disk. On Vercel that's impossible — serverless has an
 * ephemeral filesystem, so a file database is wiped between deploys and isn't
 * shared between requests. Setting TURSO_DATABASE_URL switches to hosted
 * libSQL, which speaks the same SQL and uses the same migrations.
 */
function createAdapter() {
  const url = process.env.TURSO_DATABASE_URL;

  // On Vercel a file database is worse than useless: it "works", then loses
  // everything on the next deploy. Fail loudly at deploy time instead.
  if (!url && process.env.VERCEL) {
    throw new Error(
      "TURSO_DATABASE_URL is not set. Vercel's filesystem is ephemeral, so a " +
        "file-backed SQLite database would silently lose every book. See DEPLOY.md.",
    );
  }

  if (url) {
    return new PrismaLibSql({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }

  return new PrismaBetterSqlite3({ url: DATABASE_URL });
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter: createAdapter() });

// Dev reloads would otherwise open a new connection on every hot update.
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
