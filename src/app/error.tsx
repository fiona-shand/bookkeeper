"use client";

/**
 * Replaces Next's generic "a server error occurred", which says nothing a
 * reader or the owner can act on. The digest below is the same id that appears
 * in the hosting logs, so the two can be lined up.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="error-page">
      <p className="eyebrow">Something went wrong</p>

      <h1 className="error-title">The shelf didn&rsquo;t load</h1>

      <p className="error-body">
        This is a fault on our side, not something you did. The most likely cause
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
  );
}
