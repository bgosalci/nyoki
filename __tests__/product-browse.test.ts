import { parseProductList, stepsFor, tabSuffix } from "@/lib/products/browse";

const list = {
  href: "/admin/products?q=card",
  items: [
    { id: "p1", name: "Snowflake Card" },
    { id: "p2", name: "Stocking Card" },
    { id: "p3", name: "Bud Vase" },
  ],
};

describe("stepsFor", () => {
  it("finds the pieces either side, and where this one stands", () => {
    expect(stepsFor(list, "p2")).toEqual({
      previous: { id: "p1", name: "Snowflake Card" },
      next: { id: "p3", name: "Bud Vase" },
      position: 2,
      total: 3,
    });
  });

  it("has nothing before the first or after the last, rather than wrapping round", () => {
    expect(stepsFor(list, "p1")).toMatchObject({ previous: null, next: { id: "p2" }, position: 1 });
    expect(stepsFor(list, "p3")).toMatchObject({ previous: { id: "p2" }, next: null, position: 3 });
  });

  it("offers no steps for a piece that is not in the list", () => {
    expect(stepsFor(list, "elsewhere")).toBeNull();
    expect(stepsFor(null, "p1")).toBeNull();
  });
});

describe("parseProductList", () => {
  it("reads back what was stored", () => {
    expect(parseProductList(JSON.stringify(list))).toEqual(list);
  });

  it("gives up on anything it cannot trust, rather than stepping somewhere odd", () => {
    expect(parseProductList(null)).toBeNull();
    expect(parseProductList("not json")).toBeNull();
    expect(parseProductList(JSON.stringify({ href: "/admin/products" }))).toBeNull();
    expect(parseProductList(JSON.stringify({ ...list, items: [{ id: 3 }] }))).toBeNull();
  });

  it("only ever leads back to the products list", () => {
    expect(parseProductList(JSON.stringify({ ...list, href: "https://example.com/" }))).toBeNull();
    expect(parseProductList(JSON.stringify({ ...list, href: "/admin/settings" }))).toBeNull();
    expect(parseProductList(JSON.stringify({ ...list, href: "/admin/productsomething" }))).toBeNull();
  });
});

describe("tabSuffix", () => {
  it("keeps whichever tab is open, so stepping from a price lands on a price", () => {
    expect(tabSuffix("/admin/products/p2/price", "p2")).toBe("/price");
    expect(tabSuffix("/admin/products/p2", "p2")).toBe("");
  });
});
