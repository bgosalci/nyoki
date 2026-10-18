import { render, screen } from "@testing-library/react";

import { BuyBar } from "@/components/shop/buy-bar";

describe("BuyBar", () => {
  it("shows the price beside a way to add the piece to the basket", () => {
    render(<BuyBar pricePence={1299} wasPence={null} />);

    expect(screen.getByText("£12.99")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add to basket/i })).toBeInTheDocument();
  });

  it("shows the was-price too, when there is one", () => {
    render(<BuyBar pricePence={1299} wasPence={1599} />);

    expect(screen.getByText("£15.99").tagName).toBe("S");
    expect(screen.getByText("was")).toHaveClass("sr-only");
  });

  it("cannot be used until online ordering opens, and says so", () => {
    // Like the basket in the header: there is no basket yet.
    render(<BuyBar pricePence={1299} wasPence={null} />);

    expect(screen.getByRole("button", { name: /add to basket/i })).toBeDisabled();
    expect(screen.getByText(/ordering opens soon/i)).toBeInTheDocument();
  });

  it("is for phones only, held at the bottom of the screen as the page scrolls", () => {
    const { container } = render(<BuyBar pricePence={1299} wasPence={null} />);

    expect(container.firstChild).toHaveClass("md:hidden", "sticky", "bottom-0");
  });
});
