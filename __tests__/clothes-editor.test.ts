import { addRow, editorFrom, gridCells, moveRow, removeRow, renameRow, setStock, stockAt, totalStock, type AxisRow } from "@/lib/clothes/editor";

/** A piece sold in two sizes and no colours: 2 small, none medium. */
const sized = () =>
  editorFrom({
    colours: [],
    sizes: ["S", "M"],
    variants: [
      { colour: null, size: "S", stock: 2 },
      { colour: null, size: "M", stock: 0 },
    ],
  });

const keyOf = (rows: AxisRow[], name: string) => rows.find((row) => row.name === name)!.key;

describe("the colours and sizes editor", () => {
  it("starts from what is stored, each row remembering the name it was saved under", () => {
    const editor = editorFrom({ colours: ["Red"], sizes: ["S"], variants: [{ colour: "Red", size: "S", stock: 4 }] });

    expect(editor.colours).toEqual([expect.objectContaining({ name: "Red", was: "Red" })]);
    expect(stockAt(editor, editor.colours[0].key, editor.sizes[0].key)).toBe("4");
  });

  it("gives the same rows the same keys every time, so the page the server draws matches the one the browser hydrates", () => {
    const saved = { colours: ["Red"], sizes: ["S", "M"], variants: [] };
    // An earlier request, as a running server has had.
    editorFrom(saved);

    expect(editorFrom(saved)).toEqual(editorFrom(saved));
  });

  it("never gives a row added a key already in use", () => {
    const editor = addRow(addRow(editorFrom({ colours: ["Red"], sizes: ["S"], variants: [] }), "colours"), "sizes");
    const keys = [...editor.colours, ...editor.sizes].map((row) => row.key);

    expect(new Set(keys).size).toBe(keys.length);
  });

  it("leaves the box blank for a combination never stocked", () => {
    const editor = editorFrom({ colours: ["Red"], sizes: ["S"], variants: [] });

    expect(stockAt(editor, editor.colours[0].key, editor.sizes[0].key)).toBe("");
  });

  it("adds a row with no name yet, and no name it was saved under", () => {
    const editor = addRow(sized(), "colours");

    expect(editor.colours).toEqual([expect.objectContaining({ name: "", was: "" })]);
  });

  it("gives a sized piece's stock to the first colour added", () => {
    const editor = addRow(sized(), "colours");

    expect(stockAt(editor, editor.colours[0].key, keyOf(editor.sizes, "S"))).toBe("2");
    expect(stockAt(editor, editor.colours[0].key, keyOf(editor.sizes, "M"))).toBe("0");
  });

  it("starts a second colour with nothing in stock", () => {
    const editor = addRow(addRow(sized(), "colours"), "colours");

    expect(stockAt(editor, editor.colours[1].key, keyOf(editor.sizes, "S"))).toBe("");
  });

  it("hands the stock back to the sizes when the last colour is removed", () => {
    let editor = addRow(sized(), "colours");
    editor = removeRow(editor, "colours", editor.colours[0].key);

    expect(stockAt(editor, null, keyOf(editor.sizes, "S"))).toBe("2");
  });

  it("drops a removed colour's stock when other colours remain", () => {
    let editor = editorFrom({
      colours: ["Red", "Blue"],
      sizes: [],
      variants: [
        { colour: "Red", size: null, stock: 3 },
        { colour: "Blue", size: null, stock: 1 },
      ],
    });
    editor = removeRow(editor, "colours", keyOf(editor.colours, "Red"));

    expect(editor.colours.map((row) => row.name)).toEqual(["Blue"]);
    expect(totalStock(editor)).toBe(1);
  });

  it("keeps the stock with a row when it is renamed or moved", () => {
    let editor = sized();
    const small = keyOf(editor.sizes, "S");
    editor = renameRow(editor, "sizes", small, "Small");
    editor = moveRow(editor, "sizes", small, 1);

    expect(editor.sizes.map((row) => row.name)).toEqual(["M", "Small"]);
    expect(editor.sizes[1]).toMatchObject({ name: "Small", was: "S" });
    expect(stockAt(editor, null, small)).toBe("2");
  });

  it("moves a row no further than either end", () => {
    const editor = sized();

    expect(moveRow(editor, "sizes", keyOf(editor.sizes, "S"), -1).sizes.map((row) => row.name)).toEqual(["S", "M"]);
    expect(moveRow(editor, "sizes", keyOf(editor.sizes, "M"), 1).sizes.map((row) => row.name)).toEqual(["S", "M"]);
  });

  it("lays out a box for each colour in each size, colour by colour", () => {
    const editor = editorFrom({ colours: ["Red", "Blue"], sizes: ["S", "M"], variants: [] });

    expect(gridCells(editor).map(({ colour, size, colourIndex, sizeIndex }) => [colour?.name, size?.name, colourIndex, sizeIndex])).toEqual([
      ["Red", "S", 0, 0],
      ["Red", "M", 0, 1],
      ["Blue", "S", 1, 0],
      ["Blue", "M", 1, 1],
    ]);
  });

  it("lays out one box per size for a piece with no colours, and none for a piece with neither", () => {
    expect(gridCells(sized()).map(({ colour, size }) => [colour, size?.name])).toEqual([
      [null, "S"],
      [null, "M"],
    ]);
    expect(gridCells(editorFrom({ colours: [], sizes: [], variants: [] }))).toEqual([]);
  });

  it("totals the grid, counting a box that is not yet a whole number as none", () => {
    let editor = sized();
    editor = setStock(editor, null, keyOf(editor.sizes, "M"), "3");
    expect(totalStock(editor)).toBe(5);

    editor = setStock(editor, null, keyOf(editor.sizes, "M"), "3.5");
    expect(totalStock(editor)).toBe(2);
  });
});
