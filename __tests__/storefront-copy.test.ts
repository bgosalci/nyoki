import { categoryIntro, pluralise } from "@/lib/storefront/category-copy";

describe("pluralise", () => {
  it("adds an s to an ordinary name", () => {
    expect(pluralise("Birthday Card")).toBe("Birthday Cards");
    expect(pluralise("Hair Clip")).toBe("Hair Clips");
  });

  it("leaves a name that is already plural alone", () => {
    expect(pluralise("Christmas Cards")).toBe("Christmas Cards");
    expect(pluralise("Baby Boy Hat and Booties")).toBe("Baby Boy Hat and Booties");
  });

  it("adds es where a bare s would not be sayable", () => {
    expect(pluralise("Brooch")).toBe("Brooches");
    expect(pluralise("Dress")).toBe("Dresses");
    expect(pluralise("Box")).toBe("Boxes");
  });

  it("turns a consonant and y into ies, but leaves a vowel and y", () => {
    expect(pluralise("Baby")).toBe("Babies");
    expect(pluralise("Tray")).toBe("Trays");
  });
});

describe("categoryIntro", () => {
  it("uses what the shopkeeper wrote, whenever she has written something", () => {
    expect(categoryIntro({ name: "Cards", description: "Cards for the days worth marking." })).toBe(
      "Cards for the days worth marking.",
    );
  });

  it("falls back to a line built from the name rather than leaving the page bare", () => {
    expect(categoryIntro({ name: "Brooch", description: null })).toMatch(/^Brooches made by hand/);
  });

  it("keeps the name's own capitals, since plenty of them are proper nouns", () => {
    expect(categoryIntro({ name: "Christmas Cards", description: null })).toMatch(/^Christmas Cards made by hand/);
  });

  it("treats a description of nothing but space as nothing written", () => {
    expect(categoryIntro({ name: "Cards", description: "   " })).toMatch(/^Cards made by hand/);
  });
});
