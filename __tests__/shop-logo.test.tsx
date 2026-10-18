import { render, screen } from "@testing-library/react";

import { ShopLogo } from "@/components/shop/shop-logo";

describe("ShopLogo", () => {
  it("takes the visitor home", () => {
    render(<ShopLogo />);

    expect(screen.getByRole("link", { name: /nyoki handmade, home/i })).toHaveAttribute("href", "/");
  });

  it("shrinks in proportion when the row is tight, rather than squashing or pushing the page sideways", () => {
    // An image's max-width: 100% lets the header's grid squeeze its column
    // while the height holds - on a phone the logo came out a thin sliver,
    // 0.31 wide for every 1 tall instead of 1.6. Refusing to shrink at all
    // (max-w-none) pushed the page sideways below 360px instead. Contained,
    // the picture keeps its shape in whatever width the column has.
    render(<ShopLogo />);

    const logo = screen.getByRole("img", { name: "Nyoki Handmade" });
    expect(logo).toHaveClass("object-contain");
    expect(logo).not.toHaveClass("max-w-none");
  });

  it("is smaller on a phone, so it fits beside the links and icons, and full size from sm up", () => {
    render(<ShopLogo />);

    expect(screen.getByRole("img", { name: "Nyoki Handmade" })).toHaveClass("h-14", "w-auto", "sm:h-24", "md:h-30");
  });
});
