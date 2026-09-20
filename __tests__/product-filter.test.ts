import { parseProductFilter, productWhere } from "@/lib/products/filter";

describe("parseProductFilter", () => {
  it("reads a search term and a status from the query string", () => {
    expect(parseProductFilter({ q: "mug", status: "ACTIVE" })).toEqual({ q: "mug", status: "ACTIVE" });
  });

  it("trims the search term and drops it when blank", () => {
    expect(parseProductFilter({ q: "   " })).toEqual({ q: null, status: null });
    expect(parseProductFilter({ q: " mug " })).toEqual({ q: "mug", status: null });
  });

  it("ignores an unknown status rather than filtering everything out", () => {
    expect(parseProductFilter({ status: "LIVE" })).toEqual({ q: null, status: null });
  });

  it("takes the first value when a parameter is repeated", () => {
    expect(parseProductFilter({ q: ["mug", "bowl"] })).toEqual({ q: "mug", status: null });
  });

  it("copes with nothing at all", () => {
    expect(parseProductFilter({})).toEqual({ q: null, status: null });
  });
});

describe("productWhere", () => {
  it("is empty with no filter, so the list shows everything", () => {
    expect(productWhere({ q: null, status: null })).toEqual({});
  });

  it("matches the search term against name and product code, case-insensitively", () => {
    expect(productWhere({ q: "mug", status: null })).toEqual({
      OR: [
        { name: { contains: "mug", mode: "insensitive" } },
        { sku: { contains: "mug", mode: "insensitive" } },
      ],
    });
  });

  it("narrows to a status", () => {
    expect(productWhere({ q: null, status: "DRAFT" })).toEqual({ status: "DRAFT" });
  });

  it("combines both", () => {
    expect(productWhere({ q: "mug", status: "ACTIVE" })).toMatchObject({ status: "ACTIVE", OR: expect.any(Array) });
  });
});
