import { parseProductFilter, productWhere } from "@/lib/products/filter";

describe("parseProductFilter", () => {
  it("reads a search term and a status from the query string", () => {
    expect(parseProductFilter({ q: "mug", status: "ACTIVE", category: "cards" })).toEqual({ q: "mug", status: "ACTIVE", category: "cards" });
  });

  it("trims the search term and drops it when blank", () => {
    expect(parseProductFilter({ q: "   " })).toEqual({ q: null, status: null, category: null });
    expect(parseProductFilter({ q: " mug " })).toEqual({ q: "mug", status: null, category: null });
  });

  it("ignores an unknown status rather than filtering everything out", () => {
    expect(parseProductFilter({ status: "LIVE" })).toEqual({ q: null, status: null, category: null });
  });

  it("takes the first value when a parameter is repeated", () => {
    expect(parseProductFilter({ q: ["mug", "bowl"] })).toEqual({ q: "mug", status: null, category: null });
  });

  it("copes with nothing at all", () => {
    expect(parseProductFilter({})).toEqual({ q: null, status: null, category: null });
  });
});

describe("productWhere", () => {
  it("narrows to products in any of the resolved categories", () => {
    expect(productWhere({ q: null, status: null, category: "cards" }, ["c1", "c2"])).toEqual({
      categories: { some: { categoryId: { in: ["c1", "c2"] } } },
    });
  });

  it("ignores a category that resolved to nothing rather than hiding everything", () => {
    expect(productWhere({ q: null, status: null, category: "no-such" }, [])).toEqual({});
  });

  it("is empty with no filter, so the list shows everything", () => {
    expect(productWhere({ q: null, status: null, category: null })).toEqual({});
  });

  it("matches the search term against name and product code, case-insensitively", () => {
    expect(productWhere({ q: "mug", status: null, category: null })).toEqual({
      OR: [
        { name: { contains: "mug", mode: "insensitive" } },
        { sku: { contains: "mug", mode: "insensitive" } },
      ],
    });
  });

  it("narrows to a status", () => {
    expect(productWhere({ q: null, status: "DRAFT", category: null })).toEqual({ status: "DRAFT" });
  });

  it("combines both", () => {
    expect(productWhere({ q: "mug", status: "ACTIVE", category: null })).toMatchObject({ status: "ACTIVE", OR: expect.any(Array) });
  });
});
