import { offShopBecause, onShop, shopTrail, slugsOnShop } from "@/lib/categories/visibility";
import { hrefFor } from "@/lib/home/links";

// cards -> christmas (inactive) -> packs ; cards -> birthday ; clothes
const categories = [
  { id: "cards", slug: "cards", name: "Cards", parentId: null, active: true },
  { id: "christmas", slug: "christmas-cards", name: "Christmas Cards", parentId: "cards", active: false },
  { id: "packs", slug: "christmas-packs", name: "Christmas Packs", parentId: "christmas", active: true },
  { id: "birthday", slug: "birthday-card", name: "Birthday Card", parentId: "cards", active: true },
  { id: "clothes", slug: "clothes", name: "Clothes", parentId: null, active: true },
];

const ids = (list: readonly { id: string }[]) => list.map((category) => category.id);

describe("onShop", () => {
  it("keeps every active category, in the order given", () => {
    const all = categories.map((category) => ({ ...category, active: true }));

    expect(ids(onShop(all))).toEqual(["cards", "christmas", "packs", "birthday", "clothes"]);
  });

  it("takes an inactive category off the shop, and everything inside it however deep", () => {
    expect(ids(onShop(categories))).toEqual(["cards", "birthday", "clothes"]);
  });

  it("takes a department's types with it", () => {
    const shut = categories.map((category) => (category.id === "cards" ? { ...category, active: false } : category));

    expect(ids(onShop(shut))).toEqual(["clothes"]);
  });

  it("cannot hang on a tree that loops", () => {
    const loop = [
      { id: "a", parentId: "b", active: true },
      { id: "b", parentId: "a", active: true },
    ];

    expect(ids(onShop(loop))).toEqual(["a", "b"]);
    expect(ids(onShop([loop[0], { ...loop[1], active: false }]))).toEqual([]);
  });
});

describe("offShopBecause", () => {
  it("names what keeps each one off the shop: itself, or the inactive category above it", () => {
    const because = offShopBecause(categories);

    expect([...because].map(([id, cause]) => [id, cause.id])).toEqual([
      ["christmas", "christmas"],
      ["packs", "christmas"],
    ]);
  });

  it("names the nearest, where more than one above is inactive", () => {
    const shut = categories.map((category) => (category.id === "cards" ? { ...category, active: false } : category));

    expect(offShopBecause(shut).get("packs")?.id).toBe("christmas");
    expect(offShopBecause(shut).get("birthday")?.id).toBe("cards");
  });
});

describe("shopTrail", () => {
  it("leads a piece's breadcrumb through the first of its categories on the shop", () => {
    expect(ids(shopTrail(categories, ["packs", "birthday"]))).toEqual(["cards", "birthday"]);
  });

  it("leads nowhere for a piece in no category on the shop", () => {
    expect(shopTrail(categories, ["christmas", "packs"])).toEqual([]);
    expect(shopTrail(categories, [])).toEqual([]);
  });
});

describe("slugsOnShop", () => {
  it("gives a category off the shop no address, so a home page tile leading there goes to the whole shop", () => {
    const slugs = slugsOnShop(categories);

    expect(hrefFor({ kind: "category", categoryId: "birthday" }, slugs)).toBe("/shop/birthday-card");
    expect(hrefFor({ kind: "category", categoryId: "christmas" }, slugs)).toBe("/shop");
    expect(hrefFor({ kind: "category", categoryId: "packs" }, slugs)).toBe("/shop");
  });
});
