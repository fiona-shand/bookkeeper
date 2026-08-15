import Library from "@/components/Library";
import Recommend from "@/components/Recommend";
import { BOOKS } from "@/lib/books";

export default function Page() {
  const pages = BOOKS.reduce((total, book) => total + book.pages, 0);

  return (
    <main className="flex flex-col gap-16 pb-28">
      <header className="mx-auto flex w-full max-w-3xl flex-col items-center gap-7 px-6 pt-24 text-center sm:pt-32">
        <p className="eyebrow">
          {BOOKS.length} books · {pages.toLocaleString()} pages
        </p>

        <h1 className="hero-title">welcome to my world</h1>

        <p
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: "1.2rem",
            color: "var(--color-ink-soft)",
            maxWidth: "34ch",
          }}
        >
          Everything I have read, standing up the way it would in a room.
        </p>

        <div className="flex min-h-[3.5rem] w-full items-start justify-center pt-2">
          <Recommend />
        </div>
      </header>

      <Library />
    </main>
  );
}
