import { coverColour, fallbackColour } from "./colour";
import { prisma } from "./db";
import { SHELF_STATUS, type GoodreadsBook } from "./goodreads";
import { coverUrl, lookupEdition } from "./openlibrary";

/** Used when neither Goodreads nor Open Library knows the page count. */
export const DEFAULT_PAGES = 320;

export type ImportResult = "added" | "updated";

/**
 * Shelves one book from a Goodreads feed.
 *
 * Kept out of the Server Action so it can be exercised directly against the
 * database, without a request context.
 */
export async function importGoodreadsBook(
  book: GoodreadsBook,
  ownerId: string,
): Promise<ImportResult> {
  const status = SHELF_STATUS[book.shelf];

  // Already imported: refresh the reader's own data and leave the rest alone.
  const byGoodreads = await prisma.book.findUnique({
    where: {
      ownerId_goodreadsId: { ownerId, goodreadsId: book.goodreadsId },
    },
  });

  if (byGoodreads) {
    const missingCoverEdition = byGoodreads.coverUrl
      ? null
      : await lookupEdition(book.isbn, book.title, book.author);
    const missingCoverUrl =
      book.imageUrl ??
      (missingCoverEdition?.coverId ? coverUrl(missingCoverEdition.coverId) : null);
    await prisma.book.update({
      where: { id: byGoodreads.id },
      data: {
        rating: book.rating,
        review: book.review,
        status,
        coverUrl: missingCoverUrl ?? byGoodreads.coverUrl,
        isbn: byGoodreads.isbn ?? missingCoverEdition?.isbn ?? book.isbn,
      },
    });
    return "updated";
  }

  // Goodreads leaves num_pages blank often enough that this is worth doing,
  // and it's also where covers and genres come from.
  const edition = await lookupEdition(book.isbn, book.title, book.author);
  const openLibraryCover = edition?.coverId ? coverUrl(edition.coverId) : null;

  const colourSource = book.imageUrl ?? openLibraryCover;
  const color = colourSource
    ? await coverColour(colourSource)
    : fallbackColour(book.goodreadsId);

  // The same book may already be on the shelf from a manual add.
  const byEdition = edition?.key
    ? await prisma.book.findUnique({
        where: {
          ownerId_openLibraryKey: { ownerId, openLibraryKey: edition.key },
        },
      })
    : null;

  if (byEdition) {
    await prisma.book.update({
      where: { id: byEdition.id },
      data: {
        goodreadsId: book.goodreadsId,
        rating: book.rating ?? byEdition.rating,
        review: book.review ?? byEdition.review,
        status,
      },
    });
    return "updated";
  }

  await prisma.book.create({
    data: {
      ownerId,
      title: book.title,
      author: book.author,
      // The feed's own count wins: it's the edition the reader shelved.
      pages:
        book.pages ??
        (edition?.pages && edition.pages > 0 ? edition.pages : DEFAULT_PAGES),
      // The feed doesn't say, and trade paperback is the commonest case.
      binding: "trade",
      genre: edition?.genre ?? "Fiction",
      color,
      year: book.year ?? edition?.year ?? null,
      isbn: book.isbn,
      coverUrl: book.imageUrl ?? openLibraryCover,
      openLibraryKey: edition?.key ?? null,
      goodreadsId: book.goodreadsId,
      status,
      rating: book.rating,
      review: book.review,
      reviewedAt: book.review || book.rating ? new Date() : null,
    },
  });

  return "added";
}
