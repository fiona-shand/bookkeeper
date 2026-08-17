import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { BOOKS } from "../src/lib/books";
import { DATABASE_URL } from "../src/lib/database-url";

const adapter = new PrismaBetterSqlite3({ url: DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  for (const book of BOOKS) {
    const status = book.status ?? "read";
    // A book you haven't read yet can't have been rated or reviewed.
    const unread = status === "want";

    await prisma.book.upsert({
      where: { id: book.id },
      update: {},
      create: {
        id: book.id,
        title: book.title,
        author: book.author,
        pages: book.pages,
        binding: book.binding,
        genre: book.genre,
        color: book.color,
        year: book.year,
        status,
        rating: unread ? null : book.rating,
        review: unread ? null : book.note,
        reviewedAt: unread ? null : new Date(),
      },
    });
  }

  const count = await prisma.book.count();
  console.log(`seeded — ${count} books on the shelf`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
