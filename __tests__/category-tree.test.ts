import { flattenTree } from "@/lib/categories/tree";

const rows = [
  { id: "vases", parentId: null },
  { id: "tableware", parentId: null },
  { id: "mugs", parentId: "tableware" },
  { id: "espresso", parentId: "mugs" },
];

describe("flattenTree", () => {
  it("puts each child directly after its parent, one level deeper", () => {
    expect(flattenTree(rows).map((e) => [e.row.id, e.depth])).toEqual([
      ["vases", 0],
      ["tableware", 0],
      ["mugs", 1],
      ["espresso", 2],
    ]);
  });

  it("keeps siblings in the order they were given", () => {
    const ids = flattenTree(rows).map((e) => e.row.id);
    expect(ids.indexOf("vases")).toBeLessThan(ids.indexOf("tableware"));
  });

  it("still lists a row whose parent is missing, rather than dropping it", () => {
    const orphaned = [...rows, { id: "lost", parentId: "deleted-long-ago" }];
    const ids = flattenTree(orphaned).map((e) => e.row.id);
    expect(ids).toContain("lost");
  });

  it("terminates on a cycle in corrupt data", () => {
    const corrupt = [{ id: "a", parentId: "b" }, { id: "b", parentId: "a" }];
    expect(flattenTree(corrupt).map((e) => e.row.id).sort()).toEqual(["a", "b"]);
  });
});
