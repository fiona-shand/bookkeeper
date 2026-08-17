export const THEMES = ["clothbound", "academia", "cottage", "modern"] as const;
export type ThemeName = (typeof THEMES)[number];

export const THEME_LABELS: Record<ThemeName, string> = {
  clothbound: "Clothbound",
  academia: "Dark Academia",
  cottage: "Cottage Garden",
  modern: "Modern Classics",
};

export function isTheme(value: unknown): value is ThemeName {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}

export function themeBookIndex(seed: string): number {
  let hash = 0;
  for (const character of seed) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return (hash % 6) + 1;
}
