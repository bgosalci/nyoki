import { slugify, uniqueSlug } from "@/lib/slug";

describe("slugify", () => {
  it("lower-cases and hyphenates words", () => {
    expect(slugify("Hand Thrown Mug")).toBe("hand-thrown-mug");
  });

  it("keeps existing hyphens without doubling them", () => {
    expect(slugify("Hand-thrown Mug")).toBe("hand-thrown-mug");
  });

  it("strips accents rather than dropping the letter", () => {
    expect(slugify("Café Crème")).toBe("cafe-creme");
  });

  it("removes punctuation", () => {
    expect(slugify("Mug!!!")).toBe("mug");
    expect(slugify("Tom's Bowl")).toBe("toms-bowl");
  });

  it("turns separators into single hyphens", () => {
    expect(slugify("Blue / Green")).toBe("blue-green");
    expect(slugify("Salt & Pepper")).toBe("salt-pepper");
  });

  it("trims surrounding whitespace and hyphens", () => {
    expect(slugify("  Spaces  ")).toBe("spaces");
    expect(slugify("---Mug---")).toBe("mug");
  });

  it("keeps digits", () => {
    expect(slugify("Bowl 2")).toBe("bowl-2");
  });

  it("returns an empty string when nothing usable is left", () => {
    expect(slugify("!!!")).toBe("");
    expect(slugify("")).toBe("");
  });

  it("does not collapse into a leading or trailing hyphen", () => {
    expect(slugify("  -  Mug  -  ")).toBe("mug");
  });
});

describe("uniqueSlug", () => {
  it("returns the base slug when it is free", () => {
    expect(uniqueSlug("mug", [])).toBe("mug");
  });

  it("appends a counter when taken", () => {
    expect(uniqueSlug("mug", ["mug"])).toBe("mug-2");
  });

  it("skips past every taken counter", () => {
    expect(uniqueSlug("mug", ["mug", "mug-2", "mug-3"])).toBe("mug-4");
  });

  it("ignores gaps rather than filling them", () => {
    // Reusing "mug-2" after that product was deleted would resurrect an old
    // URL pointing at a different item.
    expect(uniqueSlug("mug", ["mug", "mug-3"])).toBe("mug-4");
  });

  it("is unaffected by unrelated slugs sharing a prefix", () => {
    expect(uniqueSlug("mug", ["mug-tree", "mugs"])).toBe("mug");
  });
});
