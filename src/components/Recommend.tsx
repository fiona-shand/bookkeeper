"use client";

import { useEffect, useRef, useState } from "react";
import { BOOKS } from "@/lib/books";

export default function Recommend() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [sent, setSent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const query = value.trim().toLowerCase();

  // Anything already read is worth flagging back to whoever is recommending it.
  const alreadyHere =
    query.length >= 3
      ? BOOKS.filter(
          (book) =>
            book.title.toLowerCase().includes(query) ||
            book.author.toLowerCase().includes(query),
        ).slice(0, 3)
      : [];

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const title = value.trim();
    if (!title) return;
    setSent((current) => [title, ...current]);
    setValue("");
  }

  if (!open) {
    return (
      <button
        type="button"
        className="recommend-button"
        onClick={() => setOpen(true)}
      >
        Recommend a book
      </button>
    );
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <label className="eyebrow" htmlFor="recommend">
          Recommend a book
        </label>
        <input
          id="recommend"
          ref={inputRef}
          className="recommend-field"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="what should I read next?"
          autoComplete="off"
        />
      </form>

      {alreadyHere.length > 0 ? (
        <ul className="flex flex-col gap-1 text-left">
          {alreadyHere.map((book) => (
            <li
              key={book.id}
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "0.95rem",
                color: "var(--color-ink-soft)",
              }}
            >
              <em>{book.title}</em> — already on the shelf
            </li>
          ))}
        </ul>
      ) : null}

      {sent.length > 0 ? (
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: "1rem",
            color: "var(--color-ink-soft)",
          }}
        >
          Noted: {sent.join(", ")}. Thank you.
        </p>
      ) : null}
    </div>
  );
}
