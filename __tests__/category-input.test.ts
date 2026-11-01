import { validateCategoryInput, wouldCreateCycle } from "@/lib/categories/validate";

function form(overrides: Record<string, string> = {}): FormData {
  const data = new FormData();
  const base: Record<string, string> = { name: "Mugs", ...overrides };
  for (const [key, value] of Object.entries(base)) {
    if (value !== "") data.set(key, value);
  }
  return data;
}

describe("validateCategoryInput", () => {
  it("accepts a name alone", () => {
    const result = validateCategoryInput(form());

    expect(result).toEqual({
      ok: true,
      data: { name: "Mugs", slug: "mugs", description: null, parentId: null, labelColour: "nyoki-navy", active: false },
    });
  });

  it("reads its status from the Active switch: on when ticked, off when left off", () => {
    expect(validateCategoryInput(form({ active: "on" }))).toMatchObject({ ok: true, data: { active: true } });
    expect(validateCategoryInput(form())).toMatchObject({ ok: true, data: { active: false } });
  });

  it("derives the slug from the name unless one is given", () => {
    expect(validateCategoryInput(form({ slug: "Drinking Vessels" })))
      .toMatchObject({ ok: true, data: { slug: "drinking-vessels" } });
  });

  it("requires a name", () => {
    const result = validateCategoryInput(form({ name: "" }));

    expect(!result.ok && result.errors.name).toMatch(/name/i);
  });

  it("rejects a name with nothing to build a slug from", () => {
    expect(validateCategoryInput(form({ name: "???" })).ok).toBe(false);
  });

  it("keeps an optional description and parent", () => {
    const result = validateCategoryInput(
      form({ description: "  Things to drink from  ", parentId: "cat_tableware" }),
    );

    expect(result).toMatchObject({
      ok: true,
      data: { description: "Things to drink from", parentId: "cat_tableware" },
    });
  });

  it("takes the colour of its name in the shop's header", () => {
    expect(validateCategoryInput(form({ labelColour: "nyoki-sage-deep" })))
      .toMatchObject({ ok: true, data: { labelColour: "nyoki-sage-deep" } });
  });

  it("refuses a colour it does not offer, which might not read on the header", () => {
    const result = validateCategoryInput(form({ labelColour: "nyoki-sage-light" }));

    expect(!result.ok && result.errors.labelColour).toBeTruthy();
  });

  it("treats a blank parent as top level", () => {
    expect(validateCategoryInput(form({ parentId: "" })))
      .toMatchObject({ ok: true, data: { parentId: null } });
  });
});

describe("wouldCreateCycle", () => {
  // tableware -> mugs -> espresso
  const tree = [
    { id: "tableware", parentId: null },
    { id: "mugs", parentId: "tableware" },
    { id: "espresso", parentId: "mugs" },
    { id: "vases", parentId: null },
  ];

  it("allows moving under an unrelated category", () => {
    expect(wouldCreateCycle(tree, "mugs", "vases")).toBe(false);
  });

  it("allows moving to the top level", () => {
    expect(wouldCreateCycle(tree, "mugs", null)).toBe(false);
  });

  it("refuses a category as its own parent", () => {
    expect(wouldCreateCycle(tree, "mugs", "mugs")).toBe(true);
  });

  it("refuses a category's child as its parent", () => {
    expect(wouldCreateCycle(tree, "mugs", "espresso")).toBe(true);
  });

  it("refuses a deeper descendant as its parent", () => {
    expect(wouldCreateCycle(tree, "tableware", "espresso")).toBe(true);
  });

  it("allows a brand new category under anything", () => {
    expect(wouldCreateCycle(tree, null, "espresso")).toBe(false);
  });

  it("does not loop forever on already-corrupt data", () => {
    // If a cycle somehow already exists, walking parents must still terminate.
    const corrupt = [
      { id: "a", parentId: "b" },
      { id: "b", parentId: "a" },
      { id: "c", parentId: null },
    ];

    expect(wouldCreateCycle(corrupt, "c", "a")).toBe(false);
  });
});
