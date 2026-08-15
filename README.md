# Bookshelf

A reading tracker that shows your library the way you'd actually see it — as a
shelf of book spines, not a grid of cover thumbnails.

```bash
npm install
npm run dev     # http://localhost:3000
```

Next.js 16 (App Router, Turbopack) · React 19 · Tailwind v4 · TypeScript.
No database and no API calls yet — the shelf runs off a local catalogue in
`src/lib/books.ts`.

## The idea

No public book API returns spine images. Open Library, Google Books, Hardcover
and ISBNdb all serve front covers only, so the shelf can't be fetched — it's
**generated** from three fields:

| Field | Drives | Where it will come from |
| --- | --- | --- |
| `pages` | Spine width, via the bookbinding PPI formula | Any free API, or a Goodreads CSV |
| `binding` | Spine height, and the shelf's ragged top edge | `physical_format` / CSV `Binding` |
| `color` | Spine fill | `node-vibrant`, sampled from the cover |

That makes this a spine-rendering app that happens to fetch metadata, rather
than a book-data app with a shelf skin on top. Full research write-up in
`docs/bookshelf-api-research.html` — open it in a browser.

## How a spine gets drawn

`src/lib/spine.ts` holds the geometry. Width uses the formula printers use to
lay out a cover:

```
spine width = page count / PPI + cover allowance
```

PPI ("pages per inch") is how many printed pages stack to an inch. Because the
maths is real, the proportions are too: a 1,006-page paperback renders three
times wider than a 272-page one, and hardcovers stand taller than mass market.

`readableInk()` picks black or cream lettering from the spine's relative
luminance, so pale spines stay legible. The curved-light effect is one
left-to-right gradient in `.spine-face`.

## What's here

- **The shelf** — 29 books, click any spine to pull it out and read the detail card.
- **Genre filters** — dim rather than remove, so the shelf keeps its shape.
- **Recommend a book** — the input from the reference design. Tells you if the
  book is already on the shelf. Submissions are local state only; they need a
  database to persist.

## Layout

```
src/
  app/          layout.tsx, page.tsx, globals.css, icon.svg
  components/   Library.tsx, Spine.tsx, BookDetail.tsx, Recommend.tsx
  lib/          books.ts (catalogue), spine.ts (geometry)
docs/           bookshelf-api-research.html
```

## Next steps

1. **Goodreads CSV import** — the export already has `Number of Pages`,
   `Binding` and `ISBN13`, which is everything the renderer needs.
2. **Live search** against Google Books (better relevance; needs a free API key —
   anonymous calls share an IP-wide quota and will 429).
3. **Covers** from `covers.openlibrary.org/b/isbn/{isbn}-L.jpg?default=false`,
   cached on add rather than fetched per render.
4. **Colour extraction** with `node-vibrant` at import time, replacing the
   hand-picked hex values.
5. **Persistence** — Prisma + SQLite, and the recommend box gets a real inbox.
