export type TopNavSection = "shop" | "about" | null;

/**
 * Which of the header's top-row links is the current one.
 *
 * A product page counts as Shop: looking at a piece is part of shopping, and
 * leaving the section unmarked there would make the header flicker as you move
 * between a department and its products.
 */
export function topNavCurrent(pathname: string): TopNavSection {
  if (pathname === "/shop" || pathname.startsWith("/shop/")) return "shop";
  if (pathname === "/product" || pathname.startsWith("/product/")) return "shop";
  if (pathname === "/about" || pathname.startsWith("/about/")) return "about";
  return null;
}
