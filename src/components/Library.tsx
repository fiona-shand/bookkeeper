"use client";

import { useState } from "react";
import { GENRES, type Genre } from "@/lib/books";
import type { ShelfBook } from "@/lib/queries";
import BookView from "./BookView";
import Spine from "./Spine";

export default function Library({ books }: { books: ShelfBook[] }) {
  const [genre, setGenre] = useState<Genre | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = books.find((book) => book.id === selectedId) ?? null;
  const shown = genre
    ? books.filter((book) => book.genre === genre).length
    : books.length;
  const reading = books.filter((book) => book.status === "reading").length;

  return (
    <section className="flex flex-col gap-10">
      <div>
        <div className="rule-wrap">
          <div className="hairline" />
        </div>

        <nav className="filters" aria-label="Filter by genre">
          <button
            type="button"
            className="filter"
            aria-pressed={genre === null}
            onClick={() => setGenre(null)}
          >
            Everything
          </button>
          {GENRES.map((name) => (
            <button
              key={name}
              type="button"
              className="filter"
              aria-pressed={genre === name}
              onClick={() => setGenre(genre === name ? null : name)}
            >
              {name}
            </button>
          ))}
        </nav>
      </div>

      <div>
        {books.length === 0 ? (
          <p className="empty-shelf">
            The shelf is empty. Add a book to start it off.
          </p>
        ) : (
          <div className="shelf-scroll">
            <div className="shelf-inner">
              <div className="shelf" role="group" aria-label="Bookshelf">
                {books.map((book) => (
                  <Spine
                    key={book.id}
                    book={book}
                    selected={selectedId === book.id}
                    dimmed={genre !== null && book.genre !== genre}
                    onSelect={setSelectedId}
                  />
                ))}
              </div>
              <div className="board" />
            </div>
          </div>
        )}

        <p className="eyebrow count">
          {shown} {shown === 1 ? "volume" : "volumes"}
          {genre ? ` in ${genre}` : " on the shelf"}
          {reading > 0 && !genre ? ` · ${reading} in progress` : ""}
        </p>

        {books.length > 0 ? (
          <p className="shelf-hint">Open a book to rate it and write a review.</p>
        ) : null}
      </div>

      {selected ? (
        // Keyed so opening a different book resets the form and replays the
        // cover animation rather than reusing the previous book's state.
        <BookView
          key={selected.id}
          book={selected}
          onClose={() => setSelectedId(null)}
        />
      ) : null}
    </section>
  );
}
