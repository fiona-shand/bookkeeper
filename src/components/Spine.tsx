import type { ShelfBook } from "@/lib/queries";
import { spineFontSize, spineGeometry } from "@/lib/spine";
import { themeBookIndex } from "@/lib/theme";

type SpineProps = {
  book: ShelfBook;
  selected: boolean;
  onSelect: (id: string) => void;
  display: "spine" | "peek";
};

const MAX_SPINE_TITLE_LENGTH = 34;

function spineTitle(title: string): string {
  if (title.length <= MAX_SPINE_TITLE_LENGTH) return title;
  return `${title.slice(0, MAX_SPINE_TITLE_LENGTH).trimEnd()}…`;
}

export default function Spine({ book, selected, onSelect, display }: SpineProps) {
  const displayTitle = spineTitle(book.title);
  const geometry = spineGeometry(book.pages, book.binding, book.id);
  const displayWidth = Math.min(58, geometry.width);
  const colorIndex = themeBookIndex(book.id);
  const coverColor = `var(--book-${colorIndex})`;
  const ink = book.coverUrl ? "#f8f4e9" : `var(--book-ink-${colorIndex})`;
  const reading = book.status === "reading";

  function preloadCover() {
    if (!book.coverUrl) return null;
    const image = new window.Image();
    image.src = book.coverUrl;
    return image;
  }

  function openBook() {
    const image = preloadCover();
    if (!image || image.complete) {
      onSelect(book.id);
      return;
    }

    let opened = false;
    const finish = () => {
      if (opened) return;
      opened = true;
      onSelect(book.id);
    };
    image.addEventListener("load", finish, { once: true });
    image.addEventListener("error", finish, { once: true });
    window.setTimeout(finish, 2500);
  }

  return (
    <button
      type="button"
      className="spine"
      style={{
        width: displayWidth,
        height: geometry.height,
        background: coverColor,
      }}
      data-selected={selected}
      data-display={display}
      data-tilt={colorIndex % 3}
      aria-pressed={selected}
      aria-label={
        `${book.title} by ${book.author}` +
        (reading ? " — currently reading" : "")
      }
      onPointerEnter={preloadCover}
      onFocus={preloadCover}
      onClick={openBook}
    >
      {book.coverUrl ? (
        <span className="spine-cover-art" aria-hidden="true">
          <Image
            src={book.coverUrl}
            alt=""
            fill
            sizes="90px"
            style={{ objectFit: "cover", objectPosition: "left center" }}
          />
        </span>
      ) : null}

      {display === "peek" && book.coverUrl ? (
        <span className="spine-cover-peek" aria-hidden="true">
          <Image src={book.coverUrl} alt="" fill sizes="48px" style={{ objectFit: "cover", objectPosition: "left center" }} />
        </span>
      ) : null}
      {/* Silk marker for whatever you're in the middle of. */}
      {reading ? <span className="bookmark" aria-hidden="true" /> : null}

      <span className="spine-face" style={{ color: ink }}>
        <span
          className="spine-band spine-band-top"
          style={{ background: ink }}
        />
        <span
          className="spine-text"
          style={{ fontSize: spineFontSize(displayWidth) }}
        >
          <span className="spine-title" aria-label={book.title}>
            {displayTitle}
          </span>
        </span>
        <span
          className="spine-band spine-band-bottom"
          style={{ background: ink }}
        />
      </span>
      <span className="spine-preview" aria-hidden="true">
        <strong>{book.title}</strong>
        <em>{book.author}</em>
        <small>{book.year ?? "Year unknown"} · {book.binding === "hardcover" ? "Hardcover" : "Paperback"}</small>
        <small>{book.genre}{book.rating ? ` · ${"★".repeat(book.rating)}` : ""}</small>
      </span>
    </button>
  );
}
import Image from "next/image";
