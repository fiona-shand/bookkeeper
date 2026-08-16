import { prisma } from "./db";
import { GOODREADS_SHELVES, fetchShelf, type GoodreadsBook } from "./goodreads";
import { importGoodreadsBook } from "./goodreads-import";

/** How old a sync has to be before a page visit triggers a fresh one. */
export const STALE_AFTER_MS = 6 * 60 * 60 * 1000;

/**
 * A background sync shouldn't run for minutes. Books already on the shelf are
 * cheap to refresh; new ones each cost an Open Library lookup, so only this
 * many are added per pass. The rest arrive on the next one.
 */
const MAX_NEW_PER_SYNC = 25;

/** Open Library asks for no more than ~3 requests a second. */
const GAP_MS = 350;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isStale(syncedAt: Date | null): boolean {
  if (!syncedAt) return true;
  return Date.now() - syncedAt.getTime() > STALE_AFTER_MS;
}

export type SyncOutcome = { added: number; updated: number; skipped: number };

/**
 * Pulls the reader's public Goodreads shelves and folds them into their shelf
 * here. Safe to call repeatedly: books match on their Goodreads id and update
 * rather than duplicate.
 *
 * Never throws — this runs after the response has been sent, where a rejection
 * would be invisible to the reader and pointless to propagate.
 */
export async function syncGoodreads(
  userId: string,
  profileId: string,
): Promise<SyncOutcome> {
  const outcome: SyncOutcome = { added: 0, updated: 0, skipped: 0 };

  // Stamped before the work, so a second page load in the same window doesn't
  // start a duplicate sync.
  await prisma.user.update({
    where: { id: userId },
    data: { goodreadsSyncedAt: new Date() },
  });

  const seen = new Set<string>();
  const books: GoodreadsBook[] = [];

  for (const shelf of GOODREADS_SHELVES) {
    try {
      for (const book of await fetchShelf(profileId, shelf)) {
        if (seen.has(book.goodreadsId)) continue;
        seen.add(book.goodreadsId);
        books.push(book);
      }
    } catch (error) {
      console.error(`goodreads sync: ${shelf} failed`, error);
    }
  }

  // Books already here first: they're quick, and they carry rating and shelf
  // changes, which is the point of syncing at all.
  const existing = await prisma.book.findMany({
    where: { userId, goodreadsId: { in: [...seen] } },
    select: { goodreadsId: true },
  });
  const known = new Set(existing.map((row) => row.goodreadsId));

  const ordered = [
    ...books.filter((book) => known.has(book.goodreadsId)),
    ...books.filter((book) => !known.has(book.goodreadsId)),
  ];

  let newlyAdded = 0;

  for (const book of ordered) {
    const isNew = !known.has(book.goodreadsId);

    if (isNew && newlyAdded >= MAX_NEW_PER_SYNC) {
      outcome.skipped += 1;
      continue;
    }

    try {
      if (isNew) await sleep(GAP_MS);
      const result = await importGoodreadsBook(book, userId);
      outcome[result] += 1;
      if (result === "added") newlyAdded += 1;
    } catch (error) {
      console.error(`goodreads sync: ${book.title} failed`, error);
      outcome.skipped += 1;
    }
  }

  return outcome;
}
