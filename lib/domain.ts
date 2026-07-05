/** Prepend https:// when the input has no scheme. */
export function ensureProtocol(input: string): string {
  const s = input.trim();
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

/** Full, normalized URL string. Throws on unparseable input. */
export function normalizeUrl(input: string): string {
  return new URL(ensureProtocol(input)).toString();
}

/** Bare host used as the dedup key and screenshot folder name (no leading www.). */
export function normalizeDomain(input: string): string {
  const { hostname } = new URL(ensureProtocol(input));
  return hostname.replace(/^www\./i, "").toLowerCase();
}
