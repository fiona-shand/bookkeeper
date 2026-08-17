"use client";

import "./globals.css";

/**
 * Catches failures at the root, above `error.tsx` — which is where a database
 * that can't be reached lands, because the session lookup runs before any page
 * content. Replaces the whole document, so it carries its own html and body.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main className="error-page">
          <p className="eyebrow">Something went wrong</p>

          <h1 className="error-title">The shelf didn&rsquo;t load</h1>

          <p className="error-body">
            This is a fault on our side, not something you did. The usual cause
            is that the library&rsquo;s database is unreachable.
          </p>

          <div className="error-actions">
            <button type="button" className="ink-button" onClick={reset}>
              Try again
            </button>
            <a className="text-button" href="/api/health">
              Check the database
            </a>
          </div>

          {error.digest ? (
            <p className="error-digest">Reference {error.digest}</p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
