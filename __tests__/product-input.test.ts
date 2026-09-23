import { validateProductInput } from "@/lib/products/validate";

function form(overrides: Record<string, string | string[]> = {}): FormData {
  const data = new FormData();
  const base: Record<string, string | string[]> = {
    name: "Hand-thrown Mug",
    stock: "3",
    status: "DRAFT",
    ...overrides,
  };

  for (const [key, value] of Object.entries(base)) {
    if (Array.isArray(value)) value.forEach((v) => data.append(key, v));
    else if (value !== "") data.set(key, value);
  }

  return data;
}

describe("validateProductInput", () => {
  it("accepts a minimal product", () => {
    const result = validateProductInput(form());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toMatchObject({
      name: "Hand-thrown Mug",
      stock: 3,
      status: "DRAFT",
    });
  });

  it("derives a slug from the name when none is given", () => {
    const result = validateProductInput(form());

    expect(result.ok && result.data.slug).toBe("hand-thrown-mug");
  });

  it("prefers an explicitly given slug", () => {
    const result = validateProductInput(form({ slug: "Special Mug" }));

    expect(result.ok && result.data.slug).toBe("special-mug");
  });

  it("requires a name", () => {
    const result = validateProductInput(form({ name: "" }));

    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors.name).toMatch(/name/i);
  });

  it("rejects a name that is only punctuation, since no slug survives it", () => {
    const result = validateProductInput(form({ name: "!!!" }));

    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors.name).toBeTruthy();
  });

  it("has nothing to say about price, which is set on the pricing page", () => {
    const result = validateProductInput(form());

    expect(result.ok && "pricePence" in result.data).toBe(false);
    expect(result.ok && "compareAtPence" in result.data).toBe(false);
  });

  it("ignores a price posted to it anyway", () => {
    // The price box is gone from the form, but a request can still carry one.
    // It must not reach the product: the pricing page is the only way in.
    const result = validateProductInput(form({ price: "0.01", compareAtPrice: "999.00" }));

    expect(result.ok).toBe(true);
    expect(result.ok && JSON.stringify(result.data)).not.toMatch(/0\.01|999|pricePence|compareAtPence/);
  });

  it("rejects negative stock", () => {
    const result = validateProductInput(form({ stock: "-1" }));

    expect(!result.ok && result.errors.stock).toBeTruthy();
  });

  it("rejects fractional stock", () => {
    const result = validateProductInput(form({ stock: "1.5" }));

    expect(!result.ok && result.errors.stock).toBeTruthy();
  });

  it("defaults stock to zero when blank", () => {
    const result = validateProductInput(form({ stock: "" }));

    expect(result.ok && result.data.stock).toBe(0);
  });

  it("rejects an unknown status", () => {
    const result = validateProductInput(form({ status: "LIVE" }));

    expect(!result.ok && result.errors.status).toBeTruthy();
  });

  it("requires a lead time for a made-to-order product", () => {
    const result = validateProductInput(form({ madeToOrder: "on" }));

    expect(!result.ok && result.errors.leadTimeDays).toMatch(/lead time/i);
  });

  it("accepts a made-to-order product with a lead time", () => {
    const result = validateProductInput(
      form({ madeToOrder: "on", leadTimeDays: "14" }),
    );

    expect(result.ok && result.data.madeToOrder).toBe(true);
    expect(result.ok && result.data.leadTimeDays).toBe(14);
  });

  it("forces stock to one for a one-of-a-kind piece", () => {
    const result = validateProductInput(
      form({ oneOfAKind: "on", stock: "5" }),
    );

    expect(result.ok && result.data.stock).toBe(1);
  });

  it("trims free text and drops blanks", () => {
    const result = validateProductInput(
      form({ materials: "  Stoneware  ", dimensions: "   " }),
    );

    expect(result.ok && result.data.materials).toBe("Stoneware");
    expect(result.ok && result.data.dimensions).toBeNull();
  });

  it("has no categories unless some are ticked", () => {
    const result = validateProductInput(form());

    expect(result.ok && result.data.categoryIds).toEqual([]);
  });

  it("keeps the ticked categories, without duplicates", () => {
    const result = validateProductInput(form({ categoryIds: ["cat_a", "cat_b", "cat_a"] }));

    expect(result.ok && result.data.categoryIds).toEqual(["cat_a", "cat_b"]);
  });

  it("reports every problem at once rather than one at a time", () => {
    const result = validateProductInput(
      form({ name: "", weightGrams: "heavy", stock: "-2" }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors).sort()).toEqual(["name", "stock", "weightGrams"]);
  });
});
