import { categoryPaths } from "@/lib/categories/path";
import { isClothes, offeredAxes } from "@/lib/clothes/group";
import { soldOut, toClothingOffer, type StockRow } from "@/lib/clothes/stock";
import { customisationGroup } from "@/lib/customisation/group";
import { neverRunsOut } from "@/lib/products/stock-limit";

/**
 * Filing many pieces in a category at once, or taking them out: the rules
 * shared by the products list's bulk actions and a category's own page.
 *
 * Only the links asked about change. A piece keeps every other category it is
 * in, and a whole set is never written from what a page last saw, so a stale
 * page cannot undo what was filed since it was opened.
 *
 * What a piece is told by its categories, so a move can change how it sells
 * with nothing else being saved. On its Details tab that shows as the form
 * changes; here there is no form, so the plan names what it has done.
 */

export interface CategoryChange {
  productIds: readonly string[];
  categoryIds: readonly string[];
}

export interface CategoryChanges {
  add?: CategoryChange;
  remove?: CategoryChange;
}

export type CategoryChangeResult = { ok: true; said: string[] } | { ok: false };

export interface AssignablePiece {
  id: string;
  name: string;
  status: string;
  stock: number;
  colours: readonly string[];
  sizes: readonly string[];
  madeToOrder: boolean;
  madeOnOrder: boolean;
  variants: readonly StockRow[];
  /** Offers a printed message, personalisation or packs. */
  customised: boolean;
  categoryIds: readonly string[];
}

export interface AssignableCategory {
  id: string;
  slug: string;
  name: string;
  parentId: string | null;
}

export interface CategoryLink {
  productId: string;
  categoryId: string;
}

export interface CategoryPlan {
  create: CategoryLink[];
  remove: CategoryLink[];
  /** Pieces that gained a category. */
  added: number;
  /** Pieces that lost one. */
  removed: number;
  /** Pieces to be added that had nothing to gain. */
  alreadyIn: number;
  /** Pieces to be taken out that had nothing to lose. */
  notIn: number;
  /** On the shop, in stock before and sold out now: crossing into or out of Clothes changes which variants count. */
  outOfStock: string[];
  /** On the shop with options to offer, and no longer a card or a bookmark. */
  uncustomised: string[];
}

/** Whether the shop would sell it, by the product page's own rules. */
function sellable(piece: AssignablePiece, categoryIds: readonly string[], categories: readonly AssignableCategory[]): boolean {
  const offer = toClothingOffer(offeredAxes(piece, isClothes(categoryIds, categories)));
  return offer ? !soldOut(offer) : neverRunsOut(piece) || piece.stock > 0;
}

/**
 * What to write, and what it will do. Pure, and given only what still exists:
 * ids come from the browser, and a piece or category deleted since the page
 * was opened is left out rather than failing the rest.
 */
export function planCategoryChange(
  pieces: readonly AssignablePiece[],
  categories: readonly AssignableCategory[],
  changes: CategoryChanges,
): CategoryPlan {
  const known = new Set(categories.map((category) => category.id));
  const usable = (ids: readonly string[] | undefined) => [...new Set(ids ?? [])].filter((id) => known.has(id));
  const addTo = usable(changes.add?.categoryIds);
  const takeFrom = usable(changes.remove?.categoryIds);
  const adding = new Set(changes.add?.productIds ?? []);
  const taking = new Set(changes.remove?.productIds ?? []);

  const plan: CategoryPlan = { create: [], remove: [], added: 0, removed: 0, alreadyIn: 0, notIn: 0, outOfStock: [], uncustomised: [] };

  for (const piece of pieces) {
    const before = new Set(piece.categoryIds);
    const gains = adding.has(piece.id) ? addTo.filter((id) => !before.has(id)) : [];
    const loses = taking.has(piece.id) ? takeFrom.filter((id) => before.has(id)) : [];

    plan.create.push(...gains.map((categoryId) => ({ productId: piece.id, categoryId })));
    plan.remove.push(...loses.map((categoryId) => ({ productId: piece.id, categoryId })));

    if (adding.has(piece.id)) {
      if (gains.length > 0) plan.added += 1;
      else plan.alreadyIn += 1;
    }
    if (taking.has(piece.id)) {
      if (loses.length > 0) plan.removed += 1;
      else plan.notIn += 1;
    }

    if (piece.status !== "ACTIVE") continue;

    const after = [...piece.categoryIds.filter((id) => !loses.includes(id)), ...gains];
    if (sellable(piece, piece.categoryIds, categories) && !sellable(piece, after, categories)) plan.outOfStock.push(piece.name);
    if (piece.customised && customisationGroup(piece.categoryIds, categories) && !customisationGroup(after, categories)) {
      plan.uncustomised.push(piece.name);
    }
  }

  return plan;
}

const products = (count: number) => `${count} ${count === 1 ? "product" : "products"}`;

/** "A", "A and B", "A, B and C". */
function listOf(names: readonly string[]): string {
  return names.length < 2 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** What to tell whoever made the change: what was done, then anything it did to how pieces sell. */
export function categoryChangeNotice(plan: CategoryPlan, categories: readonly AssignableCategory[], changes: CategoryChanges): string[] {
  const paths = categoryPaths(categories);
  const placesOf = (change: CategoryChange | undefined) => [...new Set(change?.categoryIds ?? [])].flatMap((id) => paths.get(id) ?? []);
  const addTo = placesOf(changes.add);
  const takeFrom = placesOf(changes.remove);
  const itOrThem = (places: readonly string[]) => (places.length === 1 ? "it" : "them");
  const wasOrWere = (count: number) => (count === 1 ? "was" : "were");

  let done: string;
  if (plan.added > 0 && plan.removed > 0) {
    done = `Added ${products(plan.added)} to ${listOf(addTo)} and took ${plan.removed} out.`;
  } else if (plan.added > 0) {
    const already = plan.alreadyIn > 0 ? ` ${plan.alreadyIn} ${wasOrWere(plan.alreadyIn)} in ${itOrThem(addTo)} already.` : "";
    done = `Added ${products(plan.added)} to ${listOf(addTo)}.${already}`;
  } else if (plan.removed > 0) {
    const notIn = plan.notIn > 0 ? ` ${plan.notIn} ${wasOrWere(plan.notIn)} not in ${itOrThem(takeFrom)}.` : "";
    done = `Took ${products(plan.removed)} out of ${listOf(takeFrom)}.${notIn}`;
  } else if (plan.alreadyIn > 0) {
    done = `Nothing changed: ${plan.alreadyIn === 1 ? "it was" : "they were"} in ${listOf(addTo)} already.`;
  } else {
    done = `Nothing changed: ${plan.notIn === 1 ? "it was" : "they were"} not in ${listOf(takeFrom)}.`;
  }

  const said = [done];
  if (plan.outOfStock.length > 0) {
    said.push(
      `Out of stock on the shop now: ${listOf(plan.outOfStock)}. Moving a piece in or out of clothing changes how it is sold, so set its stock on its Details tab.`,
    );
  }
  if (plan.uncustomised.length > 0) {
    said.push(
      `Options no longer offered: ${listOf(plan.uncustomised)}. Only cards and bookmarks can have them; they are kept for if a piece goes back.`,
    );
  }
  return said;
}
