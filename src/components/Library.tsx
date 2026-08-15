"use client";

import { useState } from "react";
import { BOOKS, GENRES, type Genre } from "@/lib/books";
import BookDetail from "./BookDetail";
import Spine from "./Spine";

export default function Library() {
  const [genre, setGenre] = useState<Genre | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = BOOKS.find((book) => book.id === selectedId) ?? null;
  const shown = genre
    ? BOOKS.filter((book) => book.genre === genre).length
    : BOOKS.length;

  function toggleSelected(id: string) {
    setSelectedId((current) => (current === id ? null : id));
  }

  return (
    <section className="flex flex-col gap-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-6">
        <div className="hairline" />

        <nav
          className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2"
          aria-label="Filter by genre"
        >
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
        <div className="shelf-scroll">
          <div className="shelf-inner">
            <div className="shelf">
              {BOOKS.map((book) => (
                <Spine
                  key={book.id}
                  book={book}
                  selected={selectedId === book.id}
                  dimmed={genre !== null && book.genre !== genre}
                  onSelect={toggleSelected}
                />
              ))}
            </div>
            <div className="board" />
          </div>
        </div>

        <p className="eyebrow mt-6 text-center">
          {shown} {shown === 1 ? "volume" : "volumes"}
          {genre ? ` in ${genre}` : " on the shelf"}
        </p>
      </div>

      <div className="mx-auto flex min-h-[15rem] w-full max-w-3xl items-center px-6">
        {selected ? (
          <div className="w-full">
            <BookDetail book={selected} />
          </div>
        ) : (
          <p
            className="w-full text-center"
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "1.25rem",
              color: "var(--color-ink-faint)",
            }}
          >
            Pull one off the shelf.
          </p>
        )}
      </div>
    </section>
  );
}
