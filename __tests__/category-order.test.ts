import { CATEGORY_ORDER, categoryLanding, moveAmongSiblings } from "@/lib/categories/ordering";

/**
 * The tree as the categories page shows it, in the shop's order:
 *
 *   Accessories       a   (a1, a2 inside)
 *   Cards             c   (c1, c2, c3 inside)
 *   Christmas         x
 *   Clothing          k   (k1 inside)
 */
const rows = [
  { id: "a", parentId: null, position: 1 },
  { id: "a1", parentId: "a", position: 2 },
  { id: "a2", parentId: "a", position: 3 },
  { id: "c", parentId: null, position: 4 },
  { id: "c1", parentId: "c", position: 5 },
  { id: "c2", parentId: "c", position: 6 },
  { id: "c3", parentId: "c", position: 7 },
  { id: "x", parentId: null, position: 8 },
  { id: "k", parentId: null, position: 9 },
  { id: "k1", parentId: "k", position: 10 },
];

/** The ids of one group, lowest key first, once `updates` are written. */
function group(parentId: string | null, updates: { id: string; position: number }[], from = rows) {
  const keys = new Map(from.map((row) => [row.id, row.position]));
  for (const update of updates) keys.set(update.id, update.position);
  return from
    .filter((row) => row.parentId === parentId)
    .sort((a, b) => keys.get(a.id)! - keys.get(b.id)!)
    .map((row) => row.id)
    .join(" ");
}

describe("CATEGORY_ORDER", () => {
  it("reads lowest key first, then by name for any keys that tie", () => {
    expect(CATEGORY_ORDER).toEqual([{ position: "asc" }, { name: "asc" }]);
  });
});

describe("moveAmongSiblings", () => {
  it("moves a group up among the groups, by handing round the keys of those it passes", () => {
    const updates = moveAmongSiblings(rows, "x", "c", "before");

    expect(updates).toEqual([
      { id: "x", position: 4 },
      { id: "c", position: 8 },
    ]);
    expect(group(null, updates!)).toBe("a x c k");
  });

  it("moves a type within its group, and touches nothing outside it", () => {
    const updates = moveAmongSiblings(rows, "c3", "c1", "before");

    expect(group("c", updates!)).toBe("c3 c1 c2");
    expect(updates!.map((update) => update.id).sort()).toEqual(["c1", "c2", "c3"]);
  });

  it("leaves what is inside a group alone when the group moves - it goes with it", () => {
    const updates = moveAmongSiblings(rows, "a", "k", "after");

    expect(group(null, updates!)).toBe("c x k a");
    expect(updates!.some((update) => ["a1", "a2", "c1", "k1"].includes(update.id))).toBe(false);
  });

  it("writes nothing for a category dropped where it already is", () => {
    expect(moveAmongSiblings(rows, "c", "a", "after")).toEqual([]);
    expect(moveAmongSiblings(rows, "c", "c", "before")).toEqual([]);
  });

  it("refuses to move a category into another group: that is its parent's to say, on its own page", () => {
    expect(moveAmongSiblings(rows, "c1", "x", "after")).toBeNull();
    expect(moveAmongSiblings(rows, "a", "c1", "before")).toBeNull();
  });

  it("refuses a category it does not know", () => {
    expect(moveAmongSiblings(rows, "gone", "a", "before")).toBeNull();
    expect(moveAmongSiblings(rows, "a", "gone", "before")).toBeNull();
  });

  it("breaks keys that tie, so the order dragged is the order kept", () => {
    // Every category started at 0, read in name order.
    const tied = ["a", "c", "x", "k"].map((id) => ({ id, parentId: null, position: 0 }));

    const updates = moveAmongSiblings(tied, "k", "c", "before");

    expect(group(null, updates!, tied)).toBe("a k c x");
    expect(new Set(updates!.map((update) => update.position)).size).toBe(updates!.length);
  });
});

describe("categoryLanding", () => {
  /** On screen while Accessories is dragged: its own types are folded away under it. */
  const dragging = rows.filter((row) => row.parentId !== "a");

  it("drops a category beside a sibling into that sibling's place", () => {
    expect(categoryLanding(rows, "x", "c")).toEqual({ target: "c", place: "before" });
    expect(categoryLanding(rows, "c1", "c3")).toEqual({ target: "c3", place: "after" });
  });

  it("puts a group dropped among another group's types where it was dropped, as near as its own level allows", () => {
    // Dropped after Cards' second type: below Cards, so straight after it.
    expect(categoryLanding(dragging, "a", "c2")).toEqual({ target: "c", place: "after" });
  });

  it("keeps a type dragged out of its group at the nearest end of its group", () => {
    // Up past its own group's row: first in the group.
    expect(categoryLanding(rows, "c3", "c")).toEqual({ target: "c1", place: "before" });
    // Down into the next group: last in its own.
    expect(categoryLanding(rows, "c1", "x")).toEqual({ target: "c3", place: "after" });
  });

  it("does nothing for a drop that leaves a category where it was", () => {
    // Christmas dragged up only as far as Cards' last type is still below Cards.
    expect(categoryLanding(rows, "x", "c3")).toBeNull();
    expect(categoryLanding(rows, "x", "x")).toBeNull();
    expect(categoryLanding(rows, "gone", "x")).toBeNull();
  });
});
