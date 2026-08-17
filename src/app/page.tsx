import AccountBar from "@/components/AccountBar";
import AddBook from "@/components/AddBook";
import AuthPanel from "@/components/AuthPanel";
import ImportGoodreads from "@/components/ImportGoodreads";
import Library from "@/components/Library";
import ShelfExperience from "@/components/ShelfExperience";
import { currentUser } from "@/lib/auth";
import { getShelf } from "@/lib/queries";

// The shelf is read from SQLite on every request, so mutations show up
// immediately rather than serving a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await currentUser();

  if (!user) {
    return (
      <main className="signed-out-page">
        <div className="signed-out-card">
          <p className="eyebrow">A personal reading journal</p>
          <h1 className="hero-title">welcome to my world</h1>
          <p className="hero-sub">
            Sign in to open the shelves, revisit old favorites, and decide what
            to read next.
          </p>
          <div className="auth-wrap">
            <AuthPanel />
          </div>
        </div>
      </main>
    );
  }

  const books = await getShelf(user.id);
  const pages = books.reduce((total, book) => total + book.pages, 0);
  const firstName = user.name.trim().split(/\s+/)[0] || "My";

  if (books.length === 0) {
    return (
      <main className="onboarding-page" data-theme="clothbound">
        <AccountBar name={user.name} />
        <section className="onboarding-card">
          <p className="eyebrow">Build your personal archive</p>
          <h1 className="hero-title">bring in your books</h1>
          <p className="hero-sub">Start with the shelves you already keep on Goodreads.</p>
          <ImportGoodreads onboarding />
        </section>
      </main>
    );
  }

  const shelf = (
    <main className="flex flex-col gap-16 pb-28" data-theme="clothbound">
      <header className="masthead">
        <AccountBar name={user.name} />

        <p className="eyebrow">A personal archive</p>

        <h1 className="hero-title">
          {firstName === "My" ? "my shelf" : `${firstName}\u2019s shelf`}
        </h1>

        <p className="eyebrow">
          {books.length} volumes · {pages.toLocaleString()} pages
        </p>

        <div className="masthead-actions">
          <AddBook />
          <ImportGoodreads />
        </div>
      </header>

      <Library books={books} />
    </main>
  );

  return (
    <ShelfExperience
      covers={books.flatMap((book) => book.coverUrl ? [book.coverUrl] : [])}
      goodreadsProfileId={user.goodreadsProfileId}
      missingCovers={books.filter((book) => !book.coverUrl).length}
    >
      {shelf}
    </ShelfExperience>
  );
}
