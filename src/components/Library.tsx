"use client";

import { useState } from "react";
import { GENRES, type Genre } from "@/lib/books";
import type { ShelfBook } from "@/lib/queries";
import BookView from "./BookView";
import Spine from "./Spine";

type ShelfView = "read" | "want";

export default function Library({ books }: { books: ShelfBook[] }) {
  const [shelfView, setShelfView] = useState<ShelfView>("read");
  const [genre, setGenre] = useState<Genre | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const shelfBooks = books.filter((book) =>
    shelfView === "want" ? book.status === "want" : book.status !== "want",
  );
  const genreBooks = genre
    ? shelfBooks.filter((book) => book.genre === genre)
    : shelfBooks;
  const searchTerms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const visibleBooks = searchTerms.length
    ? genreBooks.filter((book) => {
        const searchable = [book.title, book.author, book.genre, book.review ?? "", book.status]
          .join(" ")
          .toLowerCase();
        return searchTerms.every((term) => searchable.includes(term));
      })
    : genreBooks;
  const selectedIndex = visibleBooks.findIndex((book) => book.id === selectedId);
  const selected = selectedIndex >= 0 ? visibleBooks[selectedIndex] : null;
  const shown = visibleBooks.length;
  const reading = shelfBooks.filter((book) => book.status === "reading").length;

  return (
    <section className="flex flex-col gap-10">
      <div>
        <div className="rule-wrap">
          <div className="hairline" />
        </div>

        <label className="library-search">
          <span className="eyebrow">Search your archive</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="What are you looking for?"
          />
        </label>

        <nav className="filters" aria-label="Filter books">
          <button
            type="button"
            className="filter"
            aria-pressed={shelfView === "read"}
            onClick={() => setShelfView("read")}
          >
            Read
          </button>
          <button
            type="button"
            className="filter"
            aria-pressed={shelfView === "want"}
            onClick={() => setShelfView("want")}
          >
            Want to read
          </button>
          <span className="filter-divider" aria-hidden="true" />
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
        {visibleBooks.length === 0 ? (
          <p className="empty-shelf">
            {query.trim()
              ? `No books match “${query.trim()}”.`
              : genre
              ? `No ${genre} books on this shelf yet.`
              : shelfView === "want"
              ? "Your want-to-read shelf is waiting for its first book."
              : "The shelf is empty. Add a book to start it off."}
          </p>
        ) : (
          <div className="shelf-scroll">
            <div className="shelf-inner">
              <div className="shelf" role="group" aria-label="Bookshelf">
                {visibleBooks.map((book) => (
                  <Spine
                    key={book.id}
                    book={book}
                    selected={selectedId === book.id}
                    onSelect={setSelectedId}
                    display="peek"
                  />
                ))}
              </div>
              <div className="board" />
            </div>
          </div>
        )}

        <p className="eyebrow count">
          {shown} {shown === 1 ? "volume" : "volumes"}
          {genre
            ? ` in ${genre}`
            : shelfView === "want"
              ? " waiting to be read"
              : " on the read shelf"}
          {reading > 0 && !genre ? ` · ${reading} in progress` : ""}
        </p>

        {visibleBooks.length > 0 ? (
          <p className="shelf-hint">Open a book to rate it and write a review.</p>
        ) : null}
      </div>

      {selected ? (
        <BookView
          book={selected}
          onClose={() => setSelectedId(null)}
          onPrevious={() =>
            setSelectedId(
              visibleBooks[(selectedIndex - 1 + visibleBooks.length) % visibleBooks.length].id,
            )
          }
          onNext={() =>
            setSelectedId(visibleBooks[(selectedIndex + 1) % visibleBooks.length].id)
          }
          canNavigate={visibleBooks.length > 1}
        />
      ) : null}
    </section>
  );
}
