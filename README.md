# Bookkeeper

A reading tracker that shows your library the way you'd actually see it — as a
shelf of book spines, not a grid of cover thumbnails. Open a book and it swings
apart like a real one, with your review written on the right-hand page.

```bash
npm install       # also generates the Prisma client
npm run db:setup  # creates the SQLite database and seeds 29 books
npm run dev       # http://localhost:3000
```

Next.js 16 (App Router, Turbopack) · React 19 · Prisma 7 + SQLite · Tailwind v4 ·
TypeScript. No `.env` needed — the database defaults to `prisma/dev.db`.

## What it does

- **A shelf of generated spines.** Width, height and colour all come from the
  book's real attributes (below).
- **Add books from Open Library.** Search by title or author; author, year, page
  count and cover fill themselves in, and the spine colour is sampled from the
  cover art. No API key required.
- **Import from Goodreads.** Paste a public profile URL and it pulls in your
  books with your own ratings and reviews. See the caveats below.
- **Open a book to review it.** Clicking a spine opens the book — the cover
  swings on its hinge and the two-page spread holds the details and star rating
  on the left leaf and a ruled review page on the right.
- **Bookmarks.** Anything on the "currently reading" shelf gets a silk marker
  showing above its spine.

## Why the spines are generated

No public book API returns spine images — Open Library, Google Books, Hardcover
and ISBNdb all serve front covers only. So the shelf is built from three fields:

| Field | Drives | Source |
| --- | --- | --- |
| `pages` | Spine width, via the bookbinding PPI formula | Open Library, or a Goodreads CSV |
| `binding` | Spine height, and the shelf's ragged top edge | Defaults to trade paperback |
| `color` | Spine fill | `node-vibrant`, sampled from the cover on add |

`src/lib/spine.ts` holds the geometry. Width uses the formula printers use:

```
spine width = page count / PPI + cover allowance
```

Because the maths is real, so are the proportions: a 1,006-page paperback
renders three times wider than a 272-page one, and hardcovers stand taller than
mass market. `readableInk()` picks black or cream lettering from each spine's
relative luminance so pale spines stay legible.

Full API research: `docs/bookshelf-api-research.html` — open it in a browser.

## Importing from Goodreads

The Goodreads API was retired to new developers in 2020 and has been off since,
so there is no OAuth "connect" to build. What still works is the RSS feed every
**public** shelf publishes, and it carries your own ratings, reviews and shelf
names — which is most of what matters.

Three limits come with that, and none of them can be engineered away:

- **The profile must be public.** A private profile returns an empty feed, not an
  error, so the importer reports that as "check Settings → Privacy on Goodreads".
- **100 books per shelf, maximum.** That's the feed's ceiling. When a shelf comes
  back at exactly 100 the importer says so, because you probably have more. The
  usual workaround is to split large shelves on Goodreads (`read-2025`,
  `read-2026`) — this importer reads the three standard shelves only.
- **Page counts are patchy.** The feed has a `num_pages` field but Goodreads
  often leaves it blank. Where it's blank, the count is looked up from Open
  Library by ISBN, which is why importing takes about a third of a second per
  book. Anything still unknown falls back to 320 pages so the spine isn't a
  sliver.

Re-importing is safe: books are matched on their Goodreads id and updated rather
than duplicated, and a book you'd already added by hand is matched on its Open
Library key and adopted rather than doubled.

## Checks

```bash
npm run check
```

Runs 78 assertions over the parts that talk to other people's services —
Open Library search parsing, colour extraction, Goodreads feed parsing, and the
import's database behaviour. They use fixtures rather than live calls, so they
work offline; the import checks write to the database and clean up after
themselves.

This isn't a full test suite — there's no runner and no component tests.

## Layout

```
prisma/
  schema.prisma     Book model
  seed.ts           29 starter books from src/lib/books.ts
src/
  app/
    page.tsx        reads the shelf from SQLite
    actions.ts      server actions: add, review, remove
    api/search/     Open Library search proxy
  components/       Library, Spine, BookView, AddBook, Recommend, StarRating
  lib/
    spine.ts        spine geometry
    openlibrary.ts  search client + genre guessing
    goodreads.ts    RSS feed client + parsing
    goodreads-import.ts  per-book import logic
    colour.ts       cover colour extraction
    queries.ts      shelf reads
    books.ts        seed data
scripts/            offline checks (npm run check)
```

## Notes

- `npm run db:reset` wipes and reseeds. Prisma will ask for confirmation first.
- Open Library asks that you identify your app. Put a real contact address in
  `USER_AGENT` in `src/lib/openlibrary.ts` before running this anywhere public.
- Genre is guessed from Open Library's subjects, which are free-form and messy.
  The add flow lets you correct it before the book goes on the shelf.
- Search results don't carry binding, so new books default to trade paperback.

## Next steps

1. **Goodreads CSV import** — the only way past the 100-book ceiling. The export
   has `Number of Pages`, `Binding`, `ISBN13` and every book, with no public
   profile needed. This is the one to build if the RSS import comes up short.
2. **Edit binding and page count** from the book's own page, so spines can be
   corrected after adding.
3. **Persist recommendations** — the recommend box is still local state.
4. **Auth**, before this goes anywhere public. There is none: every Server
   Action is reachable by anyone who can reach the site.
