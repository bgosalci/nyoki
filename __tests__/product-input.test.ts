import { validateProductInput } from "@/lib/products/validate";

function form(overrides: Record<string, string> = {}): FormData {
  const data = new FormData();
  const base: Record<string, string> = {
    name: "Hand-thrown Mug",
    price: "24.00",
    stock: "3",
    status: "DRAFT",
    ...overrides,
  };

  for (const [key, value] of Object.entries(base)) {
    if (value !== "") data.set(key, value);
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
      pricePence: 2400,
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

  it("requires a price", () => {
    const result = validateProductInput(form({ price: "" }));

    expect(!result.ok && result.errors.price).toMatch(/price/i);
  });

  it("rejects an unparseable price", () => {
    const result = validateProductInput(form({ price: "twenty quid" }));

    expect(!result.ok && result.errors.price).toBeTruthy();
  });

  it("rejects a sub-penny price rather than rounding it", () => {
    const result = validateProductInput(form({ price: "24.999" }));

    expect(!result.ok && result.errors.price).toBeTruthy();
  });

  it("accepts an optional compare-at price above the price", () => {
    const result = validateProductInput(
      form({ price: "24.00", compareAtPrice: "30.00" }),
    );

    expect(result.ok && result.data.compareAtPence).toBe(3000);
  });

  it("rejects a compare-at price at or below the price", () => {
    // A struck-through price that is lower than what you pay reads as an
    // increase, and at best looks like a mistake.
    const result = validateProductInput(
      form({ price: "24.00", compareAtPrice: "20.00" }),
    );

    expect(!result.ok && result.errors.compareAtPrice).toBeTruthy();
  });

  it("leaves compare-at unset when blank", () => {
    const result = validateProductInput(form());

    expect(result.ok && result.data.compareAtPence).toBeNull();
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

  it("reports every problem at once rather than one at a time", () => {
    const result = validateProductInput(
      form({ name: "", price: "nope", stock: "-2" }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors).sort()).toEqual(["name", "price", "stock"]);
  });
});
