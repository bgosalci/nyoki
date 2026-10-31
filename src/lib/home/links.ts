/**
 * Where something on the home page leads: a tile, the button.
 *
 * A category is kept by its id rather than its address, so renaming a
 * category's web address cannot break the home page; its address is looked
 * up afresh every time the page is drawn. Anything else is an address of its
 * own - one of the shop's pages, or another website.
 */

export type HomeLink = { kind: "category"; categoryId: string } | { kind: "address"; href: string };

/** The shop's pages, offered by name rather than by address. */
export const SHOP_PAGES = [
  { href: "/shop", label: "The whole shop" },
  { href: "/about", label: "About us" },
  { href: "/contact", label: "Contact" },
] as const;

/** Where a link goes when what it pointed at has gone. */
export const WHOLE_SHOP: HomeLink = { kind: "address", href: "/shop" };

const ADDRESS_MAX = 500;

/**
 * What is wrong with an address typed in, or null when it can be linked to.
 *
 * Only two kinds: a page on the shop, starting with a single slash, and
 * another website over https. "//" and "/\" are refused, since a browser
 * reads both as another website; so is every other scheme - javascript:
 * above all, which would run on the shop's own page.
 */
export function addressProblem(address: string): string | null {
  if (address.length === 0) return "Give the address it leads to.";
  if (address.length > ADDRESS_MAX) return `Keep the address under ${ADDRESS_MAX} characters.`;
  if (/\s/.test(address)) return "An address has no spaces in it.";

  if (address.startsWith("/")) {
    return /^\/[/\\]/.test(address) ? "Start a page on the shop with a single /." : null;
  }

  if (address.startsWith("https://")) {
    try {
      new URL(address);
      return null;
    } catch {
      return "That is not a whole web address.";
    }
  }

  return "Start it with / for a page on the shop, or https:// for another website.";
}

/** The chooser's value for a link: a category, a page, or somewhere else. */
export function linkChoice(link: HomeLink): string {
  if (link.kind === "category") return `category:${link.categoryId}`;
  return SHOP_PAGES.some((page) => page.href === link.href) ? `page:${link.href}` : "other";
}

export type LinkReading = { ok: true; link: HomeLink } | { ok: false; error: string };

/** The link a chooser's value means, with the address typed beside it for somewhere else. */
export function readLink(choice: string, address: string): LinkReading {
  if (choice.startsWith("category:") && choice.length > "category:".length) {
    return { ok: true, link: { kind: "category", categoryId: choice.slice("category:".length) } };
  }

  if (choice.startsWith("page:")) {
    const href = choice.slice("page:".length);
    return SHOP_PAGES.some((page) => page.href === href)
      ? { ok: true, link: { kind: "address", href } }
      : { ok: false, error: "Choose where it leads." };
  }

  if (choice === "other") {
    const typed = address.trim();
    const problem = addressProblem(typed);
    return problem ? { ok: false, error: problem } : { ok: true, link: { kind: "address", href: typed } };
  }

  return { ok: false, error: "Choose where it leads." };
}

export interface LinkRow {
  categoryId: string | null;
  href: string | null;
}

export function linkToRow(link: HomeLink): LinkRow {
  return link.kind === "category" ? { categoryId: link.categoryId, href: null } : { categoryId: null, href: link.href };
}

/** A stored link. A category deleted since leaves neither half, and leads to the whole shop. */
export function linkFromRow(row: LinkRow): HomeLink {
  if (row.categoryId) return { kind: "category", categoryId: row.categoryId };
  return row.href ? { kind: "address", href: row.href } : WHOLE_SHOP;
}

/** The address a link goes to now, a category's by its slug as it stands. */
export function hrefFor(link: HomeLink, categorySlugs: ReadonlyMap<string, string>): string {
  if (link.kind === "address") return link.href;
  const slug = categorySlugs.get(link.categoryId);
  return slug ? `/shop/${slug}` : "/shop";
}
