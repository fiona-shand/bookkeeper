import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import AccountMenu from "@/components/AccountMenu";
import AddBook from "@/components/AddBook";
import ImportGoodreads from "@/components/ImportGoodreads";
import Library from "@/components/Library";
import { getShelf } from "@/lib/queries";
import { isTheme, type ThemeName } from "@/lib/theme";

// The shelf is read from SQLite on every request, so mutations show up
// immediately rather than serving a build-time snapshot.
export const dynamic = "force-dynamic";

function displayFirstName(user: Awaited<ReturnType<typeof currentUser>>): string {
  if (!user) return "My";
  if (user.firstName?.trim()) return user.firstName.trim();

  const emailName = user.primaryEmailAddress?.emailAddress.split("@")[0] ?? "";
  // Fiona's email does not provide a Clerk first-name field, but does contain
  // her name. Keep a graceful generic fallback for any future account.
  if (/fiona/i.test(emailName)) return "Fiona";

  const fallback = user.username || emailName;
  return fallback
    ? fallback.charAt(0).toUpperCase() + fallback.slice(1)
    : "My";
}

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
          <div className="auth-actions">
            <SignInButton mode="modal">
              <button type="button" className="ink-button auth-sign-in">
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button type="button" className="recommend-button auth-sign-up">
                Create account
              </button>
            </SignUpButton>
          </div>
        </div>
      </main>
    );
  }

  const books = await getShelf(user.id);
  const pages = books.reduce((total, book) => total + book.pages, 0);
  const firstName = displayFirstName(user);
  const savedTheme = user.unsafeMetadata.theme;
  const theme: ThemeName = isTheme(savedTheme) ? savedTheme : "clothbound";

  return (
    <main className="flex flex-col gap-16 pb-28" data-theme={theme}>
      <header className="masthead">
        <div className="account-menu" aria-label="Account menu">
          <AccountMenu name={firstName} initialTheme={theme} />
        </div>

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
}
