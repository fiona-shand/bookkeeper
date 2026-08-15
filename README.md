# Bookshelf

A reading tracker that shows your library the way you'd actually see it — as a
shelf of book spines, not a grid of cover thumbnails.

Nothing is built yet. This folder currently holds the API research that decides
the architecture.

## The finding that shapes the build

No public book API returns spine images. Open Library, Google Books, Hardcover
and ISBNdb all serve front covers only. So the shelf can't be fetched — it has
to be **generated**, from three inputs:

| Input | Where it comes from | Drives |
| --- | --- | --- |
| Page count | Any free API, or a Goodreads CSV | Spine width, via the bookbinding PPI formula |
| Binding | `physical_format` / CSV `Binding` column | Spine height, and the ragged shelf edge |
| Cover colour | Extracted from cover art with `node-vibrant` | Spine fill |

That reframes the project: it's a spine-rendering app that happens to fetch
metadata, not a book-data app with a shelf skin on top.

## Research

`docs/bookshelf-api-research.html` — the full write-up, including a working demo
of the spine-rendering technique. Open it in a browser.

Covers: the four metadata APIs compared, cover-image endpoints and their rate
limits, the spine geometry maths, colour extraction, Goodreads CSV import
mapping, and the licensing constraints worth knowing before it goes public.

## Suggested first step

Start at the rendering layer, not the API layer. Hand-write a JSON array of
~15 books with page counts and hex colours and get the shelf looking right.
No API key, no network, no database — and it's the part that decides whether
the project is worth finishing.

Then: Goodreads CSV import to fill it → live search against Google Books →
covers from Open Library → colour extraction last.

## Stack sketch

Next.js + Prisma + SQLite, covers cached to disk.
