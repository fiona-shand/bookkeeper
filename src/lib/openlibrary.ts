import type { Genre } from "./books";

/**
 * Open Library client.
 *
 * No API key, no signup. Open Library asks that you identify your app in the
 * User-Agent — doing so raises the rate limit from roughly 1 to 3 requests a
 * second. Put a real contact address here before running this anywhere public.
 */
const USER_AGENT = "Bookkeeper/0.1 (personal reading tracker; contact: you@example.com)";

const SEARCH_FIELDS = [
  "key",
  "title",
  "author_name",
  "first_publish_year",
  "cover_i",
  "number_of_pages_median",
  "isbn",
  "subject",
].join(",");

export type SearchResult = {
  /** Open Library work key, e.g. "/works/OL45804W". Used to prevent duplicates. */
  key: string;
  title: string;
  author: string;
  year: number | null;
  pages: number | null;
  coverId: number | null;
  isbn: string | null;
  genre: Genre;
};

export function coverUrl(coverId: number, size: "S" | "M" | "L" = "L"): string {
  // default=false makes a missing cover 404 instead of returning a blank image,
  // so "no cover" is distinguishable from "grey cover".
  return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg?default=false`;
}

/**
 * Open Library subjects are free-form and messy, so this is a best guess that
 * gives the reader a sensible default to correct rather than a perfect answer.
 * Order matters — the specific genres are tested before the broad ones.
 */
const GENRE_RULES: ReadonlyArray<readonly [Genre, RegExp]> = [
  ["Sci-Fi", /science fiction|dystop|space opera|cyberpunk|time travel/i],
  ["Fantasy", /fantasy|mytholog|dragons|magic|sword/i],
  ["Mystery & Thrillers", /mystery|thriller|crime|detective|suspense|murder/i],
  ["Romance", /romance|love stor/i],
  [
    "Nonfiction",
    /biography|autobiograph|memoir|history|essays|nonfiction|philosophy|science|nature writing/i,
  ],
];

export function guessGenre(subjects: string[]): Genre {
  const haystack = subjects.join(" | ");
  for (const [genre, pattern] of GENRE_RULES) {
    if (pattern.test(haystack)) return genre;
  }
  return "Fiction";
}

function firstString(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return null;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Kept separate from the network call so the shape-handling can be tested
 * without hitting Open Library. Records missing a key or title are dropped
 * rather than rendered as blanks.
 */
export function parseSearchResults(payload: unknown): SearchResult[] {
  if (typeof payload !== "object" || payload === null) return [];
  const docs = (payload as { docs?: unknown }).docs;
  if (!Array.isArray(docs)) return [];

  const results: SearchResult[] = [];

  for (const raw of docs) {
    if (typeof raw !== "object" || raw === null) continue;
    const doc = raw as Record<string, unknown>;

    const key = typeof doc.key === "string" ? doc.key : null;
    const title = typeof doc.title === "string" ? doc.title.trim() : null;
    if (!key || !title) continue;

    const subjects = Array.isArray(doc.subject)
      ? doc.subject.filter((s): s is string => typeof s === "string")
      : [];

    results.push({
      key,
      title,
      author: firstString(doc.author_name) ?? "Unknown author",
      year: finiteNumber(doc.first_publish_year),
      pages: finiteNumber(doc.number_of_pages_median),
      coverId: finiteNumber(doc.cover_i),
      isbn: firstString(doc.isbn),
      genre: guessGenre(subjects),
    });
  }

  return results;
}

export async function searchBooks(
  query: string,
  signal?: AbortSignal,
): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const url = new URL("https://openlibrary.org/search.json");
  url.searchParams.set("q", trimmed);
  url.searchParams.set("limit", "8");
  url.searchParams.set("fields", SEARCH_FIELDS);

  const response = await fetch(url, {
    signal,
    headers: { "User-Agent": USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`Open Library search failed (${response.status})`);
  }

  return parseSearchResults(await response.json());
}
