/** Pieces in words: "1 piece", "4 pieces". */
export function piecesLabel(pieces: number): string {
  return `${pieces} ${pieces === 1 ? "piece" : "pieces"}`;
}

/**
 * What a piece made to order means for the parcel: everything goes together,
 * once it is ready - so the longest wait is the one that counts. Null when
 * nothing is made to order.
 */
export function madeToOrderNote(lines: readonly { name: string; madeToOrder: boolean; leadTimeDays: number | null }[]): string | null {
  const made = lines.filter((line) => line.madeToOrder);
  if (made.length === 0) return null;

  const days = Math.max(0, ...made.map((line) => line.leadTimeDays ?? 0));
  const within = days > 0 ? `, within ${days} days` : "";
  return made.length === 1
    ? `${made[0].name} is made to order, so everything is sent together once it's ready${within}.`
    : `Some pieces are made to order, so everything is sent together once they're ready${within}.`;
}

/**
 * A line's choices in a few words, for the order beside checkout: "Pack of 3
 * · Printed message · Rebecca & Oscar". The printed words are named rather
 * than quoted; they are in full on the basket and on the order.
 */
export function shortDetails(details: readonly { label: string; value: string }[]): string {
  return details.map((row) => (row.value.startsWith("Printed: ") ? "Printed message" : row.value)).join(" · ");
}
