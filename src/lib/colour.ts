import { Vibrant } from "node-vibrant/node";

/** Used when a book has no cover, or the cover can't be read. */
export const FALLBACK_COLOUR = "#6B6660";

/**
 * Sample a spine colour from the cover art.
 *
 * DarkVibrant first because publishers generally print spines darker than the
 * cover, so it reads as the same book on a shelf. Never throws — a book with an
 * unreadable cover still belongs on the shelf, just in the fallback grey.
 */
export async function coverColour(imageUrl: string): Promise<string> {
  try {
    const palette = await Vibrant.from(imageUrl).getPalette();
    const swatch =
      palette.DarkVibrant ??
      palette.Vibrant ??
      palette.DarkMuted ??
      palette.Muted;

    return swatch?.hex ?? FALLBACK_COLOUR;
  } catch {
    return FALLBACK_COLOUR;
  }
}
