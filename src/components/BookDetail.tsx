import type { Book } from "@/lib/books";
import { BINDING, spineGeometry } from "@/lib/spine";

function Stars({ rating }: { rating: number }) {
  return (
    <span aria-label={`${rating} out of 5`}>
      {"★".repeat(rating)}
      <span style={{ color: "var(--color-ink-faint)" }}>
        {"★".repeat(5 - rating)}
      </span>
    </span>
  );
}

export default function BookDetail({ book }: { book: Book }) {
  const geometry = spineGeometry(book.pages, book.binding);

  return (
    <article className="detail flex flex-col gap-6 sm:flex-row sm:gap-8">
      <div
        className="hidden w-2 shrink-0 rounded-[1px] sm:block"
        style={{ background: book.color }}
        aria-hidden="true"
      />

      <div className="flex flex-1 flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="detail-title">{book.title}</h2>
          <p className="detail-author">{book.author}</p>
        </div>

        <p className="detail-note">{book.note}</p>

        <dl className="detail-meta grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
          <div className="flex flex-col gap-1">
            <dt>Genre</dt>
            <dd>{book.genre}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt>Published</dt>
            <dd>{book.year}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt>Pages</dt>
            <dd>{book.pages}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt>Rating</dt>
            <dd>
              <Stars rating={book.rating} />
            </dd>
          </div>
        </dl>

        <div className="hairline" />

        <p className="eyebrow">
          {BINDING[book.binding].label} · spine {geometry.inches.toFixed(2)}in ·
          rendered {geometry.width}px wide
        </p>
      </div>
    </article>
  );
}
