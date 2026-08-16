"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GENRES, type Genre } from "@/lib/books";
import type { ShelfBook } from "@/lib/queries";
import BookView from "./BookView";
import Spine from "./Spine";

type RatingFilter = "any" | "unrated" | 1 | 2 | 3 | 4 | 5;

const RATING_CHOICES: RatingFilter[] = [5, 4, 3, 2, 1, "unrated"];

function ratingLabel(choice: RatingFilter): string {
  if (choice === "any") return "Any rating";
  if (choice === "unrated") return "Unrated";
  return "★".repeat(choice);
}

export default function Library({ books }: { books: ShelfBook[] }) {
  const [genre, setGenre] = useState<Genre | null>(null);
  const [rating, setRating] = useState<RatingFilter>("any");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  // Tracks a click-and-drag across the shelf. `moved` is what tells a drag
  // apart from a click, so dragging past a book doesn't open it.
  const drag = useRef({ active: false, startX: 0, startScroll: 0, moved: false });
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  // Filtering removes books from the shelf rather than fading them, so what's
  // left closes up side by side.
  const visible = books.filter((book) => {
    if (genre !== null && book.genre !== genre) return false;
    if (rating === "unrated") return book.rating === null;
    if (rating !== "any" && book.rating !== rating) return false;
    return true;
  });

  const selected = books.find((book) => book.id === selectedId) ?? null;
  const reading = visible.filter((book) => book.status === "reading").length;

  const syncArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // Deferred a frame so layout has settled, and so this isn't a setState
    // running synchronously inside the effect body.
    const frame = requestAnimationFrame(syncArrows);
    el.addEventListener("scroll", syncArrows, { passive: true });
    window.addEventListener("resize", syncArrows);

    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("scroll", syncArrows);
      window.removeEventListener("resize", syncArrows);
    };
    // visible.length matters: filtering changes how far the shelf can scroll.
  }, [syncArrows, visible.length]);

  // Drag anywhere on the shelf to pull it along.
  useEffect(() => {
    function onMove(event: PointerEvent) {
      const el = scrollRef.current;
      if (!drag.current.active || !el) return;

      const dx = event.clientX - drag.current.startX;
      // A few pixels of slop, so a slightly shaky click is still a click.
      if (!drag.current.moved && Math.abs(dx) < 5) return;

      drag.current.moved = true;
      el.scrollLeft = drag.current.startScroll - dx;
    }

    function onUp() {
      drag.current.active = false;
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  function startDrag(event: React.PointerEvent) {
    const el = scrollRef.current;
    if (event.button !== 0 || !el) return;
    drag.current = {
      active: true,
      startX: event.clientX,
      startScroll: el.scrollLeft,
      moved: false,
    };
  }

  // Swallows the click that follows a drag, so releasing over a spine after
  // dragging doesn't open that book.
  function swallowDragClick(event: React.MouseEvent) {
    if (!drag.current.moved) return;
    event.preventDefault();
    event.stopPropagation();
    drag.current.moved = false;
  }

  function onShelfKeyDown(event: React.KeyboardEvent) {
    const el = scrollRef.current;
    if (!el) return;

    if (event.key === "ArrowRight") {
      event.preventDefault();
      nudge(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      nudge(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      el.scrollTo({ left: 0, behavior: "smooth" });
    } else if (event.key === "End") {
      event.preventDefault();
      el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
    }
  }

  function nudge(direction: -1 | 1) {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.7, behavior: "smooth" });
  }

  const filtered = genre !== null || rating !== "any";

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

        <nav className="filters filters-rating" aria-label="Filter by rating">
          <button
            type="button"
            className="filter"
            aria-pressed={rating === "any"}
            onClick={() => setRating("any")}
          >
            Any rating
          </button>
          {RATING_CHOICES.map((choice) => (
            <button
              key={String(choice)}
              type="button"
              className="filter filter-stars"
              aria-pressed={rating === choice}
              aria-label={
                choice === "unrated" ? "Unrated" : `${choice} stars exactly`
              }
              onClick={() => setRating(rating === choice ? "any" : choice)}
            >
              {ratingLabel(choice)}
            </button>
          ))}
        </nav>
      </div>

      <div>
        {books.length === 0 ? (
          <p className="empty-shelf">
            The shelf is empty. Add a book to start it off.
          </p>
        ) : visible.length === 0 ? (
          <p className="empty-shelf">Nothing on the shelf matches that.</p>
        ) : (
          <div className="shelf-frame" data-at-start={atStart} data-at-end={atEnd}>
            <button
              type="button"
              className="shelf-arrow shelf-arrow-left"
              onClick={() => nudge(-1)}
              disabled={atStart}
              aria-label="Scroll shelf left"
            >
              <span aria-hidden="true">←</span>
            </button>

            <div
              className="shelf-scroll"
              ref={scrollRef}
              role="region"
              aria-label="Bookshelf, scrolls horizontally"
              tabIndex={0}
              onPointerDown={startDrag}
              onClickCapture={swallowDragClick}
              onKeyDown={onShelfKeyDown}
            >
              <div className="shelf-inner">
                <div className="shelf" role="group" aria-label="Bookshelf">
                  {visible.map((book) => (
                    <Spine
                      key={book.id}
                      book={book}
                      selected={selectedId === book.id}
                      onSelect={setSelectedId}
                    />
                  ))}
                </div>
                <div className="board" />
              </div>
            </div>

            <button
              type="button"
              className="shelf-arrow shelf-arrow-right"
              onClick={() => nudge(1)}
              disabled={atEnd}
              aria-label="Scroll shelf right"
            >
              <span aria-hidden="true">→</span>
            </button>
          </div>
        )}

        <p className="eyebrow count">
          {visible.length} {visible.length === 1 ? "volume" : "volumes"}
          {filtered ? " shown" : " on the shelf"}
          {reading > 0 ? ` · ${reading} in progress` : ""}
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
