import { moveInList, moveUpdates, placeFor } from "@/lib/products/ordering";

/** The catalogue as stored: a key each, read highest first - so a, b, c, d, e. */
const rows = [
  { id: "c", sortKey: 30 },
  { id: "a", sortKey: 50 },
  { id: "e", sortKey: 10 },
  { id: "b", sortKey: 40 },
  { id: "d", sortKey: 20 },
];

const order = (updates: { id: string; sortKey: number }[]) => {
  const keys = new Map(rows.map((row) => [row.id, row.sortKey]));
  for (const update of updates) keys.set(update.id, update.sortKey);
  return [...keys].sort((x, y) => y[1] - x[1]).map(([id]) => id).join("");
};

describe("moveInList", () => {
  const list = ["a", "b", "c", "d", "e"].map((id) => ({ id }));
  const ids = (items: { id: string }[]) => items.map((item) => item.id).join("");

  it("puts a piece just before another", () => {
    expect(ids(moveInList(list, "d", "b", "before"))).toBe("adbce");
  });

  it("puts a piece just after another", () => {
    expect(ids(moveInList(list, "b", "d", "after"))).toBe("acdbe");
  });

  it("can move to either end", () => {
    expect(ids(moveInList(list, "e", "a", "before"))).toBe("eabcd");
    expect(ids(moveInList(list, "a", "e", "after"))).toBe("bcdea");
  });

  it("leaves the list as it was for a piece dropped on itself, or one it does not hold", () => {
    expect(ids(moveInList(list, "c", "c", "before"))).toBe("abcde");
    expect(ids(moveInList(list, "z", "c", "before"))).toBe("abcde");
    expect(ids(moveInList(list, "c", "z", "before"))).toBe("abcde");
  });

  it("does not change the list it was given", () => {
    moveInList(list, "d", "b", "before");

    expect(ids(list)).toBe("abcde");
  });
});

describe("placeFor", () => {
  it("drops a piece moved down after the one it lands on, and one moved up before it", () => {
    const shown = ["a", "b", "c", "d"];

    expect(placeFor(shown, "a", "c")).toBe("after");
    expect(placeFor(shown, "d", "b")).toBe("before");
  });
});

describe("moveUpdates", () => {
  it("moves a piece up, by shuffling the keys of the rows it passes", () => {
    const updates = moveUpdates(rows, "d", "b", "before");

    expect(order(updates)).toBe("adbce");
    expect(updates).toEqual(
      expect.arrayContaining([
        { id: "d", sortKey: 40 },
        { id: "b", sortKey: 30 },
        { id: "c", sortKey: 20 },
      ]),
    );
    expect(updates).toHaveLength(3);
  });

  it("moves a piece down", () => {
    expect(order(moveUpdates(rows, "a", "d", "after"))).toBe("bcdae");
  });

  it("writes only the keys that change", () => {
    const touched = moveUpdates(rows, "b", "c", "after").map((update) => update.id).sort();

    expect(touched).toEqual(["b", "c"]);
  });

  it("uses only the keys already there, so nothing moved can rise above a newer piece", () => {
    const keys = moveUpdates(rows, "e", "a", "before").map((update) => update.sortKey);

    expect(Math.max(...keys)).toBe(50);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("changes nothing for a piece dropped where it already is, or for one it does not know", () => {
    expect(moveUpdates(rows, "c", "b", "after")).toEqual([]);
    expect(moveUpdates(rows, "c", "c", "before")).toEqual([]);
    expect(moveUpdates(rows, "gone", "c", "before")).toEqual([]);
    expect(moveUpdates(rows, "c", "gone", "before")).toEqual([]);
  });

  it("keeps everything it passes in the same order among themselves", () => {
    // Pieces of another status sit between two active ones in the stored
    // order; moving past them must not reorder them.
    expect(order(moveUpdates(rows, "e", "a", "after"))).toBe("aebcd");
  });
});
