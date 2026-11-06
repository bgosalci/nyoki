import { categoriesMatching } from "@/lib/categories/path";
import { categoryChangeNotice, planCategoryChange, type AssignablePiece } from "@/lib/categories/assignment";

const categories = [
  { id: "cards", slug: "cards", name: "Cards", parentId: null },
  { id: "christmas", slug: "christmas-cards", name: "Christmas Cards", parentId: "cards" },
  { id: "clothes", slug: "clothes", name: "Clothes", parentId: null },
  { id: "coats", slug: "coats", name: "Coats", parentId: "clothes" },
  { id: "gifts", slug: "gifts", name: "Gifts", parentId: null },
];

const piece = (id: string, categoryIds: string[], extra: Partial<AssignablePiece> = {}): AssignablePiece => ({
  id,
  name: id,
  status: "ACTIVE",
  stock: 3,
  colours: [],
  sizes: [],
  madeToOrder: false,
  madeOnOrder: false,
  variants: [],
  customised: false,
  categoryIds,
  ...extra,
});

describe("planCategoryChange", () => {
  it("adds only what is not there already, leaving everything else a piece is in", () => {
    const plan = planCategoryChange([piece("a", ["gifts"]), piece("b", ["christmas"])], categories, {
      add: { productIds: ["a", "b"], categoryIds: ["christmas"] },
    });

    expect(plan.create).toEqual([{ productId: "a", categoryId: "christmas" }]);
    expect(plan.remove).toEqual([]);
    expect(plan.added).toBe(1);
    expect(plan.alreadyIn).toBe(1);
  });

  it("adds to several categories at once, counting pieces rather than links", () => {
    const plan = planCategoryChange([piece("a", []), piece("b", ["gifts"])], categories, {
      add: { productIds: ["a", "b"], categoryIds: ["christmas", "gifts"] },
    });

    expect(plan.create).toHaveLength(3);
    expect(plan.added).toBe(2);
    expect(plan.alreadyIn).toBe(0);
  });

  it("takes out only what is there, leaving the piece's other categories", () => {
    const plan = planCategoryChange([piece("a", ["christmas", "gifts"]), piece("b", ["gifts"])], categories, {
      remove: { productIds: ["a", "b"], categoryIds: ["christmas"] },
    });

    expect(plan.remove).toEqual([{ productId: "a", categoryId: "christmas" }]);
    expect(plan.create).toEqual([]);
    expect(plan.removed).toBe(1);
    expect(plan.notIn).toBe(1);
  });

  it("ignores a piece or a category deleted since the page was opened", () => {
    const plan = planCategoryChange([piece("a", [])], categories, {
      add: { productIds: ["a", "gone"], categoryIds: ["christmas", "gone-too"] },
    });

    expect(plan.create).toEqual([{ productId: "a", categoryId: "christmas" }]);
    expect(plan.alreadyIn).toBe(0);
  });

  it("takes repeated ids once", () => {
    const plan = planCategoryChange([piece("a", [])], categories, {
      add: { productIds: ["a", "a"], categoryIds: ["christmas", "christmas"] },
    });

    expect(plan.create).toHaveLength(1);
    expect(plan.added).toBe(1);
  });

  it("can add and take out in one go", () => {
    const plan = planCategoryChange([piece("a", []), piece("b", ["christmas"])], categories, {
      add: { productIds: ["a"], categoryIds: ["christmas"] },
      remove: { productIds: ["b"], categoryIds: ["christmas"] },
    });

    expect(plan.added).toBe(1);
    expect(plan.removed).toBe(1);
  });

  describe("what a move does to how a piece is sold", () => {
    const coat = (extra: Partial<AssignablePiece> = {}) =>
      piece("Winter Coat", ["coats"], {
        colours: ["Pink"],
        sizes: ["Small"],
        variants: [{ colour: "Pink", size: "Small", stock: 4 }],
        ...extra,
      });

    it("names a coat taken out of Clothes, whose colours then have no stock", () => {
      const plan = planCategoryChange([coat()], categories, { remove: { productIds: ["Winter Coat"], categoryIds: ["coats"] } });

      expect(plan.outOfStock).toEqual(["Winter Coat"]);
    });

    it("says nothing of a coat moved between types of Clothes", () => {
      const plan = planCategoryChange([coat({ categoryIds: ["coats", "clothes"] })], categories, {
        remove: { productIds: ["Winter Coat"], categoryIds: ["coats"] },
      });

      expect(plan.outOfStock).toEqual([]);
    });

    it("says nothing of one with a colour left in no size, which still sells", () => {
      const plan = planCategoryChange(
        [coat({ variants: [{ colour: "Pink", size: "Small", stock: 4 }, { colour: "Pink", size: null, stock: 2 }] })],
        categories,
        { remove: { productIds: ["Winter Coat"], categoryIds: ["coats"] } },
      );

      expect(plan.outOfStock).toEqual([]);
    });

    it("says nothing of one that never runs out, or that was out of stock already", () => {
      const plan = planCategoryChange(
        [
          coat({ id: "made", name: "Made", madeToOrder: true }),
          coat({ id: "empty", name: "Empty", variants: [{ colour: "Pink", size: "Small", stock: 0 }] }),
        ],
        categories,
        { remove: { productIds: ["made", "empty"], categoryIds: ["coats"] } },
      );

      expect(plan.outOfStock).toEqual([]);
    });

    it("names a piece put into Clothes with stock only in no size", () => {
      const hairband = piece("Hairband", ["gifts"], {
        colours: ["Pink"],
        sizes: ["Small"],
        variants: [{ colour: "Pink", size: null, stock: 4 }],
      });

      const plan = planCategoryChange([hairband], categories, { add: { productIds: ["Hairband"], categoryIds: ["coats"] } });

      expect(plan.outOfStock).toEqual(["Hairband"]);
    });

    it("says nothing of a piece that is not on the shop", () => {
      const plan = planCategoryChange([coat({ status: "DRAFT" })], categories, { remove: { productIds: ["Winter Coat"], categoryIds: ["coats"] } });

      expect(plan.outOfStock).toEqual([]);
    });

    it("names a card with options taken out of Cards, which stops offering them", () => {
      const plan = planCategoryChange([piece("Holly Card", ["christmas"], { customised: true })], categories, {
        remove: { productIds: ["Holly Card"], categoryIds: ["christmas"] },
      });

      expect(plan.uncustomised).toEqual(["Holly Card"]);
    });

    it("says nothing of a plain card, or one still under Cards", () => {
      const plan = planCategoryChange(
        [piece("Plain", ["christmas"]), piece("Kept", ["christmas", "cards"], { customised: true })],
        categories,
        { remove: { productIds: ["Plain", "Kept"], categoryIds: ["christmas"] } },
      );

      expect(plan.uncustomised).toEqual([]);
    });
  });
});

describe("categoryChangeNotice", () => {
  const said = (pieces: AssignablePiece[], changes: Parameters<typeof planCategoryChange>[2]) =>
    categoryChangeNotice(planCategoryChange(pieces, categories, changes), categories, changes);

  it("says how many went where, by the category's place in the tree", () => {
    expect(said([piece("a", []), piece("b", [])], { add: { productIds: ["a", "b"], categoryIds: ["christmas"] } })).toEqual([
      "Added 2 products to Cards › Christmas Cards.",
    ]);
  });

  it("uses the singular for one, and names each category", () => {
    expect(said([piece("a", [])], { add: { productIds: ["a"], categoryIds: ["christmas", "gifts"] } })).toEqual([
      "Added 1 product to Cards › Christmas Cards and Gifts.",
    ]);
  });

  it("says how many were in it already", () => {
    expect(said([piece("a", []), piece("b", ["gifts"])], { add: { productIds: ["a", "b"], categoryIds: ["gifts"] } })).toEqual([
      "Added 1 product to Gifts. 1 was in it already.",
    ]);
    expect(said([piece("a", []), piece("b", ["gifts"]), piece("c", ["gifts"])], { add: { productIds: ["a", "b", "c"], categoryIds: ["gifts"] } })).toEqual([
      "Added 1 product to Gifts. 2 were in it already.",
    ]);
  });

  it("says when there was nothing to add", () => {
    expect(said([piece("a", ["gifts"])], { add: { productIds: ["a"], categoryIds: ["gifts"] } })).toEqual(["Nothing changed: it was in Gifts already."]);
    expect(said([piece("a", ["gifts"]), piece("b", ["gifts"])], { add: { productIds: ["a", "b"], categoryIds: ["gifts"] } })).toEqual([
      "Nothing changed: they were in Gifts already.",
    ]);
  });

  it("says how many came out, and how many were not in it", () => {
    expect(said([piece("a", ["gifts"]), piece("b", [])], { remove: { productIds: ["a", "b"], categoryIds: ["gifts"] } })).toEqual([
      "Took 1 product out of Gifts. 1 was not in it.",
    ]);
  });

  it("says when there was nothing to take out", () => {
    expect(said([piece("a", [])], { remove: { productIds: ["a"], categoryIds: ["gifts"] } })).toEqual(["Nothing changed: it was not in Gifts."]);
  });

  it("says both when a category's products are changed together", () => {
    expect(
      said([piece("a", []), piece("b", []), piece("c", ["gifts"])], {
        add: { productIds: ["a", "b"], categoryIds: ["gifts"] },
        remove: { productIds: ["c"], categoryIds: ["gifts"] },
      }),
    ).toEqual(["Added 2 products to Gifts and took 1 out."]);
  });

  it("names whatever the move has put out of stock, and what to do about it", () => {
    const coat = piece("Winter Coat", ["coats"], { colours: ["Pink"], sizes: ["Small"], variants: [{ colour: "Pink", size: "Small", stock: 4 }] });

    const [, stock] = said([coat], { remove: { productIds: ["Winter Coat"], categoryIds: ["coats"] } });

    expect(stock).toMatch(/out of stock on the shop now: Winter Coat/i);
    expect(stock).toMatch(/details tab/i);
  });

  it("names whatever has stopped offering its options, and that they are kept", () => {
    const card = piece("Holly Card", ["christmas"], { customised: true });

    const [, options] = said([card], { remove: { productIds: ["Holly Card"], categoryIds: ["christmas"] } });

    expect(options).toMatch(/Holly Card/);
    expect(options).toMatch(/kept/i);
  });
});

describe("categoriesMatching", () => {
  const paths = new Map([
    ["cards", "Cards"],
    ["christmas", "Cards › Christmas Cards"],
    ["gifts", "Gifts"],
  ]);
  const tree = categories.filter((category) => paths.has(category.id));

  it("shows everything for nothing typed", () => {
    expect(categoriesMatching(tree, "", paths)).toEqual(new Set(["cards", "christmas", "gifts"]));
  });

  it("matches every word against each one's place in the tree", () => {
    expect(categoriesMatching(tree, "christmas cards", paths)).toEqual(new Set(["cards", "christmas"]));
  });

  it("keeps a match's group beside it", () => {
    expect(categoriesMatching(tree, "christmas", paths)).toEqual(new Set(["christmas", "cards"]));
  });

  it("finds nothing for a word nothing has", () => {
    expect(categoriesMatching(tree, "zebra", paths)).toEqual(new Set());
  });
});
