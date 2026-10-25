import { axesFromOptions, axesOf, planVariants, variantLabel } from "@/lib/clothes/variants";

/** A colour in a size as the form sends it, with the names it was saved under. */
const combo = (colour: string | null, size: string | null, stock: number, colourWas = colour, sizeWas = size) => ({
  colour,
  size,
  stock,
  colourWas,
  sizeWas,
});

const stored = [
  { id: "v1", colour: "Lupin", size: "S" },
  { id: "v2", colour: "Lupin", size: "M" },
];

describe("planVariants", () => {
  it("keeps each variant's row when only its stock changes, so its code stays with it", () => {
    expect(planVariants(stored, [combo("Lupin", "S", 4), combo("Lupin", "M", 0)])).toEqual({
      update: [
        { id: "v1", colour: "Lupin", size: "S", name: "Lupin / S", stock: 4, position: 0 },
        { id: "v2", colour: "Lupin", size: "M", name: "Lupin / M", stock: 0, position: 1 },
      ],
      create: [],
      remove: [],
    });
  });

  it("keeps the rows of a renamed colour or size", () => {
    const plan = planVariants(stored, [combo("Sage", "S", 1, "Lupin", "S"), combo("Sage", "Medium", 2, "Lupin", "M")]);

    expect(plan.update.map(({ id, colour, size }) => [id, colour, size])).toEqual([
      ["v1", "Sage", "S"],
      ["v2", "Sage", "Medium"],
    ]);
    expect(plan.create).toEqual([]);
  });

  it("gives a sized piece's rows to the first colour added to it, and new rows to the rest", () => {
    const plan = planVariants([{ id: "v1", colour: null, size: "S" }], [combo("Red", "S", 3, null, "S"), combo("Blue", "S", 1, null, "S")]);

    expect(plan.update).toEqual([{ id: "v1", colour: "Red", size: "S", name: "Red / S", stock: 3, position: 0 }]);
    expect(plan.create).toEqual([{ colour: "Blue", size: "S", name: "Blue / S", stock: 1, position: 1 }]);
  });

  it("takes away the rows of a size taken off", () => {
    expect(planVariants(stored, [combo("Lupin", "S", 1)]).remove).toEqual(["v2"]);
  });

  it("finds the rows again of a colour removed and added back under the same name", () => {
    const plan = planVariants(stored, [combo("Lupin", "S", 1, null, "S"), combo("Lupin", "M", 1, null, "M")]);

    expect(plan.update.map((row) => row.id)).toEqual(["v1", "v2"]);
  });

  it("lets a renamed colour keep its rows ahead of a new colour given its old name", () => {
    const plan = planVariants([{ id: "v1", colour: "Red", size: null }], [combo("Red", null, 1, null, null), combo("Crimson", null, 2, "Red", null)]);

    expect(plan.update).toEqual([{ id: "v1", colour: "Crimson", size: null, name: "Crimson", stock: 2, position: 1 }]);
    expect(plan.create).toEqual([{ colour: "Red", size: null, name: "Red", stock: 1, position: 0 }]);
  });

  it("takes every row away from a piece left with no colours or sizes", () => {
    expect(planVariants(stored, [])).toEqual({ update: [], create: [], remove: ["v1", "v2"] });
  });
});

describe("variantLabel", () => {
  it("names a variant by its colour and size, or whichever it has", () => {
    expect(variantLabel("Lupin", "3-4 years")).toBe("Lupin / 3-4 years");
    expect(variantLabel("Lupin", null)).toBe("Lupin");
    expect(variantLabel(null, "3-4 years")).toBe("3-4 years");
  });
});

describe("reading Shopify's options", () => {
  it("finds the colour, spelt either way, and the size, and nothing else", () => {
    expect(axesFromOptions({ Size: "3-4 years", Color: "tuberose" })).toEqual({ colour: "tuberose", size: "3-4 years" });
    expect(axesFromOptions({ Colour: " lupin ", Inventory: "0" })).toEqual({ colour: "lupin", size: null });
    expect(axesFromOptions({})).toEqual({ colour: null, size: null });
  });

  it("lists each colour and size once, in the order the variants came", () => {
    expect(
      axesOf([
        { colour: "Red", size: "S" },
        { colour: "Red", size: "M" },
        { colour: "Blue", size: "S" },
      ]),
    ).toEqual({ colours: ["Red", "Blue"], sizes: ["S", "M"] });
    expect(axesOf([{ colour: null, size: "S" }])).toEqual({ colours: [], sizes: ["S"] });
  });
});
