/**
 * Converting between what a person types and the integer pence we store.
 *
 * Nothing here goes via a float. `Math.round(parseFloat(x) * 100)` happens to
 * agree for most two-decimal prices, but it is exact for none of them: the
 * multiplication lands fractionally off and Math.round hides it. Where that
 * stops being harmless is sub-penny input - `2.675` is really 2.67499...  in
 * binary, so rounding yields 268 while the typed value is nearer 267. Reading
 * the digits either side of the point as integers is exact by construction, and
 * lets us reject sub-penny precision outright instead of silently rounding a
 * price the shopkeeper deliberately typed.
 */

// Optional leading £, digits with optional thousands separators, then at most
// two decimal places.
const AMOUNT = /^£?\s*(\d{1,3}(?:,\d{3})*|\d+)(?:\.(\d{1,2}))?$/;

/**
 * Parse a typed amount in pounds into integer pence.
 *
 * Returns null for anything that is not a clean amount, including values with
 * more precision than a penny - rounding those would silently change a price
 * the shopkeeper deliberately typed.
 */
export function parsePoundsToPence(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;

  const match = AMOUNT.exec(trimmed);
  if (!match) return null;

  const [, poundsPart, decimalPart] = match;

  const pounds = Number.parseInt(poundsPart.replaceAll(",", ""), 10);
  if (!Number.isSafeInteger(pounds)) return null;

  // "12.5" means fifty pence, not five: pad right, not left.
  const pence = decimalPart ? Number.parseInt(decimalPart.padEnd(2, "0"), 10) : 0;

  return pounds * 100 + pence;
}

/** Render integer pence as a sterling amount, e.g. 1250 -> "£12.50". */
export function formatPence(pence: number): string {
  const negative = pence < 0;
  const absolute = Math.abs(pence);

  const pounds = Math.floor(absolute / 100);
  const remainder = absolute % 100;

  const grouped = pounds.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return `${negative ? "-" : ""}£${grouped}.${remainder.toString().padStart(2, "0")}`;
}
