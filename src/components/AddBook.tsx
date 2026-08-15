"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { addBook } from "@/app/actions";
import {
  GENRES,
  READING_STATUSES,
  STATUS_LABEL,
  type Genre,
  type ReadingStatus,
} from "@/lib/books";
import type { SearchResult } from "@/lib/openlibrary";

export default function AddBook() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  // Results are tagged with the term they belong to, so a stale response for a
  // previous query is never shown against the current one.
  const [results, setResults] = useState<{ term: string; items: SearchResult[] }>({
    term: "",
    items: [],
  });
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<SearchResult | null>(null);
  const [genre, setGenre] = useState<Genre>("Fiction");
  const [status, setStatus] = useState<ReadingStatus>("read");
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) fieldRef.current?.focus();
  }, [open]);

  // Debounced search. Open Library asks not to be hammered, and this also
  // keeps the shelf from flickering while you're still typing.
  useEffect(() => {
    const term = query.trim();
    // Nothing to fetch. Results for an older term are hidden by the tag check
    // below rather than cleared here, which would be a setState in an effect.
    if (term.length < 2 || picked) return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setSearching(true);
      setError(null);

      fetch(`/api/search?q=${encodeURIComponent(term)}`, {
        signal: controller.signal,
      })
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok) {
            setError(data.error ?? "Search failed.");
          }
          setResults({
            term,
            items: Array.isArray(data.results) ? data.results : [],
          });
        })
        .catch((cause: unknown) => {
          if ((cause as Error)?.name !== "AbortError") {
            setError("Couldn't reach Open Library.");
          }
        })
        .finally(() => setSearching(false));
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, picked]);

  function pick(result: SearchResult) {
    setPicked(result);
    // Open Library's subjects are messy, so this is a starting point to correct.
    setGenre(result.genre);
    setNotice(null);
  }

  function reset() {
    setPicked(null);
    setQuery("");
    setResults({ term: "", items: [] });
    setError(null);
  }

  function handleAdd() {
    if (!picked) return;
    startTransition(async () => {
      const result = await addBook({ result: picked, genre, status });
      if (result.ok) {
        setNotice(`${picked.title} is on the shelf.`);
        reset();
      } else {
        setNotice(result.error);
      }
    });
  }

  // Only show results that belong to what's currently typed.
  const visibleResults =
    picked || results.term !== query.trim() ? [] : results.items;

  if (!open) {
    return (
      <button
        type="button"
        className="recommend-button"
        onClick={() => setOpen(true)}
      >
        Add a book
      </button>
    );
  }

  return (
    <div className="add-panel">
      <label className="eyebrow" htmlFor="add-search">
        Add a book
      </label>

      <input
        id="add-search"
        ref={fieldRef}
        className="recommend-field"
        value={picked ? `${picked.title} — ${picked.author}` : query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="search by title or author"
        autoComplete="off"
        readOnly={Boolean(picked)}
      />

      {searching ? <p className="add-status">Searching…</p> : null}
      {error ? <p className="add-status add-error">{error}</p> : null}

      {visibleResults.length > 0 ? (
        <ul className="add-results">
          {visibleResults.map((result) => (
            <li key={result.key}>
              <button
                type="button"
                className="add-result"
                onClick={() => pick(result)}
              >
                <span className="add-result-title">{result.title}</span>
                <span className="add-result-meta">
                  {result.author}
                  {result.year ? ` · ${result.year}` : ""}
                  {result.pages ? ` · ${result.pages}pp` : " · page count unknown"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {picked ? (
        <div className="add-confirm">
          <div className="add-field">
            <label className="eyebrow" htmlFor="add-genre">
              Genre
            </label>
            <select
              id="add-genre"
              className="add-select"
              value={genre}
              onChange={(event) => setGenre(event.target.value as Genre)}
            >
              {GENRES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="add-field">
            <label className="eyebrow" htmlFor="add-status">
              Shelf
            </label>
            <select
              id="add-status"
              className="add-select"
              value={status}
              onChange={(event) => setStatus(event.target.value as ReadingStatus)}
            >
              {READING_STATUSES.map((option) => (
                <option key={option} value={option}>
                  {STATUS_LABEL[option]}
                </option>
              ))}
            </select>
          </div>

          <div className="add-actions">
            <button
              type="button"
              className="ink-button"
              onClick={handleAdd}
              disabled={pending}
            >
              {pending ? "Adding…" : "Add to shelf"}
            </button>
            <button type="button" className="text-button" onClick={reset}>
              Pick another
            </button>
          </div>
        </div>
      ) : null}

      {notice ? <p className="add-status">{notice}</p> : null}

      <button
        type="button"
        className="text-button"
        onClick={() => {
          reset();
          setNotice(null);
          setOpen(false);
        }}
      >
        Done
      </button>
    </div>
  );
}
