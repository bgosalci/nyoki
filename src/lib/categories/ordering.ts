import { moveInList, placeFor, type Place } from "@/lib/products/ordering";

/**
 * The order categories are shown in, on the shop and in the admin: each
 * category's `position`, read lowest first, among its siblings. Only
 * siblings are ever compared - the departments with one another, the types
 * within one department - so a key means nothing outside its own group.
 *
 * The key comes from a sequence, so a new category - made in the admin or
 * by the Shopify import - takes the highest and lands last in its group.
 * A move never makes up a key: it hands the keys of the group round among
 * its members, as a product's move does. Ties, which only data from before
 * the order existed could hold, are read by name.
 */
export const CATEGORY_ORDER: [{ position: "asc" }, { name: "asc" }] = [{ position: "asc" }, { name: "asc" }];

export interface PlacedCategory {
  id: string;
  parentId: string | null;
  position: number;
}

/**
 * The keys to write for `moving` to sit just before or after `target`,
 * given every category in `CATEGORY_ORDER`: only the rows whose key
 * changes, all of them `moving`'s siblings. What sits inside a category
 * goes with it without being touched. Null when the two are not siblings -
 * moving a category into another group is changing its parent, which its
 * own page does - or either is unknown.
 */
export function moveAmongSiblings(
  rows: readonly PlacedCategory[],
  moving: string,
  target: string,
  place: Place,
): { id: string; position: number }[] | null {
  const item = rows.find((row) => row.id === moving);
  const onto = rows.find((row) => row.id === target);
  if (!item || !onto || item.parentId !== onto.parentId) return null;

  const siblings = rows.filter((row) => row.parentId === item.parentId);

  // The group's own keys, lowest first, each raised above the one before
  // where two tie, so the order written is the order read back.
  const keys = siblings.map((row) => row.position).sort((a, b) => a - b);
  for (let i = 1; i < keys.length; i += 1) keys[i] = Math.max(keys[i], keys[i - 1] + 1);

  return moveInList(siblings, moving, target, place)
    .map((row, index) => ({ id: row.id, position: keys[index], was: row.position }))
    .filter((row) => row.position !== row.was)
    .map(({ id, position }) => ({ id, position }));
}

/**
 * Where a category dropped on a row lands, given the rows as they are shown,
 * top to bottom. Beside a sibling, it takes that sibling's place. Among
 * another group's rows, it goes as near to where it was dropped as its own
 * group allows: after the sibling that would then be above it, or before
 * the one below when it would be first - so a group dropped among Cards'
 * types lands straight after Cards, and a type dragged out of its group
 * stops at the nearest end of it. Null for a drop that leaves it where it
 * was.
 */
export function categoryLanding(
  shown: readonly { id: string; parentId: string | null }[],
  moving: string,
  over: string,
): { target: string; place: Place } | null {
  const item = shown.find((row) => row.id === moving);
  const onto = shown.find((row) => row.id === over);
  if (!item || !onto || moving === over) return null;

  const place = placeFor(
    shown.map((row) => row.id),
    moving,
    over,
  );
  if (onto.parentId === item.parentId) return { target: over, place };

  const siblings = (rows: readonly { id: string; parentId: string | null }[]) =>
    rows.filter((row) => row.parentId === item.parentId).map((row) => row.id);
  const was = siblings(shown);
  const now = siblings(moveInList(shown, moving, over, place));
  if (now.every((id, index) => id === was[index])) return null;

  const at = now.indexOf(moving);
  return at > 0 ? { target: now[at - 1], place: "after" } : { target: now[1], place: "before" };
}
