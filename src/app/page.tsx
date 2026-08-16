import { after } from "next/server";
import AccountBar from "@/components/AccountBar";
import AddBook from "@/components/AddBook";
import AuthPanel from "@/components/AuthPanel";
import ImportGoodreads from "@/components/ImportGoodreads";
import Library from "@/components/Library";
import Recommend from "@/components/Recommend";
import { currentUser } from "@/lib/auth";
import { isStale, syncGoodreads } from "@/lib/goodreads-sync";
import { getShelf } from "@/lib/queries";

// The shelf is read per request, so mutations show up immediately rather than
// serving a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await currentUser();

  if (!user) {
    return (
      <main className="flex flex-col gap-16 pb-28">
        <header className="masthead">
          <p className="eyebrow">A reading journal</p>
          <h1 className="hero-title">welcome to my world</h1>
          <p className="hero-sub">
            Everything you have read, standing up the way it would in a room.
          </p>
        </header>

        <div className="auth-wrap">
          <AuthPanel />
        </div>
      </main>
    );
  }

  const books = await getShelf(user.id);
  const pages = books.reduce((total, book) => total + book.pages, 0);

  // Refresh from Goodreads after the response has gone out, so the reader
  // never waits on it. Only when the last sync has gone stale.
  if (user.goodreadsProfileId && isStale(user.goodreadsSyncedAt)) {
    const { id, goodreadsProfileId } = user;
    after(async () => {
      try {
        const outcome = await syncGoodreads(id, goodreadsProfileId);
        console.log("goodreads sync:", outcome);
      } catch (error) {
        console.error("goodreads sync failed", error);
      }
    });
  }

  return (
    <main className="flex flex-col gap-16 pb-28">
      <AccountBar name={user.name} />

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
