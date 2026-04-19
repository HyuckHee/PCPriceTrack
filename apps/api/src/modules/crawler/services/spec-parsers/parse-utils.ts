/** Find a value by trying multiple key aliases (case-insensitive substring match). */
export function findByKeys(
  table: Record<string, string>,
  aliases: string[],
): string | undefined {
  const lower = Object.fromEntries(
    Object.entries(table).map(([k, v]) => [k.toLowerCase(), v.trim()]),
  );
  for (const alias of aliases) {
    const match = Object.entries(lower).find(([k]) => k.includes(alias.toLowerCase()));
    if (match) return match[1];
  }
  return undefined;
}

/** Parse integer from string like "125W", "16 GB", "3200 MHz". */
export function parseIntValue(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const m = raw.replace(/,/g, '').match(/(\d+)/);
  return m ? parseInt(m[1], 10) : undefined;
}

/** Parse float from string like "3.6 GHz", "4.90GHz". */
export function parseFloatValue(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const m = raw.match(/([\d.]+)/);
  return m ? parseFloat(m[1]) : undefined;
}

/** Parse mm from "325mm", "325 mm", "12.8 inches" (converts inches). */
export function parseMm(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const inchMatch = raw.match(/([\d.]+)\s*(?:inch|in\b|")/i);
  if (inchMatch) return Math.round(parseFloat(inchMatch[1]) * 25.4);
  const mmMatch = raw.match(/([\d.]+)\s*mm/i);
  if (mmMatch) return parseFloat(mmMatch[1]);
  return undefined;
}

/** Normalize whitespace and lowercase for string matching. */
export function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}
