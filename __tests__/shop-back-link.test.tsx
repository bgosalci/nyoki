import { render, screen } from "@testing-library/react";

import { ShopBackLink } from "@/components/shop/back-link";

describe("ShopBackLink", () => {
  it("names where it goes back to", () => {
    render(<ShopBackLink href="/shop/christmas-cards">Christmas Cards</ShopBackLink>);

    const link = screen.getByRole("link", { name: /back to christmas cards/i });
    expect(link).toHaveAttribute("href", "/shop/christmas-cards");
  });

  it("keeps the arrow away from screen readers, which already hear 'back to'", () => {
    render(<ShopBackLink href="/shop">the shop</ShopBackLink>);

    expect(screen.getByText("←")).toHaveAttribute("aria-hidden", "true");
  });

  it("reads as one sentence rather than a bare label", () => {
    render(<ShopBackLink href="/shop">the shop</ShopBackLink>);

    expect(screen.getByRole("link").textContent).toContain("Back to the shop");
  });
});
