"use client";

import { useState } from "react";
import {
  importGoodreadsBatch,
  previewGoodreads,
  type ImportOutcome,
} from "@/app/import";
import { FEED_CAP, type GoodreadsBook } from "@/lib/goodreads";

/** Small enough that progress moves visibly, large enough to stay quick. */
const BATCH_SIZE = 4;

type Phase =
  | { name: "idle" }
  | { name: "finding" }
  | { name: "found"; books: GoodreadsBook[]; counts: Record<string, number>; capped: string[] }
  | { name: "importing"; done: number; total: number }
  | { name: "done"; outcome: ImportOutcome };

export default function ImportGoodreads() {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState("");
  const [phase, setPhase] = useState<Phase>({ name: "idle" });
  const [error, setError] = useState<string | null>(null);

  async function find() {
    setError(null);
    setPhase({ name: "finding" });

    const result = await previewGoodreads(profile);
    if (!result.ok) {
      setError(result.error);
      setPhase({ name: "idle" });
      return;
    }

    setPhase({
      name: "found",
      books: result.books,
      counts: result.counts,
      capped: result.cappedShelves,
    });
  }

  async function run(books: GoodreadsBook[]) {
    const total = books.length;
    const totals: ImportOutcome = { added: 0, updated: 0, failed: [] };

    for (let start = 0; start < total; start += BATCH_SIZE) {
      setPhase({ name: "importing", done: start, total });
      const outcome = await importGoodreadsBatch(books.slice(start, start + BATCH_SIZE));
      totals.added += outcome.added;
      totals.updated += outcome.updated;
      totals.failed.push(...outcome.failed);
    }

    setPhase({ name: "done", outcome: totals });
  }

  function close() {
    setOpen(false);
    setPhase({ name: "idle" });
    setProfile("");
    setError(null);
  }

  if (!open) {
    return (
      <button
        type="button"
        className="recommend-button"
        onClick={() => setOpen(true)}
      >
        Import from Goodreads
      </button>
    );
  }

  return (
    <div className="add-panel">
      <label className="eyebrow" htmlFor="goodreads-profile">
        Import from Goodreads
      </label>

      {phase.name === "idle" || phase.name === "finding" ? (
        <>
          <input
            id="goodreads-profile"
            className="recommend-field"
            value={profile}
            onChange={(event) => setProfile(event.target.value)}
            placeholder="your Goodreads profile URL"
            autoComplete="off"
            onKeyDown={(event) => {
              if (event.key === "Enter") void find();
            }}
          />
          <p className="add-status">
            Your profile has to be public. Goodreads shut its API down in 2020 —
            this reads the RSS feed your public shelves still publish, so it can
            see your ratings and reviews but not more than {FEED_CAP} books per
            shelf.
          </p>
          <div className="add-actions">
            <button
              type="button"
              className="ink-button"
              onClick={() => void find()}
              disabled={phase.name === "finding" || profile.trim().length === 0}
            >
              {phase.name === "finding" ? "Looking…" : "Find my books"}
            </button>
            <button type="button" className="text-button" onClick={close}>
              Cancel
            </button>
          </div>
        </>
      ) : null}

      {phase.name === "found" ? (
        <>
          <p className="add-status">
            Found <strong>{phase.books.length}</strong> books — {phase.counts.read ?? 0}{" "}
            read, {phase.counts["currently-reading"] ?? 0} currently reading,{" "}
            {phase.counts["to-read"] ?? 0} to read.
          </p>

          {phase.capped.length > 0 ? (
            <p className="add-status add-error">
              {phase.capped.join(" and ")} came back at exactly {FEED_CAP} books,
              which is the feed&rsquo;s ceiling — you almost certainly have more
              than this, and Goodreads won&rsquo;t serve them over RSS.
            </p>
          ) : null}

          <p className="add-status">
            Covers, genres and any page counts Goodreads left blank are looked up
            from Open Library as each book is added, so this takes a moment per
            book.
          </p>

          <div className="add-actions">
            <button
              type="button"
              className="ink-button"
              onClick={() => void run(phase.books)}
            >
              Import {phase.books.length} books
            </button>
            <button type="button" className="text-button" onClick={close}>
              Cancel
            </button>
          </div>
        </>
      ) : null}

      {phase.name === "importing" ? (
        <>
          <p className="add-status">
            Shelving {phase.done} of {phase.total}…
          </p>
          <div
            className="progress"
            role="progressbar"
            aria-valuenow={phase.done}
            aria-valuemin={0}
            aria-valuemax={phase.total}
          >
            <div
              className="progress-fill"
              style={{ width: `${Math.round((phase.done / phase.total) * 100)}%` }}
            />
          </div>
        </>
      ) : null}

      {phase.name === "done" ? (
        <>
          <p className="add-status">
            Added {phase.outcome.added}
            {phase.outcome.updated > 0 ? `, updated ${phase.outcome.updated}` : ""}
            {phase.outcome.failed.length > 0
              ? `, ${phase.outcome.failed.length} couldn't be shelved`
              : ""}
            .
          </p>
          {phase.outcome.failed.length > 0 ? (
            <ul className="recommend-hits">
              {phase.outcome.failed.slice(0, 5).map((failure) => (
                <li key={failure.title}>
                  <em>{failure.title}</em> — {failure.reason}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="add-actions">
            <button type="button" className="ink-button" onClick={close}>
              Done
            </button>
          </div>
        </>
      ) : null}

      {error ? <p className="add-status add-error">{error}</p> : null}
    </div>
  );
}
