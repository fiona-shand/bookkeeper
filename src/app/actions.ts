"use server";

import { revalidatePath } from "next/cache";
import { GENRES, READING_STATUSES, type Genre, type ReadingStatus } from "@/lib/books";
import { coverColour, FALLBACK_COLOUR } from "@/lib/colour";
import { prisma } from "@/lib/db";
import { coverUrl, type SearchResult } from "@/lib/openlibrary";

export type ActionResult = { ok: true } | { ok: false; error: string };

function isStatus(value: unknown): value is ReadingStatus {
  return (
    typeof value === "string" &&
    (READING_STATUSES as readonly string[]).includes(value)
  );
}

function isGenre(value: unknown): value is Genre {
  return typeof value === "string" && (GENRES as readonly string[]).includes(value);
}

/** Star ratings are 1–5, or null to clear one. */
function normaliseRating(value: number | null): number | null {
  if (value === null) return null;
  if (!Number.isInteger(value) || value < 1 || value > 5) return null;
  return value;
}

export async function saveReview(input: {
  id: string;
  rating: number | null;
  review: string;
  status: ReadingStatus;
}): Promise<ActionResult> {
  if (!input.id) return { ok: false, error: "Missing book." };
  if (!isStatus(input.status)) return { ok: false, error: "Unknown reading status." };

  const review = input.review.trim();
  const rating = normaliseRating(input.rating);

  const existing = await prisma.book.findUnique({ where: { id: input.id } });
  if (!existing) return { ok: false, error: "That book is no longer on the shelf." };

  await prisma.book.update({
    where: { id: input.id },
    data: {
      rating,
      review: review.length > 0 ? review : null,
      status: input.status,
      // Stamp the date only when there is actually something written.
      reviewedAt: review.length > 0 || rating !== null ? new Date() : null,
    },
  });

  revalidatePath("/");
  return { ok: true };
}

export async function addBook(input: {
  result: SearchResult;
  genre: Genre;
  status: ReadingStatus;
}): Promise<ActionResult> {
  const { result } = input;

  if (!result?.key || !result.title) {
    return { ok: false, error: "That search result is missing a title." };
  }
  if (!isGenre(input.genre)) return { ok: false, error: "Unknown genre." };
  if (!isStatus(input.status)) return { ok: false, error: "Unknown reading status." };

  const duplicate = await prisma.book.findUnique({
    where: { openLibraryKey: result.key },
  });
  if (duplicate) {
    return { ok: false, error: `${duplicate.title} is already on the shelf.` };
  }

  const cover = result.coverId ? coverUrl(result.coverId) : null;
  // Sampled once, on add — never per render, which would hammer the covers API.
  const color = cover ? await coverColour(cover) : FALLBACK_COLOUR;

  await prisma.book.create({
    data: {
      title: result.title,
      author: result.author,
      // Open Library often has no page count; a sane median keeps the spine
      // from collapsing to the minimum width.
      pages: result.pages && result.pages > 0 ? result.pages : 320,
      binding: result.binding,
      genre: input.genre,
      color,
      year: result.year,
      isbn: result.isbn,
      coverUrl: cover,
      openLibraryKey: result.key,
      status: input.status,
    },
  });

  revalidatePath("/");
  return { ok: true };
}

export async function removeBook(id: string): Promise<ActionResult> {
  if (!id) return { ok: false, error: "Missing book." };

  const existing = await prisma.book.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "That book is no longer on the shelf." };

  await prisma.book.delete({ where: { id } });

  revalidatePath("/");
  return { ok: true };
}
