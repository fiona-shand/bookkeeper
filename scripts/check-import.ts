import { prisma } from "../src/lib/db";
import type { GoodreadsBook } from "../src/lib/goodreads";
import { DEFAULT_PAGES, importGoodreadsBook } from "../src/lib/goodreads-import";

let failures = 0;
function check(label: string, condition: boolean, detail?: unknown) {
  if (condition) console.log(`  ok   ${label}`);
  else { failures += 1; console.log(`  FAIL ${label}`, detail ?? ""); }
}

const PREFIX = "test-import-";

function fake(overrides: Partial<GoodreadsBook> & { goodreadsId: string }): GoodreadsBook {
  return {
    title: "A Test Book",
    author: "Test Author",
    isbn: null,
    year: 2001,
    pages: 412,
    rating: 4,
    review: "A review from the feed.",
    imageUrl: null,
    shelf: "read",
    ...overrides,
  };
}

async function cleanup() {
  await prisma.book.deleteMany({
    where: { goodreadsId: { startsWith: PREFIX } },
  });
}

async function main() {
  await cleanup();
  const before = await prisma.book.count();

  console.log("\n— importing a new book —");
  // Open Library is blocked from this container, so lookupEdition returns null
  // and the importer must cope using only what the feed gave it.
  const first = await importGoodreadsBook(
    fake({ goodreadsId: `${PREFIX}1`, title: "Feed Pages Book", pages: 412 }),
  );
  check("reports added", first === "added", first);

  const stored = await prisma.book.findUnique({
    where: { goodreadsId: `${PREFIX}1` },
  });
  check("row created", stored !== null);
  check("uses the feed's page count", stored?.pages === 412, stored?.pages);
  check("maps read → read", stored?.status === "read", stored?.status);
  check("keeps the rating", stored?.rating === 4, stored?.rating);
  check("keeps the review", stored?.review === "A review from the feed.", stored?.review);
  check("falls back to a colour", /^#[0-9a-f]{6}$/i.test(stored?.color ?? ""), stored?.color);
  check("stamps reviewedAt", stored?.reviewedAt !== null);

  console.log("\n— re-importing the same book —");
  const second = await importGoodreadsBook(
    fake({
      goodreadsId: `${PREFIX}1`,
      title: "Feed Pages Book",
      rating: 2,
      review: "Changed my mind.",
      shelf: "currently-reading",
    }),
  );
  check("reports updated, not added", second === "updated", second);

  const updated = await prisma.book.findUnique({
    where: { goodreadsId: `${PREFIX}1` },
  });
  check("rating refreshed", updated?.rating === 2, updated?.rating);
  check("review refreshed", updated?.review === "Changed my mind.", updated?.review);
  check("currently-reading → reading", updated?.status === "reading", updated?.status);

  const afterReimport = await prisma.book.count();
  check("no duplicate row", afterReimport === before + 1, { before, afterReimport });

  console.log("\n— missing page count —");
  await importGoodreadsBook(
    fake({ goodreadsId: `${PREFIX}2`, title: "No Pages Book", pages: null }),
  );
  const noPages = await prisma.book.findUnique({
    where: { goodreadsId: `${PREFIX}2` },
  });
  check(
    "falls back to a default width rather than zero",
    noPages?.pages === DEFAULT_PAGES,
    noPages?.pages,
  );

  console.log("\n— unrated, unreviewed, to-read —");
  await importGoodreadsBook(
    fake({
      goodreadsId: `${PREFIX}3`,
      title: "Want To Read Book",
      rating: null,
      review: null,
      shelf: "to-read",
    }),
  );
  const want = await prisma.book.findUnique({ where: { goodreadsId: `${PREFIX}3` } });
  check("to-read → want", want?.status === "want", want?.status);
  check("rating stays null", want?.rating === null, want?.rating);
  check("reviewedAt stays null when nothing was written", want?.reviewedAt === null, want?.reviewedAt);

  console.log("\n— cleaning up —");
  await cleanup();
  const after = await prisma.book.count();
  check("test rows removed", after === before, { before, after });

  console.log(failures === 0 ? "\nall checks passed\n" : `\n${failures} FAILED\n`);
}

main()
  .catch((error) => {
    console.error(error);
    failures += 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(failures === 0 ? 0 : 1);
  });
