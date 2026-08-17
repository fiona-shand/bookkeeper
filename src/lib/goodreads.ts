import { XMLParser } from "fast-xml-parser";
import type { ReadingStatus } from "./books";

/**
 * Goodreads import, via the public RSS feed.
 *
 * The Goodreads API was retired to new developers in 2020 and switched off
 * since, so there is no OAuth "connect" to build. What still works is the RSS
 * feed every *public* shelf exposes, which carries the reader's own ratings,
 * reviews and shelf names.
 *
 * Two limits are inherent to that feed and can't be engineered away:
 *   - it returns at most 100 books per shelf, and
 *   - it has no page count, which is what drives spine width.
 * Page counts are backfilled from Open Library by ISBN at import time.
 */

const USER_AGENT = "Bookkeeper/0.1 (personal reading tracker; contact: you@example.com)";

/** The three exclusive Goodreads shelves, and how they map onto ours. */
export const GOODREADS_SHELVES = ["read", "currently-reading", "to-read"] as const;

export type GoodreadsShelf = (typeof GOODREADS_SHELVES)[number];

export const SHELF_STATUS: Record<GoodreadsShelf, ReadingStatus> = {
  read: "read",
  "currently-reading": "reading",
  "to-read": "want",
};

/** The feed caps each shelf at this many items. */
export const FEED_CAP = 100;

export type GoodreadsBook = {
  goodreadsId: string;
  title: string;
  author: string;
  isbn: string | null;
  year: number | null;
  /**
   * From the feed's nested <book><num_pages>. Frequently blank on Goodreads,
   * which is why the importer still falls back to Open Library.
   */
  pages: number | null;
  /** 1–5, or null when Goodreads reports 0 (unrated). */
  rating: number | null;
  review: string | null;
  imageUrl: string | null;
  shelf: GoodreadsShelf;
};

/**
 * Accepts whatever the reader has to hand: a profile URL, a bare numeric id, or
 * a full RSS URL copied off their shelf page (which may carry a `key` token).
 */
export function resolveProfileId(input: string): string | null {
  const value = input.trim();
  if (!value) return null;

  const fromFeed = /\/review\/list_rss\/(\d+)/.exec(value);
  if (fromFeed) return fromFeed[1];

  const fromProfile = /\/user\/show\/(\d+)/.exec(value);
  if (fromProfile) return fromProfile[1];

  if (/^\d+$/.test(value)) return value;

  return null;
}

/** Finds a profile link even when iOS stores it only in rich clipboard HTML. */
export function resolveProfileIdFromClipboard(values: string[]): string | null {
  for (const value of values) {
    const profileId = resolveProfileId(value.replaceAll("&amp;", "&"));
    if (profileId) return profileId;
  }
  return null;
}

/** Pulls a numeric profile id out of any Goodreads URL, or a page of HTML. */
export function extractProfileId(text: string): string | null {
  const match = /\/user\/show\/(\d+)/.exec(text);
  return match ? match[1] : null;
}

/**
 * Goodreads custom URLs are letters, digits, dots, dashes and underscores.
 * A bare number is an id, not a username, so it's excluded here.
 */
export function isLikelyUsername(value: string): boolean {
  const trimmed = value.trim();
  return /^[A-Za-z0-9._-]{2,50}$/.test(trimmed) && !/^\d+$/.test(trimmed);
}

/**
 * Turns a username into the numeric id the RSS feed needs.
 *
 * A Goodreads custom URL (goodreads.com/rgay) redirects to the real profile at
 * /user/show/<id>-<slug>, so following it and reading the landing URL gives us
 * the id. This only works for people who set a custom URL — most Goodreads
 * users never do, and for them only the profile URL or id will work.
 */
export async function resolveUsername(username: string): Promise<string | null> {
  const response = await fetch(
    `https://www.goodreads.com/${encodeURIComponent(username.trim())}`,
    {
      headers: { "User-Agent": USER_AGENT },
      redirect: "follow",
      cache: "no-store",
    },
  );

  if (!response.ok) return null;

  // Usually the redirect has already landed us on the numeric profile.
  const fromUrl = extractProfileId(response.url);
  if (fromUrl) return fromUrl;

  // Otherwise the canonical link in the page carries it.
  return extractProfileId(await response.text());
}

export function feedUrl(profileId: string, shelf: GoodreadsShelf): string {
  const url = new URL(`https://www.goodreads.com/review/list_rss/${profileId}`);
  url.searchParams.set("shelf", shelf);
  return url.toString();
}

/** Goodreads reviews come through as HTML. */
export function toPlainText(html: string): string {
  return (
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<[^>]+>/g, "")
      // &amp; is decoded last, otherwise "&amp;lt;" would decode twice.
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

function text(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number") return String(value);
  return null;
}

/** Page count lives at <item><book><num_pages>, and is often empty. */
function pageCount(value: unknown): number | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = text((value as Record<string, unknown>).num_pages);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
}

function year(value: unknown): number | null {
  const raw = text(value);
  if (!raw) return null;
  const match = /(\d{4})/.exec(raw);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

// parseTagValue is off so ISBNs and ids stay strings rather than losing
// precision or dropping leading zeros.
const parser = new XMLParser({
  ignoreAttributes: true,
  trimValues: true,
  parseTagValue: false,
});

/**
 * Split from the fetch so the feed shape can be tested without reaching
 * Goodreads. Items without an id or title are dropped.
 */
export function parseShelfFeed(xml: string, shelf: GoodreadsShelf): GoodreadsBook[] {
  let parsed: unknown;
  try {
    parsed = parser.parse(xml);
  } catch {
    return [];
  }

  const channel = (parsed as { rss?: { channel?: unknown } })?.rss?.channel;
  if (typeof channel !== "object" || channel === null) return [];

  const rawItems = (channel as { item?: unknown }).item;
  // A shelf with exactly one book parses to an object rather than an array.
  const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];

  const books: GoodreadsBook[] = [];

  for (const raw of items) {
    if (typeof raw !== "object" || raw === null) continue;
    const item = raw as Record<string, unknown>;

    const goodreadsId = text(item.book_id);
    const title = text(item.title);
    if (!goodreadsId || !title) continue;

    const ratingRaw = Number(text(item.user_rating) ?? "0");
    const review = text(item.user_review);

    books.push({
      goodreadsId,
      title,
      author: text(item.author_name) ?? "Unknown author",
      isbn: text(item.isbn),
      year: year(item.book_published),
      pages: pageCount(item.book),
      // Goodreads writes 0 for "not rated".
      rating: Number.isFinite(ratingRaw) && ratingRaw >= 1 && ratingRaw <= 5
        ? ratingRaw
        : null,
      review: review ? toPlainText(review) || null : null,
      imageUrl:
        text(item.book_large_image_url) ??
        text(item.book_image_url) ??
        text(item.book_medium_image_url),
      shelf,
    });
  }

  return books;
}

export async function fetchShelf(
  profileId: string,
  shelf: GoodreadsShelf,
): Promise<GoodreadsBook[]> {
  const response = await fetch(feedUrl(profileId, shelf), {
    headers: { "User-Agent": USER_AGENT },
    cache: "no-store",
  });

  if (response.status === 404) {
    throw new Error("No such Goodreads profile.");
  }
  if (!response.ok) {
    throw new Error(`Goodreads returned ${response.status}.`);
  }

  return parseShelfFeed(await response.text(), shelf);
}
