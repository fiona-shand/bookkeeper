"use server";

import { revalidatePath } from "next/cache";
import {
  FEED_CAP,
  GOODREADS_SHELVES,
  fetchShelf,
  resolveProfileId,
  type GoodreadsBook,
  type GoodreadsShelf,
} from "@/lib/goodreads";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { importGoodreadsBook } from "@/lib/goodreads-import";

export type GoodreadsPreview =
  | {
      ok: true;
      profileId: string;
      books: GoodreadsBook[];
      counts: Record<GoodreadsShelf, number>;
      /** Shelves that came back at the feed's 100-book ceiling. */
      cappedShelves: GoodreadsShelf[];
    }
  | { ok: false; error: string };

export async function previewGoodreads(input: string): Promise<GoodreadsPreview> {
  const user = await requireUser();
  const profileId = resolveProfileId(input);
  if (!profileId) {
    return {
      ok: false,
      error:
        "That doesn't look like a Goodreads profile. Paste your profile URL, or just the number from it.",
    };
  }

  const counts = {} as Record<GoodreadsShelf, number>;
  const cappedShelves: GoodreadsShelf[] = [];
  const books: GoodreadsBook[] = [];
  const seen = new Set<string>();

  for (const shelf of GOODREADS_SHELVES) {
    let items: GoodreadsBook[];
    try {
      items = await fetchShelf(profileId, shelf);
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Couldn't reach Goodreads.",
      };
    }

    counts[shelf] = items.length;
    if (items.length >= FEED_CAP) cappedShelves.push(shelf);

    for (const item of items) {
      if (seen.has(item.goodreadsId)) continue;
      seen.add(item.goodreadsId);
      books.push(item);
    }
  }

  if (books.length === 0) {
    return {
      ok: false,
      error:
        "Goodreads returned no books. The profile has to be public for its shelves to be readable — check Settings → Privacy on Goodreads.",
    };
  }

  // Remembered so the shelf can refresh itself later without asking again.
  await prisma.user.update({
    where: { id: user.id },
    data: { goodreadsProfileId: profileId },
  });

  return { ok: true, profileId, books, counts, cappedShelves };
}

export type ImportOutcome = {
  added: number;
  updated: number;
  failed: { title: string; reason: string }[];
};

/** Open Library asks for no more than ~3 requests a second. */
const OPEN_LIBRARY_GAP_MS = 350;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Imported in batches from the client so a large shelf shows progress instead
 * of hanging on one long request.
 */
export async function importGoodreadsBatch(
  books: GoodreadsBook[],
): Promise<ImportOutcome> {
  const user = await requireUser();
  const outcome: ImportOutcome = { added: 0, updated: 0, failed: [] };

  for (const [index, book] of books.entries()) {
    try {
      if (index > 0) await sleep(OPEN_LIBRARY_GAP_MS);
      const result = await importGoodreadsBook(book, user.id);
      outcome[result] += 1;
    } catch (error) {
      outcome.failed.push({
        title: book.title,
        reason: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { goodreadsSyncedAt: new Date() },
  });

  revalidatePath("/");
  return outcome;
}
