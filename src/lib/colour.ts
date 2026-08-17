import { Vibrant } from "node-vibrant/node";

/** Used when a book has no cover, or the cover can't be read. */
export const FALLBACK_COLOUR = "#6B6660";

const FALLBACK_PALETTE = [
  "#2A6068",
  "#8E4B55",
  "#344F78",
  "#6C5B7B",
  "#55705A",
  "#B36B45",
] as const;

function stableIndex(seed: string, length: number): number {
  let hash = 0;
  for (const character of seed) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return hash % length;
}

/** A varied fallback for covers that are missing or only yield muddy browns. */
export function fallbackColour(seed: string): string {
  return FALLBACK_PALETTE[stableIndex(seed, FALLBACK_PALETTE.length)];
}

/**
 * Sample a spine colour from the cover art.
 *
 * Prefer a colourful swatch from the real cover. Brown/orange swatches with
 * little saturation are skipped so a run of sepia covers does not turn into a
 * uniformly brown shelf. Never throws.
 */
export async function coverColour(imageUrl: string): Promise<string> {
  try {
    const palette = await Vibrant.from(imageUrl).getPalette();
    const candidates = [
      palette.DarkVibrant,
      palette.Vibrant,
      palette.LightVibrant,
      palette.DarkMuted,
      palette.Muted,
      palette.LightMuted,
    ].filter((swatch) => swatch !== null);

    const colourful = candidates.find((swatch) => {
      const [hue, saturation] = swatch.hsl;
      const muddyBrown = hue >= 0.045 && hue <= 0.16 && saturation < 0.58;
      return saturation >= 0.24 && !muddyBrown;
    });

    return colourful?.hex ?? fallbackColour(imageUrl);
  } catch {
    return fallbackColour(imageUrl);
  }
}
