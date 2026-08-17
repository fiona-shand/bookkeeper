import { prisma } from "../src/lib/db";

const ownerId = process.env.TARGET_OWNER_ID;
if (!ownerId) throw new Error("TARGET_OWNER_ID is required");

async function coverFor(goodreadsId: string): Promise<string | null> {
  const response = await fetch(`https://www.goodreads.com/book/show/${goodreadsId}`, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; Greatreads/1.0)" },
    redirect: "follow",
  });
  if (!response.ok) return null;
  const html = await response.text();
  const match = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
  return match?.[1]?.replaceAll("&amp;", "&") ?? null;
}

async function main() {
  const books = await prisma.book.findMany({
    where: { ownerId, goodreadsId: { not: null } },
    select: { id: true, title: true, goodreadsId: true },
  });

  let restored = 0;
  const unresolved: string[] = [];
  for (let start = 0; start < books.length; start += 4) {
    const batch = books.slice(start, start + 4);
    await Promise.all(
      batch.map(async (book) => {
        const image = await coverFor(book.goodreadsId!);
        if (!image) {
          unresolved.push(book.title);
          return;
        }
        await prisma.book.update({ where: { id: book.id }, data: { coverUrl: image } });
        restored += 1;
      }),
    );
    console.log(`processed ${Math.min(start + batch.length, books.length)}/${books.length}`);
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  console.log(JSON.stringify({ restored, unresolved }, null, 2));
}

main().finally(() => prisma.$disconnect());
