import { act, render, screen } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";

import { ProductSteps } from "@/components/admin/product-steps";
import { parseProductList, PRODUCT_LIST_KEY, rememberProductList } from "@/lib/products/browse";

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

/** The whole list in its usual order, which the server sends with every product. */
const everything = {
  href: "/admin/products",
  items: [
    { id: "p4", name: "Christmas Stars" },
    { id: "p2", name: "Stocking Card" },
    { id: "p5", name: "Baby Girl Card" },
    { id: "p1", name: "Snowflake Card" },
    { id: "p3", name: "Bud Vase" },
  ],
};

const remembered = () => parseProductList(window.sessionStorage.getItem(PRODUCT_LIST_KEY));

beforeEach(() => {
  window.sessionStorage.clear();
  pathname = "/admin/products/p2";
});

describe("ProductSteps", () => {
  it("steps to the pieces either side in the list you came from", () => {
    rememberProductList(list);
    render(<ProductSteps productId="p2" fallback={everything} />);

    expect(screen.getByRole("link", { name: /previous: snowflake card/i })).toHaveAttribute("href", "/admin/products/p1");
    expect(screen.getByRole("link", { name: /next: bud vase/i })).toHaveAttribute("href", "/admin/products/p3");
    expect(screen.getByText("2 of 3")).toBeInTheDocument();
  });

  it("stays on the Price tab while stepping, so pieces can be priced one after another", () => {
    rememberProductList(list);
    pathname = "/admin/products/p2/price";
    render(<ProductSteps productId="p2" fallback={everything} />);

    expect(screen.getByRole("link", { name: /previous/i })).toHaveAttribute("href", "/admin/products/p1/price");
    expect(screen.getByRole("link", { name: /next/i })).toHaveAttribute("href", "/admin/products/p3/price");
  });

  it("has nowhere to go before the first piece", () => {
    rememberProductList(list);
    pathname = "/admin/products/p1";
    render(<ProductSteps productId="p1" fallback={everything} />);

    expect(screen.queryByRole("link", { name: /previous/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /next: stocking card/i })).toBeInTheDocument();
  });

  it("goes back to the list as it was filtered", () => {
    rememberProductList(list);
    render(<ProductSteps productId="p2" fallback={everything} />);

    expect(screen.getByRole("link", { name: /back to all products/i })).toHaveAttribute("href", "/admin/products?q=card");
  });

  it("steps through the whole list in its usual order when the piece was opened some other way", () => {
    // A reload, a bookmark, a new tab: nothing remembered, and still the steps.
    render(<ProductSteps productId="p2" fallback={everything} />);

    expect(screen.getByRole("link", { name: /previous: christmas stars/i })).toHaveAttribute("href", "/admin/products/p4");
    expect(screen.getByRole("link", { name: /next: baby girl card/i })).toHaveAttribute("href", "/admin/products/p5");
    expect(screen.getByText("2 of 5")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to all products/i })).toHaveAttribute("href", "/admin/products");
  });

  it("uses the whole list when this piece is not in the one remembered", () => {
    rememberProductList(list);
    render(<ProductSteps productId="p5" fallback={everything} />);

    expect(screen.getByRole("link", { name: /previous: stocking card/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to all products/i })).toHaveAttribute("href", "/admin/products");
  });

  it("keeps the order it started with, though saving a piece moves it to the top of the list", () => {
    const { rerender } = render(<ProductSteps productId="p2" fallback={everything} />);

    // Saved: the server now sends p2 first. Stepping must not follow it there.
    const afterSave = { ...everything, items: [everything.items[1], everything.items[0], ...everything.items.slice(2)] };
    rerender(<ProductSteps productId="p2" fallback={afterSave} />);

    expect(screen.getByRole("link", { name: /previous: christmas stars/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /next: baby girl card/i })).toBeInTheDocument();
    expect(remembered()?.items.map((item) => item.id)).toEqual(["p4", "p2", "p5", "p1", "p3"]);
  });

  it("offers no steps for a piece in neither list", () => {
    render(<ProductSteps productId="gone" fallback={everything} />);

    expect(screen.queryByRole("link", { name: /previous/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /next/i })).not.toBeInTheDocument();
  });

  it("switches to the list you came from once the page has loaded, without forgetting it", async () => {
    // The server cannot see this tab's list, so the page arrives stepping
    // through everything; once it wakes up, the filtered list takes over.
    rememberProductList(list);
    const container = document.createElement("div");
    document.body.appendChild(container);
    const element = <ProductSteps productId="p2" fallback={everything} />;

    const stored = window.sessionStorage.getItem(PRODUCT_LIST_KEY);
    window.sessionStorage.clear();
    container.innerHTML = renderToString(element);
    window.sessionStorage.setItem(PRODUCT_LIST_KEY, stored ?? "");
    expect(container).toHaveTextContent("2 of 5");

    await act(async () => {
      hydrateRoot(container, element);
    });

    expect(container).toHaveTextContent("2 of 3");
    expect(remembered()?.href).toBe("/admin/products?q=card");
    container.remove();
  });
});
