/**
 * Stepping from one product to the next without going back to the list.
 *
 * "Next" means the next row of the list that was open, filters and all - not
 * the next row of the list as it stands now. The list is sorted by what was
 * edited last, so saving a piece moves it to the top: work out "next" afresh
 * after every save and working through the list sends you back to the start.
 * So the list remembers what it showed, and the product page steps through
 * that.
 *
 * It is remembered per tab (sessionStorage), since two tabs can hold two
 * different filtered lists. A piece opened some other way - a reload, a
 * bookmark, a new tab - steps through the whole list in its usual order
 * instead, which the server sends, and that is remembered in turn so a save
 * cannot reorder it either.
 */

export interface ListedProduct {
  id: string;
  name: string;
}

export interface ProductList {
  /** The list's own address, so the way back returns to it as it was filtered. */
  href: string;
  items: ListedProduct[];
}

export interface ProductSteps {
  previous: ListedProduct | null;
  next: ListedProduct | null;
  /** Counted from one, as a person reads it. */
  position: number;
  total: number;
}

export const PRODUCT_LIST_KEY = "nyoki:product-list";

const LIST_PATH = "/admin/products";

export function stepsFor(list: ProductList | null, id: string): ProductSteps | null {
  if (!list) return null;
  const index = list.items.findIndex((item) => item.id === id);
  if (index === -1) return null;

  return {
    previous: list.items[index - 1] ?? null,
    next: list.items[index + 1] ?? null,
    position: index + 1,
    total: list.items.length,
  };
}

/** Whatever follows the product in the address - "/price" on the Price tab. */
export function tabSuffix(pathname: string, id: string): string {
  const base = `${LIST_PATH}/${id}`;
  return pathname.startsWith(base) ? pathname.slice(base.length) : "";
}

const isListHref = (href: unknown): href is string =>
  typeof href === "string" && (href === LIST_PATH || href.startsWith(`${LIST_PATH}?`));

const isListed = (item: unknown): item is ListedProduct =>
  typeof item === "object" &&
  item !== null &&
  typeof (item as ListedProduct).id === "string" &&
  typeof (item as ListedProduct).name === "string";

/**
 * Reads back a remembered list, or nothing. Storage is the browser's, not
 * ours - it can hold an old shape or anything at all - and the way back must
 * only ever lead to the products list.
 */
export function parseProductList(raw: string | null): ProductList | null {
  if (raw === null) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== "object" || value === null) return null;

  const { href, items } = value as Partial<ProductList>;
  if (!isListHref(href) || !Array.isArray(items) || !items.every(isListed)) return null;
  return { href, items: items.map(({ id, name }) => ({ id, name })) };
}

export function readProductList(): string | null {
  try {
    return window.sessionStorage.getItem(PRODUCT_LIST_KEY);
  } catch {
    // Private windows and blocked site data both throw. No steps, then.
    return null;
  }
}

const listeners = new Set<() => void>();

/** For useSyncExternalStore: told whenever a list is remembered. */
export function subscribeToProductList(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function rememberProductList(list: ProductList): void {
  try {
    window.sessionStorage.setItem(PRODUCT_LIST_KEY, JSON.stringify(list));
  } catch {
    // Not remembering costs a stable order, nothing more.
  }
  for (const listener of listeners) listener();
}
