/**
 * Repairs books that were imported before binding was read from Open Library.
 *
 * Every Goodreads import used to be stored as a trade paperback, which made all
 * of them exactly the same height on the shelf. This re-looks-up each book and
 * fills in the binding, plus any page count or cover that was missing.
 *
 *   npm run db:backfill
 *
 * Safe to re-run. It only overwrites the fields it can improve.
 */
import { prisma } from "../src/lib/db";
import { DEFAULT_PAGES } from "../src/lib/goodreads-import";
import { coverUrl, lookupEdition } from "../src/lib/openlibrary";

/** Open Library asks for no more than ~3 requests a second. */
const GAP_MS = 350;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const books = await prisma.book.findMany({
    orderBy: { addedAt: "asc" },
  });

  console.log(`checking ${books.length} books against Open Library\n`);

  let bindings = 0;
  let pages = 0;
  let covers = 0;
  let unreachable = 0;

  for (const [index, book] of books.entries()) {
    if (index > 0) await sleep(GAP_MS);

    const edition = await lookupEdition(book.isbn, book.title, book.author).catch(
      () => null,
    );

    if (!edition) {
      unreachable += 1;
      continue;
    }

    const data: Record<string, unknown> = {};

    // Our old default was a guess; Open Library's format is evidence.
    if (edition.binding !== book.binding) {
      data.binding = edition.binding;
      bindings += 1;
    }

    // Only replace the page count if it's still our "unknown" placeholder.
    if (book.pages === DEFAULT_PAGES && edition.pages && edition.pages > 0) {
      data.pages = edition.pages;
      pages += 1;
    }

    if (!book.coverUrl && edition.coverId) {
      data.coverUrl = coverUrl(edition.coverId);
      covers += 1;
    }

    if (Object.keys(data).length === 0) continue;

    await prisma.book.update({ where: { id: book.id }, data });
    console.log(`  ${book.title} → ${Object.keys(data).join(", ")}`);
  }

  console.log(
    `\nbindings corrected: ${bindings}\npage counts filled: ${pages}\ncovers filled: ${covers}\nnot found on Open Library: ${unreachable}`,
  );

  const spread = await prisma.book.groupBy({ by: ["binding"], _count: true });
  console.log("\nbindings now:", spread.map((r) => `${r.binding}=${r._count}`).join(" "));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
