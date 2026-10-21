/**
 * The order products are shown in, on the shop and in the admin list: each
 * product's `sortKey`, read highest first.
 *
 * The key comes from a sequence, so a new product - made in the admin,
 * imported from a file or from Shopify - takes the highest and lands on top.
 * A move never makes up a key: it hands the keys of the rows it passes round
 * among them, so a moved piece can never rise above one made after it, and
 * everything it passes keeps its order among itself.
 */

export type Place = "before" | "after";

export interface Keyed {
  id: string;
  sortKey: number;
}

/** The list with `moving` taken out and put just before or after `target`. */
export function moveInList<T extends { id: string }>(items: readonly T[], moving: string, target: string, place: Place): T[] {
  const item = items.find((entry) => entry.id === moving);
  if (!item || moving === target || !items.some((entry) => entry.id === target)) return [...items];

  const rest = items.filter((entry) => entry.id !== moving);
  const at = rest.findIndex((entry) => entry.id === target) + (place === "after" ? 1 : 0);
  return [...rest.slice(0, at), item, ...rest.slice(at)];
}

/**
 * Where a piece dropped on another goes: after it when moved down the list,
 * before it when moved up - so it takes the place it was dropped on.
 */
export function placeFor(shown: readonly string[], moving: string, target: string): Place {
  return shown.indexOf(moving) < shown.indexOf(target) ? "after" : "before";
}

/**
 * The keys to write for `moving` to sit just before or after `target`: only
 * the rows whose key changes, each given a key one of the rows already had.
 */
export function moveUpdates(rows: readonly Keyed[], moving: string, target: string, place: Place): Keyed[] {
  const ordered = [...rows].sort((a, b) => b.sortKey - a.sortKey || a.id.localeCompare(b.id));
  const keys = ordered.map((row) => row.sortKey);
  const moved = moveInList(ordered, moving, target, place);

  return moved
    .map((row, index) => ({ id: row.id, sortKey: keys[index] }))
    .filter((row, index) => row.sortKey !== moved[index].sortKey);
}
