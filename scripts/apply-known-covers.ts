import { prisma } from "../src/lib/db";

const ownerId = process.env.TARGET_OWNER_ID;
if (!ownerId) throw new Error("TARGET_OWNER_ID is required");

const covers: Record<string, string> = {
  "Phoebe Berman's Gonna Lose It": "https://covers.openlibrary.org/b/isbn/9781035437467-L.jpg?default=false",
  "We Are Legion (We Are Bob) (Bobiverse, #1)": "https://covers.openlibrary.org/b/isbn/9781680680584-L.jpg?default=false",
  "Breaking Twitter: Elon Musk and the Most Controversial Corporate Takeover in History": "https://covers.openlibrary.org/b/olid/OL49589072M-L.jpg?default=false",
  "Fascism and Democracy": "https://covers.openlibrary.org/b/olid/OL29482496M-L.jpg?default=false",
  "Can Socialists be Happy?": "https://covers.openlibrary.org/b/olid/OL57552116M-L.jpg?default=false",
  "Me Before You (Me Before You, #1)": "https://covers.openlibrary.org/b/olid/OL29670133M-L.jpg?default=false",
  "Red Rising (Red Rising Saga, #1)": "https://covers.openlibrary.org/b/olid/OL28821469M-L.jpg?default=false",
  "The Hitchhiker's Guide to the Galaxy (Hitchhiker's Guide to the Galaxy, #1)": "https://covers.openlibrary.org/b/olid/OL7690391M-L.jpg?default=false",
  "Atomic Habits: An Easy & Proven Way to Build Good Habits & Break Bad Ones": "https://covers.openlibrary.org/b/olid/OL26502528M-L.jpg?default=false",
  "The Inheritance of Rome: Illuminating the Dark Ages, 400-1000": "https://covers.openlibrary.org/b/olid/OL23207923M-L.jpg?default=false",
};

async function main() {
  let updated = 0;
  for (const [title, coverUrl] of Object.entries(covers)) {
    const result = await prisma.book.updateMany({
      where: { ownerId, title, goodreadsId: { not: null }, coverUrl: null },
      data: { coverUrl },
    });
    updated += result.count;
  }
  console.log(`restored ${updated} known covers`);
}

main().finally(() => prisma.$disconnect());
