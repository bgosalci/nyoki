import { render, screen } from "@testing-library/react";

import { ShopLogo } from "@/components/shop/shop-logo";

describe("ShopLogo", () => {
  it("takes the visitor home", () => {
    render(<ShopLogo />);

    expect(screen.getByRole("link", { name: /nyoki handmade, home/i })).toHaveAttribute("href", "/");
  });

  it("is never squashed into a column narrower than itself", () => {
    // An image's max-width: 100% lets the header's grid squeeze its column to
    // nothing, while the height holds - on a phone the logo came out a thin
    // sliver, 0.31 wide for every 1 tall instead of 1.6.
    render(<ShopLogo />);

    expect(screen.getByRole("img", { name: "Nyoki Handmade" })).toHaveClass("max-w-none");
  });

  it("is smaller on a phone, so it fits beside the links and icons, and full size from sm up", () => {
    render(<ShopLogo />);

    expect(screen.getByRole("img", { name: "Nyoki Handmade" })).toHaveClass("h-14", "w-auto", "sm:h-24", "md:h-30");
  });
});
