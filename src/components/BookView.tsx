"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { removeBook, saveReview } from "@/app/actions";
import {
  READING_STATUSES,
  STATUS_LABEL,
  type ReadingStatus,
} from "@/lib/books";
import type { ShelfBook } from "@/lib/queries";
import { BINDING } from "@/lib/spine";
import { themeBookIndex } from "@/lib/theme";
import StarRating from "./StarRating";

type BookViewProps = {
  book: ShelfBook;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  canNavigate: boolean;
};

export default function BookView(props: BookViewProps) {
  const [open, setOpen] = useState(false);

  // Let the closed cover paint for a frame, so only the first book animates.
  useEffect(() => {
    const timer = window.setTimeout(() => setOpen(true), 40);
    return () => window.clearTimeout(timer);
  }, []);

  return <BookViewContent key={props.book.id} {...props} open={open} />;
}

function BookViewContent({
  book,
  onClose,
  onPrevious,
  onNext,
  canNavigate,
  open,
}: BookViewProps & { open: boolean }) {
  const [rating, setRating] = useState<number | null>(book.rating);
  const [review, setReview] = useState(book.review ?? "");
  const [status, setStatus] = useState<ReadingStatus>(book.status);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLInputElement) return;
      if (event.key === "ArrowLeft" && canNavigate) void handleNavigate(onPrevious);
      if (event.key === "ArrowRight" && canNavigate) void handleNavigate(onNext);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  const dirty =
    rating !== book.rating ||
    review !== (book.review ?? "") ||
    status !== book.status;

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const result = await saveReview({ id: book.id, rating, review, status });
      setMessage(result.ok ? "Saved." : result.error);
    });
  }

  function handleRemove() {
    if (!confirmRemove) {
      setConfirmRemove(true);
      return;
    }
    startTransition(async () => {
      const result = await removeBook(book.id);
      if (result.ok) onClose();
      else setMessage(result.error);
    });
  }

  async function handleNavigate(navigate: () => void) {
    if (pending) return;
    if (dirty) {
      const result = await saveReview({ id: book.id, rating, review, status });
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
    }
    navigate();
  }

  const colorIndex = themeBookIndex(book.id);
  const coverColor = `var(--book-${colorIndex})`;
  const ink = `var(--book-ink-${colorIndex})`;
  const titleSize =
    book.title.length >= 70
      ? "long"
      : book.title.length >= 45
        ? "medium"
        : "short";

  return (
    <div
      className="book-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`${book.title} by ${book.author}`}
    >
      <button
        type="button"
        className="book-backdrop"
        aria-label="Close book"
        onClick={onClose}
      />

      {canNavigate ? (
        <>
          <button className="book-nav book-nav-previous" type="button" aria-label="Previous book" onClick={() => void handleNavigate(onPrevious)}>
            <span aria-hidden="true">←</span>
          </button>
          <button className="book-nav book-nav-next" type="button" aria-label="Next book" onClick={() => void handleNavigate(onNext)}>
            <span aria-hidden="true">→</span>
          </button>
        </>
      ) : null}

      <div className="book-stage" data-open={open}>
        <div className="book-spread">
          {/* The right-hand page, revealed as the cover swings away. */}
          <div className="book-page book-page-right">
            <label className="eyebrow" htmlFor="review">
              {status === "want" ? "Notes before reading" : "Your review"}
            </label>

            <textarea
              id="review"
              className="review-field"
              value={review}
              onChange={(event) => setReview(event.target.value)}
              placeholder="What did you make of it?"
              spellCheck
            />

            <div className="book-actions">
              <button
                type="button"
                className="ink-button"
                onClick={handleSave}
                disabled={pending || !dirty}
              >
                {pending ? "Saving…" : dirty ? "Save" : "Saved"}
              </button>

              {message ? <span className="book-message">{message}</span> : null}

              <button
                type="button"
                className="text-button remove-button"
                onClick={handleRemove}
                disabled={pending}
              >
                {confirmRemove ? "Really remove?" : "Remove"}
              </button>
            </div>
          </div>

          {/* The cover, hinged on its left edge at the spine. */}
          <div className="book-cover">
            <div
              className="book-cover-front"
              style={{ background: coverColor, color: ink }}
            >
              {book.coverUrl ? (
                <Image
                  src={book.coverUrl}
                  alt={`Cover of ${book.title}`}
                  fill
                  unoptimized
                  sizes="340px"
                  style={{ objectFit: "contain" }}
                />
              ) : (
                <div className="cover-typeset">
                  <span className="cover-title" data-title-size={titleSize}>
                    {book.title}
                  </span>
                  <span className="cover-author">{book.author}</span>
                </div>
              )}
            </div>

            {/* The inside of the front cover — the left-hand page once open. */}
            <div className="book-page book-cover-back">
              <div className="book-headings" data-has-cover={Boolean(book.coverUrl)}>
                <h2 className="detail-title" data-title-size={titleSize}>
                  {book.title}
                </h2>
                <p className="detail-author">{book.author}</p>
              </div>

              {book.coverUrl ? (
                <div className="detail-cover">
                  <Image
                    src={book.coverUrl}
                    alt={`Cover of ${book.title}`}
                    fill
                    unoptimized
                    sizes="86px"
                    style={{ objectFit: "cover" }}
                  />
                </div>
              ) : null}

              <div className="rating-row">
                <span className="eyebrow">Your rating</span>
                <StarRating value={rating} onChange={setRating} />
              </div>

              <div className="status-row">
                <span className="eyebrow">Shelf</span>
                <div className="status-options">
                  {READING_STATUSES.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className="status-option"
                      aria-pressed={status === option}
                      onClick={() => setStatus(option)}
                    >
                      {STATUS_LABEL[option]}
                    </button>
                  ))}
                </div>
              </div>

              <dl className="detail-meta book-meta">
                <div>
                  <dt>Genre</dt>
                  <dd>{book.genre}</dd>
                </div>
                <div>
                  <dt>Published</dt>
                  <dd>{book.year ?? "—"}</dd>
                </div>
                <div>
                  <dt>Pages</dt>
                  <dd>{book.pages}</dd>
                </div>
                <div>
                  <dt>Binding</dt>
                  <dd>{BINDING[book.binding].label}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <button type="button" className="book-close" onClick={onClose}>
        Close
      </button>
    </div>
  );
}
