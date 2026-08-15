/**
 * Single source of truth for the SQLite location, shared by the app and the
 * Prisma CLI. Defaulting it means a fresh clone needs no .env file — set
 * DATABASE_URL only if you want the database somewhere else.
 */
export const DATABASE_URL = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
