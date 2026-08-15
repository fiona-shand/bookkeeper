import type { Book } from "@/lib/books";
import { readableInk, spineFontSize, spineGeometry } from "@/lib/spine";

type SpineProps = {
  book: Book;
  selected: boolean;
  dimmed: boolean;
  onSelect: (id: string) => void;
};

export default function Spine({ book, selected, dimmed, onSelect }: SpineProps) {
  const geometry = spineGeometry(book.pages, book.binding);
  const ink = readableInk(book.color);

  return (
    <button
      type="button"
      className="spine"
      style={{
        width: geometry.width,
        height: geometry.height,
        background: book.color,
      }}
      data-selected={selected}
      data-dimmed={dimmed}
      aria-pressed={selected}
      aria-label={`${book.title} by ${book.author}`}
      onClick={() => onSelect(book.id)}
    >
      <span className="spine-face" style={{ color: ink }}>
        <span
          className="spine-band spine-band-top"
          style={{ background: ink }}
        />
        <span
          className="spine-text"
          style={{ fontSize: spineFontSize(geometry.width) }}
        >
          <span className="spine-title">{book.title}</span>
          {geometry.width >= 30 ? (
            <span className="spine-author">{book.author}</span>
          ) : null}
        </span>
        <span
          className="spine-band spine-band-bottom"
          style={{ background: ink }}
        />
      </span>
    </button>
  );
}
