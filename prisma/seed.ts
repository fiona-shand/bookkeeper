import { BOOKS } from "../src/lib/books";
import { createPrismaClient } from "../src/lib/db";

const prisma = createPrismaClient();

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
        ownerId: process.env.SEED_OWNER_ID ?? "local-seed-owner",
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
