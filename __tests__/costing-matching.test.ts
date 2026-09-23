import {
  CONFIDENT_DISTANCE,
  confidentProductFor,
  hammingDistance,
  nameAffinity,
  rankEntriesFor,
} from "@/lib/costing/matching";

describe("hammingDistance", () => {
  it("is nothing between a photo and itself", () => {
    expect(hammingDistance("c3a1f0e0d0c0b0a0", "c3a1f0e0d0c0b0a0")).toBe(0);
  });

  it("counts the bits two photos' hashes differ in", () => {
    expect(hammingDistance("0000000000000000", "000000000000000f")).toBe(4);
    expect(hammingDistance("0000000000000000", "ffffffffffffffff")).toBe(64);
  });
});

describe("nameAffinity", () => {
  it("counts the words a product and a sheet row's filename share", () => {
    expect(nameAffinity("Handmade Organic Cabled Cardigan - Ammonite", "ammonite_organic_cabled cardigan.jpg")).toBe(4);
  });

  it("ignores words every product has, which say nothing about which one", () => {
    // Every card is handmade and a card; matching on that would match them all.
    expect(nameAffinity("Handmade Birthday Card", "handmade_card.jpg")).toBe(0);
  });

  it("is nothing for a sheet row with no words at all", () => {
    expect(nameAffinity("Bud Vase", "")).toBe(0);
  });
});

const product = (id: string, ...photoHashes: string[]) => ({ id, name: id, photoHashes });

describe("confidentProductFor", () => {
  const snail = "ff00ff00ff00ff00";
  const cake = "00ff00ff00ff00ff";

  it("attaches a sheet row to the product whose photo it is", () => {
    const entry = { photoHash: snail };

    expect(confidentProductFor(entry, [product("snail", snail), product("cake", cake)])).toBe("snail");
  });

  it("allows for a photo saved again at a different size", () => {
    const resaved = "ff00ff00ff00ff0f"; // four bits out
    expect(hammingDistance(resaved, snail)).toBeLessThanOrEqual(CONFIDENT_DISTANCE);

    expect(confidentProductFor({ photoHash: resaved }, [product("snail", snail), product("cake", cake)])).toBe("snail");
  });

  it("will not choose between two products photographed identically", () => {
    // Colourways shot on the same background can hash alike. Guessing would
    // put one's costs on the other, silently.
    expect(confidentProductFor({ photoHash: snail }, [product("red", snail), product("blue", snail)])).toBeNull();
  });

  it("leaves a photo that is only somewhat like one of ours for a person to place", () => {
    // Sixteen bits out: well past a re-save, and in the range where her grey
    // zone was wrong two times in three.
    const somewhatLike = "ff00ff00ff0000ff";
    expect(hammingDistance(somewhatLike, snail)).toBe(16);

    expect(confidentProductFor({ photoHash: somewhatLike }, [product("snail", snail), product("cake", cake)])).toBeNull();
  });

  it("does not guess for a row with no photo", () => {
    expect(confidentProductFor({ photoHash: null }, [product("snail", snail)])).toBeNull();
  });
});

describe("rankEntriesFor", () => {
  const cardigan = { id: "p1", name: "Handmade Organic Cabled Cardigan - Ammonite", photoHashes: ["ff00ff00ff00ff00"] };

  const entry = (id: string, photoHash: string | null, filename: string | null) => ({
    id,
    photoHash,
    filename,
    note: null,
  });

  it("puts the row with this product's own photo first", () => {
    const ranked = rankEntriesFor(cardigan, [
      entry("other", "00ff00ff00ff00ff", "hat.jpg"),
      entry("mine", "ff00ff00ff00ff00", "whatever.jpg"),
    ]);

    expect(ranked[0].id).toBe("mine");
  });

  it("puts a row named like this product ahead of one that is not, when the photos do not help", () => {
    const ranked = rankEntriesFor(cardigan, [
      entry("hat", "00ff00ff00ff00ff", "scree_merino_hat.jpg"),
      entry("cabled", "00ff00ff00ff00ff", "ammonite_organic_cabled cardigan.jpg"),
    ]);

    expect(ranked[0].id).toBe("cabled");
  });

  it("still ranks rows that have no photo, by their words", () => {
    const ranked = rankEntriesFor(cardigan, [entry("words", null, "cabled_cardigan.jpg"), entry("none", null, null)]);

    expect(ranked[0].id).toBe("words");
  });

  it("offers a handful rather than every row there is", () => {
    const many = Array.from({ length: 40 }, (_, i) => entry(`e${i}`, null, null));

    expect(rankEntriesFor(cardigan, many)).toHaveLength(8);
  });

  it("ranks every row when asked, for choosing from all of them best guess first", () => {
    const many = Array.from({ length: 40 }, (_, i) => entry(`e${i}`, null, null));

    expect(rankEntriesFor(cardigan, many, { limit: Infinity })).toHaveLength(40);
  });
});
