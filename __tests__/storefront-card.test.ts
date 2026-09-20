import { toCardProduct } from "@/lib/storefront/card";

const NOW = new Date("2026-06-15T12:00:00Z");

function product(overrides: Partial<Parameters<typeof toCardProduct>[0]> = {}) {
  return {
    slug: "handmade-easter-bunny-card",
    name: "Handmade Easter Bunny Card",
    pricePence: 650,
    compareAtPence: null,
    oneOfAKind: false,
    madeToOrder: false,
    leadTimeDays: null,
    images: [{ url: "/uploads/a.jpg", alt: "Front" }],
    sales: [],
    ...overrides,
  };
}

const sale = (value: number, type: "PERCENTAGE" | "FIXED_AMOUNT" = "PERCENTAGE") => ({
  id: "s1",
  type,
  value,
  startsAt: new Date("2026-06-01T00:00:00Z"),
  endsAt: null,
  active: true,
});

describe("toCardProduct", () => {
  it("links to the product by its web address", () => {
    expect(toCardProduct(product(), NOW).href).toBe("/product/handmade-easter-bunny-card");
  });

  it("shows the plain price when nothing is discounted", () => {
    const card = toCardProduct(product(), NOW);

    expect(card.pricePence).toBe(650);
    expect(card.wasPence).toBeNull();
  });

  it("shows the sale price with the old one struck through", () => {
    const card = toCardProduct(product({ sales: [sale(20)] }), NOW);

    expect(card.pricePence).toBe(520);
    expect(card.wasPence).toBe(650);
  });

  it("badges the saving on a percentage sale", () => {
    expect(toCardProduct(product({ sales: [sale(20)] }), NOW).badges).toContainEqual({ label: "20% off", tone: "sale" });
  });

  it("badges a fixed-amount sale by its amount", () => {
    expect(toCardProduct(product({ sales: [sale(150, "FIXED_AMOUNT")] }), NOW).badges).toContainEqual({ label: "£1.50 off", tone: "sale" });
  });

  it("falls back to the was-price when there is no sale", () => {
    const card = toCardProduct(product({ compareAtPence: 800 }), NOW);

    expect(card.pricePence).toBe(650);
    expect(card.wasPence).toBe(800);
  });

  it("prefers a live sale over the was-price, since the sale is what is charged", () => {
    const card = toCardProduct(product({ compareAtPence: 800, sales: [sale(20)] }), NOW);

    expect(card.pricePence).toBe(520);
    expect(card.wasPence).toBe(650);
  });

  it("ignores a sale outside its window", () => {
    const past = { ...sale(20), endsAt: new Date("2026-06-02T00:00:00Z") };
    const card = toCardProduct(product({ sales: [past] }), NOW);

    expect(card.pricePence).toBe(650);
    expect(card.badges).toEqual([]);
  });

  it("badges a one-of-a-kind piece", () => {
    expect(toCardProduct(product({ oneOfAKind: true }), NOW).badges).toContainEqual({ label: "One of a kind", tone: "one" });
  });

  it("badges made to order with its lead time", () => {
    expect(toCardProduct(product({ madeToOrder: true, leadTimeDays: 14 }), NOW).badges).toContainEqual({ label: "Made to order · 14 days", tone: "made" });
  });

  it("badges made to order without a lead time too", () => {
    expect(toCardProduct(product({ madeToOrder: true }), NOW).badges).toContainEqual({ label: "Made to order", tone: "made" });
  });

  it("orders the badges as the theme board does: saving, then how it is made", () => {
    const card = toCardProduct(product({ sales: [sale(20)], madeToOrder: true, leadTimeDays: 14, oneOfAKind: true }), NOW);

    expect(card.badges.map((b) => b.tone)).toEqual(["sale", "made", "one"]);
  });

  it("takes the first photo, or none", () => {
    expect(toCardProduct(product(), NOW).image).toEqual({ url: "/uploads/a.jpg", alt: "Front" });
    expect(toCardProduct(product({ images: [] }), NOW).image).toBeNull();
  });
});
