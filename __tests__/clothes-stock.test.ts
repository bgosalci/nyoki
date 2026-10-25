import { inStock, soldOut, toClothingOffer, type ClothingSource } from "@/lib/clothes/stock";

const dress = (overrides: Partial<ClothingSource> = {}) =>
  toClothingOffer({
    colours: ["Lupin", "Gypsum"],
    sizes: ["3-4 years", "4-5 years"],
    madeToOrder: false,
    variants: [
      { colour: "Lupin", size: "3-4 years", stock: 2 },
      { colour: "Lupin", size: "4-5 years", stock: 0 },
      { colour: "Gypsum", size: "3-4 years", stock: 0 },
      { colour: "Gypsum", size: "4-5 years", stock: 0 },
    ],
    ...overrides,
  })!;

describe("toClothingOffer", () => {
  it("offers nothing to choose for a piece with no colours and no sizes", () => {
    expect(toClothingOffer({ colours: [], sizes: [], madeToOrder: false, variants: [] })).toBeNull();
  });

  it("keeps the colours and sizes in the order they were set", () => {
    expect(dress()).toMatchObject({ colours: ["Lupin", "Gypsum"], sizes: ["3-4 years", "4-5 years"] });
  });

  it("leaves out stock for a colour or size the piece no longer has", () => {
    const offer = toClothingOffer({
      colours: ["Lupin"],
      sizes: [],
      madeToOrder: false,
      variants: [
        { colour: "Lupin", size: null, stock: 1 },
        { colour: "Gone", size: null, stock: 5 },
        { colour: "Lupin", size: "Old", stock: 4 },
      ],
    })!;

    expect(offer.stock).toEqual([{ colour: "Lupin", size: null, stock: 1 }]);
  });
});

describe("inStock", () => {
  it("has a colour in stock while any of its sizes is", () => {
    expect(inStock(dress(), "Lupin", null)).toBe(true);
    expect(inStock(dress(), "Gypsum", null)).toBe(false);
  });

  it("has a size in stock while it is in stock in any colour", () => {
    expect(inStock(dress(), null, "3-4 years")).toBe(true);
    expect(inStock(dress(), null, "4-5 years")).toBe(false);
  });

  it("answers for one colour in one size once both are chosen", () => {
    expect(inStock(dress(), "Lupin", "3-4 years")).toBe(true);
    expect(inStock(dress(), "Lupin", "4-5 years")).toBe(false);
  });

  it("counts a combination never given any stock as out of stock", () => {
    const offer = dress({ variants: [{ colour: "Lupin", size: "3-4 years", stock: 2 }] });

    expect(inStock(offer, "Gypsum", "3-4 years")).toBe(false);
  });

  it("works for a piece in sizes only, or in colours only", () => {
    const sized = toClothingOffer({
      colours: [],
      sizes: ["S", "M"],
      madeToOrder: false,
      variants: [
        { colour: null, size: "S", stock: 1 },
        { colour: null, size: "M", stock: 0 },
      ],
    })!;
    expect(inStock(sized, null, "S")).toBe(true);
    expect(inStock(sized, null, "M")).toBe(false);

    const coloured = toClothingOffer({ colours: ["Red"], sizes: [], madeToOrder: false, variants: [{ colour: "Red", size: null, stock: 3 }] })!;
    expect(inStock(coloured, "Red", null)).toBe(true);
  });

  it("never has a made-to-order piece out of stock, since it is not held in stock", () => {
    const offer = dress({ madeToOrder: true });

    expect(inStock(offer, "Gypsum", "4-5 years")).toBe(true);
    expect(soldOut(offer)).toBe(false);
  });
});

describe("soldOut", () => {
  it("is sold out only when nothing at all is in stock", () => {
    expect(soldOut(dress())).toBe(false);
    expect(soldOut(dress({ variants: [] }))).toBe(true);
  });
});
