import { render, screen } from "@testing-library/react";

import { ProductSteps } from "@/components/admin/product-steps";
import { rememberProductList } from "@/lib/products/browse";

let pathname = "/admin/products/p2";
jest.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

const list = {
  href: "/admin/products?q=card",
  items: [
    { id: "p1", name: "Snowflake Card" },
    { id: "p2", name: "Stocking Card" },
    { id: "p3", name: "Bud Vase" },
  ],
};

beforeEach(() => {
  window.sessionStorage.clear();
  pathname = "/admin/products/p2";
});

describe("ProductSteps", () => {
  it("steps to the pieces either side in the list you came from", () => {
    rememberProductList(list);
    render(<ProductSteps productId="p2" />);

    expect(screen.getByRole("link", { name: /previous: snowflake card/i })).toHaveAttribute("href", "/admin/products/p1");
    expect(screen.getByRole("link", { name: /next: bud vase/i })).toHaveAttribute("href", "/admin/products/p3");
    expect(screen.getByText("2 of 3")).toBeInTheDocument();
  });

  it("stays on the Price tab while stepping, so pieces can be priced one after another", () => {
    rememberProductList(list);
    pathname = "/admin/products/p2/price";
    render(<ProductSteps productId="p2" />);

    expect(screen.getByRole("link", { name: /previous/i })).toHaveAttribute("href", "/admin/products/p1/price");
    expect(screen.getByRole("link", { name: /next/i })).toHaveAttribute("href", "/admin/products/p3/price");
  });

  it("has nowhere to go before the first piece", () => {
    rememberProductList(list);
    pathname = "/admin/products/p1";
    render(<ProductSteps productId="p1" />);

    expect(screen.queryByRole("link", { name: /previous/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /next: stocking card/i })).toBeInTheDocument();
  });

  it("goes back to the list as it was filtered", () => {
    rememberProductList(list);
    render(<ProductSteps productId="p2" />);

    expect(screen.getByRole("link", { name: /back to all products/i })).toHaveAttribute("href", "/admin/products?q=card");
  });

  it("offers no steps for a piece not reached from the list, and goes back to the whole list", () => {
    render(<ProductSteps productId="p2" />);

    expect(screen.queryByRole("link", { name: /previous/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /next/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to all products/i })).toHaveAttribute("href", "/admin/products");
  });

  it("goes back to the whole list when this piece is not in the one remembered", () => {
    rememberProductList(list);
    render(<ProductSteps productId="elsewhere" />);

    expect(screen.getByRole("link", { name: /back to all products/i })).toHaveAttribute("href", "/admin/products");
  });
});
