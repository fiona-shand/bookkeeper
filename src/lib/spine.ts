/**
 * Spine geometry.
 *
 * No book API returns spine images, so every spine on the shelf is generated.
 * Width comes from the same formula printers use to lay out a cover:
 *
 *     spine width = page count / PPI + cover allowance
 *
 * PPI ("pages per inch") is how many printed pages stack to an inch — thicker
 * paper means a lower PPI. Height comes from the binding. Driving both off real
 * measurements is what gives the shelf its uneven top edge.
 */

export type Binding = "hardcover" | "trade" | "massMarket";

type BindingSpec = {
  /** Pages per inch of the paper stock. */
  ppi: number;
  /** Inches added for cover stock and glue, or boards on a hardcover. */
  allowance: number;
  /** Trim height in inches. */
  heightIn: number;
  label: string;
};

export const BINDING: Record<Binding, BindingSpec> = {
  hardcover: { ppi: 440, allowance: 0.25, heightIn: 9.25, label: "Hardcover" },
  trade: { ppi: 500, allowance: 0.06, heightIn: 8.0, label: "Trade paperback" },
  massMarket: { ppi: 560, allowance: 0.05, heightIn: 6.75, label: "Mass market" },
};

/** Rendering scale. Bump this to make the whole shelf bigger. */
export const PX_PER_INCH = 42;

/** Narrower than this and the vertical title stops being legible. */
const MIN_SPINE_PX = 18;

export type SpineGeometry = {
  inches: number;
  width: number;
  height: number;
};

export function spineGeometry(pages: number, binding: Binding): SpineGeometry {
  const spec = BINDING[binding];
  const inches = pages / spec.ppi + spec.allowance;

  return {
    inches,
    width: Math.max(MIN_SPINE_PX, Math.round(inches * PX_PER_INCH)),
    height: Math.round(spec.heightIn * PX_PER_INCH),
  };
}

/**
 * Pick black or cream type for a spine, based on the relative luminance of its
 * colour, so pale spines get dark lettering and dark spines get light.
 */
export function readableInk(hex: string): string {
  const channels = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));

  const luminance =
    0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];

  return luminance > 0.42 ? "#241F1A" : "#F4F0E6";
}

/** Type gets smaller on narrow spines so long titles still fit. */
export function spineFontSize(width: number): number {
  if (width >= 44) return 14;
  if (width >= 32) return 12.5;
  if (width >= 24) return 11;
  return 9.5;
}
