import { usualFor, type UsualCategory } from "@/lib/delivery/usual";

const none = { usualGrams: null, usualParcelSize: null, usualThicknessMm: null };

const categories: UsualCategory[] = [
  { id: "cards", slug: "cards", name: "Cards", parentId: null, usualGrams: 40, usualParcelSize: "LARGE_LETTER", usualThicknessMm: 5 },
  { id: "christmas", slug: "christmas-cards", name: "Christmas Cards", parentId: "cards", ...none },
  { id: "wooden", slug: "wooden-cards", name: "Wooden Cards", parentId: "cards", usualGrams: 60, usualParcelSize: null, usualThicknessMm: 8 },
  { id: "accessories", slug: "accessories", name: "Accessories", parentId: null, ...none },
  { id: "hairbands", slug: "hairbands", name: "Hairbands", parentId: "accessories", ...none },
];

describe("usualFor", () => {
  it("finds the usual postage up the tree: a Christmas card goes by Cards'", () => {
    expect(usualFor(["christmas"], categories)).toEqual({ categoryId: "cards", categoryName: "Cards", grams: 40, size: "LARGE_LETTER", mm: 5 });
  });

  it("takes the nearest category that has one, whole, even with parts left blank", () => {
    expect(usualFor(["wooden"], categories)).toEqual({ categoryId: "wooden", categoryName: "Wooden Cards", grams: 60, size: null, mm: 8 });
  });

  it("is nothing where no category above the piece has one", () => {
    expect(usualFor(["hairbands"], categories)).toBeNull();
    expect(usualFor([], categories)).toBeNull();
  });

  it("looks through the piece's categories in turn", () => {
    expect(usualFor(["hairbands", "christmas"], categories)?.categoryName).toBe("Cards");
  });
});
