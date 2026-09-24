/**
 * The admin's one rule for a search box: every word typed must appear, in
 * any order and any case. Nothing typed matches everything.
 */
export function matchesEveryWord(haystack: string, query: string): boolean {
  const text = haystack.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => text.includes(word));
}
