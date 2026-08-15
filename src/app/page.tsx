import AddBook from "@/components/AddBook";
import ImportGoodreads from "@/components/ImportGoodreads";
import Library from "@/components/Library";
import Recommend from "@/components/Recommend";
import { getShelf } from "@/lib/queries";

// The shelf is read from SQLite on every request, so mutations show up
// immediately rather than serving a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function Page() {
  const books = await getShelf();
  const pages = books.reduce((total, book) => total + book.pages, 0);

  return (
    <main className="flex flex-col gap-16 pb-28">
      <header className="masthead">
        <p className="eyebrow">
          {books.length} books · {pages.toLocaleString()} pages
        </p>

        <h1 className="hero-title">welcome to my world</h1>

        <p className="hero-sub">
          Everything I have read, standing up the way it would in a room.
        </p>

        <div className="masthead-actions">
          <AddBook />
          <ImportGoodreads />
          <Recommend books={books} />
        </div>
      </header>

      <Library books={books} />
    </main>
  );
}
