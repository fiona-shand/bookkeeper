/**
 * "Fiona" → "Fiona’s", "James" → "James’". Uses a typographic apostrophe,
 * since this lands in a display serif where a straight quote looks wrong.
 */
export function possessive(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) return trimmed;
  return /[sS]$/.test(trimmed) ? `${trimmed}’` : `${trimmed}’s`;
}
