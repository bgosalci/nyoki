import { visibleBranches } from "@/lib/categories/collapse";

// cards
//   birthday
//     milestone
//   christmas
// clothes
const branches = [
  { row: { id: "cards" }, depth: 0 },
  { row: { id: "birthday" }, depth: 1 },
  { row: { id: "milestone" }, depth: 2 },
  { row: { id: "christmas" }, depth: 1 },
  { row: { id: "clothes" }, depth: 0 },
];

const ids = (collapsed: string[]) =>
  visibleBranches(branches, new Set(collapsed)).map((branch) => branch.row.id);

describe("visibleBranches", () => {
  it("shows everything when nothing is collapsed", () => {
    expect(ids([])).toEqual(["cards", "birthday", "milestone", "christmas", "clothes"]);
  });

  it("marks which rows can be collapsed at all", () => {
    const marked = Object.fromEntries(
      visibleBranches(branches, new Set()).map((branch) => [branch.row.id, branch.hasChildren]),
    );

    expect(marked).toEqual({
      cards: true,
      birthday: true,
      milestone: false,
      christmas: false,
      clothes: false,
    });
  });

  it("counts a row's own children, not everything beneath it", () => {
    const [cards] = visibleBranches(branches, new Set());

    expect(cards.childCount).toBe(2);
  });

  it("hides what a collapsed row contains, to any depth", () => {
    expect(ids(["cards"])).toEqual(["cards", "clothes"]);
  });

  it("keeps a collapsed row's siblings and their children", () => {
    expect(ids(["birthday"])).toEqual(["cards", "birthday", "christmas", "clothes"]);
  });

  it("hides a child that is open inside a parent that is shut", () => {
    // "birthday" is expanded, but nobody can see it: "cards" is closed.
    expect(ids(["cards"])).not.toContain("birthday");
  });

  it("ignores a collapsed row with nothing to collapse", () => {
    expect(ids(["clothes"])).toEqual(["cards", "birthday", "milestone", "christmas", "clothes"]);
  });

  it("ignores an id that is not in the tree at all", () => {
    expect(ids(["deleted-long-ago"])).toHaveLength(branches.length);
  });

  it("keeps whatever else the row carries", () => {
    const named = visibleBranches([{ row: { id: "cards", name: "Cards" }, depth: 0 }], new Set());

    expect(named[0].row.name).toBe("Cards");
  });
});
