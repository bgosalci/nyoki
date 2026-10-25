import type { StockRow } from "@/lib/clothes/stock";

/**
 * The Details form's colours, sizes and stock while they are edited.
 *
 * Pure, so the rules are tested apart from the page. Rows are known by a key
 * that never changes, so the stock typed against a colour stays with it while
 * it is renamed or moved. Keys are counted within the editor, never across
 * the module: a server counting on from request to request drew keys the
 * browser did not, and the page failed to hydrate. A piece in sizes only has its stock against the
 * sizes alone; the first colour added takes that stock over, and removing the
 * last colour hands it back, so nothing typed is lost either way.
 */

export type Axis = "colours" | "sizes";

export interface AxisRow {
  key: number;
  name: string;
  /** The name it was saved under; blank for a row added since. */
  was: string;
}

export interface ClothingEditor {
  colours: AxisRow[];
  sizes: AxisRow[];
  /** What is typed in each box, by colour key and size key. */
  stock: Readonly<Record<string, string>>;
  /** The key the next row added takes. */
  nextKey: number;
}

export interface GridCell {
  colour: AxisRow | null;
  size: AxisRow | null;
  /** Places in the lists, which name the box posted (`stockFieldName`). */
  colourIndex: number | null;
  sizeIndex: number | null;
}

/** No colours (or no sizes): the one slot an empty list has. */
const NONE = "-";

const cellKey = (colourKey: number | null, sizeKey: number | null) => `${colourKey ?? NONE}|${sizeKey ?? NONE}`;

export function editorFrom({
  colours,
  sizes,
  variants,
}: {
  colours: readonly string[];
  sizes: readonly string[];
  variants: readonly StockRow[];
}): ClothingEditor {
  let nextKey = 0;
  const row = (name: string): AxisRow => ({ key: nextKey++, name, was: name });
  const editor = { colours: colours.map(row), sizes: sizes.map(row) };

  /** A variant's place on one side of the grid: a row's key, NONE's null, or undefined where it has none. */
  const placeOn = (rows: AxisRow[], value: string | null) =>
    rows.length === 0 ? (value === null ? null : undefined) : rows.find((r) => r.name === value)?.key;

  const stock: Record<string, string> = {};
  for (const variant of variants) {
    const colourKey = placeOn(editor.colours, variant.colour);
    const sizeKey = placeOn(editor.sizes, variant.size);
    if (colourKey !== undefined && sizeKey !== undefined) stock[cellKey(colourKey, sizeKey)] = String(variant.stock);
  }

  return { ...editor, stock, nextKey };
}

/** The stock with one side's key changed from `from` to `to`, or dropped where `to` is undefined. */
function rekey(stock: ClothingEditor["stock"], axis: Axis, from: string, to: string | undefined): Record<string, string> {
  const next: Record<string, string> = {};
  for (const [key, value] of Object.entries(stock)) {
    const [colourKey, sizeKey] = key.split("|");
    const side = axis === "colours" ? colourKey : sizeKey;
    if (side !== from) next[key] = value;
    else if (to !== undefined) next[axis === "colours" ? `${to}|${sizeKey}` : `${colourKey}|${to}`] = value;
  }
  return next;
}

export function addRow(editor: ClothingEditor, axis: Axis): ClothingEditor {
  const row: AxisRow = { key: editor.nextKey, name: "", was: "" };
  // The first of its kind takes over what was stocked without it.
  const stock = editor[axis].length === 0 ? rekey(editor.stock, axis, NONE, String(row.key)) : editor.stock;
  return { ...editor, [axis]: [...editor[axis], row], stock, nextKey: editor.nextKey + 1 };
}

export function removeRow(editor: ClothingEditor, axis: Axis, key: number): ClothingEditor {
  const rows = editor[axis].filter((row) => row.key !== key);
  // The last of its kind hands its stock back; any other takes it away.
  const stock = rekey(editor.stock, axis, String(key), rows.length === 0 ? NONE : undefined);
  return { ...editor, [axis]: rows, stock };
}

export function renameRow(editor: ClothingEditor, axis: Axis, key: number, name: string): ClothingEditor {
  return { ...editor, [axis]: editor[axis].map((row) => (row.key === key ? { ...row, name } : row)) };
}

/** One place up (-1) or down (1), and no further than either end. */
export function moveRow(editor: ClothingEditor, axis: Axis, key: number, by: -1 | 1): ClothingEditor {
  const rows = [...editor[axis]];
  const from = rows.findIndex((row) => row.key === key);
  const to = from + by;
  if (from < 0 || to < 0 || to >= rows.length) return editor;
  [rows[from], rows[to]] = [rows[to], rows[from]];
  return { ...editor, [axis]: rows };
}

export function setStock(editor: ClothingEditor, colourKey: number | null, sizeKey: number | null, typed: string): ClothingEditor {
  return { ...editor, stock: { ...editor.stock, [cellKey(colourKey, sizeKey)]: typed } };
}

export function stockAt(editor: ClothingEditor, colourKey: number | null, sizeKey: number | null): string {
  return editor.stock[cellKey(colourKey, sizeKey)] ?? "";
}

/** A box for each colour in each size, colour by colour; none for a piece with neither. */
export function gridCells(editor: ClothingEditor): GridCell[] {
  if (editor.colours.length === 0 && editor.sizes.length === 0) return [];
  const slots = (rows: AxisRow[]) => (rows.length > 0 ? rows.map((row, index) => ({ row, index })) : [{ row: null, index: null }]);

  return slots(editor.colours).flatMap((colour) =>
    slots(editor.sizes).map((size) => ({ colour: colour.row, size: size.row, colourIndex: colour.index, sizeIndex: size.index })),
  );
}

/** Everything in stock across the grid; a box not yet a whole number counts as none. */
export function totalStock(editor: ClothingEditor): number {
  return gridCells(editor).reduce((total, cell) => {
    const typed = stockAt(editor, cell.colour?.key ?? null, cell.size?.key ?? null).trim();
    return total + (/^\d+$/.test(typed) ? Number.parseInt(typed, 10) : 0);
  }, 0);
}
