import { prisma } from "../src/lib/db";
import type { GoodreadsBook } from "../src/lib/goodreads";
import { importGoodreadsBook } from "../src/lib/goodreads-import";

let failures = 0;
function check(label: string, condition: boolean, detail?: unknown) {
  if (condition) console.log(`  ok   ${label}`);
  else { failures += 1; console.log(`  FAIL ${label}`, detail ?? ""); }
}

const PREFIX = "test-import-";
const TEST_EMAIL = "check-import@example.invalid";
let userId = "";
let otherUserId = "";

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
  await prisma.user.deleteMany({
    where: { email: { in: [TEST_EMAIL, `other-${TEST_EMAIL}`] } },
  });
}

async function main() {
  await cleanup();
  const before = await prisma.book.count();

  const user = await prisma.user.create({
    data: { email: TEST_EMAIL, name: "Check", passwordHash: "unused" },
  });
  userId = user.id;
  const other = await prisma.user.create({
    data: { email: `other-${TEST_EMAIL}`, name: "Other", passwordHash: "unused" },
  });
  otherUserId = other.id;

  console.log("\n— importing a new book —");
  // Open Library is blocked from this container, so lookupEdition returns null
  // and the importer must cope using only what the feed gave it.
  const first = await importGoodreadsBook(
    fake({ goodreadsId: `${PREFIX}1`, title: "Feed Pages Book", pages: 412 }),
    userId,
  );
  check("reports added", first === "added", first);

  const stored = await prisma.book.findFirst({
    where: { goodreadsId: `${PREFIX}1`, userId },
  });
  check("row created", stored !== null);
  check("belongs to the importing reader", stored?.userId === userId);
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
      imageUrl: "https://m.media-amazon.com/images/test-cover.jpg",
    }),
    userId,
  );
  check("reports updated, not added", second === "updated", second);

  const updated = await prisma.book.findFirst({
    where: { goodreadsId: `${PREFIX}1`, userId },
  });
  check("rating refreshed", updated?.rating === 2, updated?.rating);
  check("review refreshed", updated?.review === "Changed my mind.", updated?.review);
  check("currently-reading → reading", updated?.status === "reading", updated?.status);
  check("re-import repairs a missing cover", updated?.coverUrl?.endsWith("test-cover.jpg") === true, updated?.coverUrl);

  const afterReimport = await prisma.book.count();
  check("no duplicate row", afterReimport === before + 1, { before, afterReimport });

  console.log("\n— missing page count —");
  await importGoodreadsBook(
    fake({ goodreadsId: `${PREFIX}2`, title: "No Pages Book", pages: null }),
    userId,
  );
  const noPages = await prisma.book.findFirst({
    where: { goodreadsId: `${PREFIX}2`, userId },
  });
  check(
    "uses an edition lookup or default rather than zero",
    typeof noPages?.pages === "number" && noPages.pages > 0,
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
    userId,
  );
  const want = await prisma.book.findFirst({ where: { goodreadsId: `${PREFIX}3`, userId } });
  check("to-read → want", want?.status === "want", want?.status);
  check("rating stays null", want?.rating === null, want?.rating);
  check("reviewedAt stays null when nothing was written", want?.reviewedAt === null, want?.reviewedAt);

  console.log("\n— two readers, same book —");
  const mine = await importGoodreadsBook(
    fake({ goodreadsId: `${PREFIX}shared`, title: "Shared Book" }),
    userId,
  );
  const theirs = await importGoodreadsBook(
    fake({ goodreadsId: `${PREFIX}shared`, title: "Shared Book" }),
    otherUserId,
  );
  check("both readers get their own copy", mine === "added" && theirs === "added", { mine, theirs });
  const copies = await prisma.book.count({ where: { goodreadsId: `${PREFIX}shared` } });
  check("two rows, not one", copies === 2, copies);
  const notMine = await prisma.book.findFirst({
    where: { goodreadsId: `${PREFIX}shared`, userId: otherUserId },
  });
  check("the other reader's copy is theirs", notMine?.userId === otherUserId);

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
