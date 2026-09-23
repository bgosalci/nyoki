import { render, screen } from "@testing-library/react";

import { ProductTabs } from "@/components/admin/product-tabs";

let pathname = "/admin/products/p1";
jest.mock("next/navigation", () => ({ usePathname: () => pathname }));

describe("ProductTabs", () => {
  it("offers the product's details and its price", () => {
    render(<ProductTabs productId="p1" />);

    const tabs = screen.getByRole("navigation", { name: /product/i });
    expect(tabs).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Details" })).toHaveAttribute("href", "/admin/products/p1");
    expect(screen.getByRole("link", { name: "Price" })).toHaveAttribute("href", "/admin/products/p1/price");
  });

  it("marks the details as the tab in view on the product's own address", () => {
    pathname = "/admin/products/p1";
    render(<ProductTabs productId="p1" />);

    expect(screen.getByRole("link", { name: "Details" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Price" })).not.toHaveAttribute("aria-current");
  });

  it("marks the price as the tab in view beneath it", () => {
    pathname = "/admin/products/p1/price";
    render(<ProductTabs productId="p1" />);

    expect(screen.getByRole("link", { name: "Price" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Details" })).not.toHaveAttribute("aria-current");
  });
});
