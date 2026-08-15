import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";
import { DATABASE_URL } from "./database-url";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const adapter = new PrismaBetterSqlite3({ url: DATABASE_URL });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

// Dev reloads would otherwise open a new connection on every hot update.
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
