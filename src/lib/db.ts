import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../generated/prisma/client";
import { DATABASE_URL } from "./database-url";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Local uses SQLite on disk. Production on Vercel uses Turso (libSQL) so the
 * shelf survives serverless — a file:// database there is wiped on every deploy.
 */
export function createPrismaClient() {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const adapter = tursoUrl
    ? new PrismaLibSql({
        url: tursoUrl,
        authToken: process.env.TURSO_AUTH_TOKEN,
      })
    : new PrismaBetterSqlite3({ url: DATABASE_URL });

  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Dev reloads would otherwise open a new connection on every hot update.
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
