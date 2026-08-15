import { prisma } from "./db";
import { GENRES, READING_STATUSES, type Genre, type ReadingStatus } from "./books";
import type { Binding } from "./spine";

/**
 * What the shelf UI needs. SQLite has no enums, so the string columns are
 * narrowed back to unions here — one place where bad data gets caught, rather
 * than every component having to cope with an arbitrary string.
 */
export type ShelfBook = {
  id: string;
  title: string;
  author: string;
  pages: number;
  binding: Binding;
  genre: Genre;
  color: string;
  year: number | null;
  coverUrl: string | null;
  status: ReadingStatus;
  rating: number | null;
  review: string | null;
};

type BookRow = Awaited<ReturnType<typeof prisma.book.findMany>>[number];

const BINDINGS = new Set<string>(["hardcover", "trade", "massMarket"]);

function toShelfBook(row: BookRow): ShelfBook {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    pages: row.pages,
    binding: BINDINGS.has(row.binding) ? (row.binding as Binding) : "trade",
    genre: (GENRES as readonly string[]).includes(row.genre)
      ? (row.genre as Genre)
      : "Fiction",
    color: row.color,
    year: row.year,
    coverUrl: row.coverUrl,
    status: (READING_STATUSES as readonly string[]).includes(row.status)
      ? (row.status as ReadingStatus)
      : "read",
    rating: row.rating,
    review: row.review,
  };
}

export async function getShelf(): Promise<ShelfBook[]> {
  const rows = await prisma.book.findMany({ orderBy: { addedAt: "asc" } });
  return rows.map(toShelfBook);
}
