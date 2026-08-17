import { prisma } from "../src/lib/db";
import { coverUrl, searchBooks } from "../src/lib/openlibrary";

const ownerId = process.env.TARGET_OWNER_ID;
if (!ownerId) throw new Error("TARGET_OWNER_ID is required");

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function findCover(isbn: string | null, title: string, author: string) {
  const queries = isbn ? [`isbn:${isbn}`, `${title} ${author}`] : [`${title} ${author}`];
  for (const query of queries) {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const results = await searchBooks(query);
        const result = results.find((candidate) => candidate.coverId !== null);
        if (result?.coverId) return result;
        break;
      } catch {
        await wait(attempt * 1_000);
      }
    }
    await wait(500);
  }
  return null;
}

async function main() {
  const deleted = await prisma.book.deleteMany({
    where: { ownerId, goodreadsId: null },
  });

  const missing = await prisma.book.findMany({
    where: { ownerId, goodreadsId: { not: null }, coverUrl: null },
    select: { id: true, title: true, author: true, isbn: true },
  });

  let restored = 0;
  const unresolved: string[] = [];
  for (const [index, book] of missing.entries()) {
    if (index > 0) await wait(400);
    const match = await findCover(book.isbn, book.title, book.author);
    if (!match?.coverId) {
      unresolved.push(book.title);
      continue;
    }
    await prisma.book.update({
      where: { id: book.id },
      data: {
        coverUrl: coverUrl(match.coverId),
        isbn: book.isbn ?? match.isbn,
      },
    });
    restored += 1;
    console.log(`cover ${restored}/${missing.length}: ${book.title}`);
  }

  console.log(JSON.stringify({ deletedDemoBooks: deleted.count, restored, unresolved }, null, 2));
}

main().finally(() => prisma.$disconnect());
