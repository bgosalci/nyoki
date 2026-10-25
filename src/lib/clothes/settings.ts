/**
 * A piece of clothing's colours, sizes and stock, as the Details form posts
 * them.
 *
 * Each colour row posts its name as `colour` and the name it was saved under
 * as `colourWas` (blank for a row added since), in the order they stand;
 * sizes likewise. The stock of a colour in a size is in the box named for
 * their places in the lists (`stockFieldName`). The names it was saved under
 * let a renamed colour keep its variants - and whatever is recorded on them -
 * rather than lose them and start again.
 */

/** Long enough for "Grey and Moonstone" or "12-18 months", short enough for a tile. */
export const NAME_MAX = 40;

export interface ClothingCombo {
  colour: string | null;
  size: string | null;
  colourWas: string | null;
  sizeWas: string | null;
  stock: number;
}

export interface ClothingInput {
  colours: string[];
  sizes: string[];
  /** Every colour in every size, colour by colour; empty with neither. */
  combos: ClothingCombo[];
}

export type ClothingField = "colours" | "sizes" | "variantStock";

export type ClothingErrors = Partial<Record<ClothingField, string>>;

export type ClothingValidation = { ok: true; data: ClothingInput } | { ok: false; errors: ClothingErrors };

/** The box for a colour in a size, by their places in the lists: "stock-0-2", with "x" for a list that is empty. */
export function stockFieldName(colourIndex: number | null, sizeIndex: number | null): string {
  return `stock-${colourIndex ?? "x"}-${sizeIndex ?? "x"}`;
}

const strings = (form: FormData, key: string) => form.getAll(key).map((value) => (typeof value === "string" ? value.trim() : ""));

/** One list of names, checked: every row named, none too long, none twice. */
function readNames(form: FormData, key: "colour" | "size", noun: { one: string; many: string }) {
  const names = strings(form, key);
  const was = strings(form, `${key}Was`);

  let error: string | undefined;
  if (names.some((name) => name === "")) {
    error = `Name every ${noun.one}, or remove the empty one.`;
  } else if (names.some((name) => name.length > NAME_MAX)) {
    error = `Keep each ${noun.one} to ${NAME_MAX} characters.`;
  } else {
    const seen = new Map<string, string>();
    for (const name of names) {
      const folded = name.toLocaleLowerCase("en-GB");
      const first = seen.get(folded);
      if (first !== undefined) {
        error = `There are two ${noun.many} called “${first}”.`;
        break;
      }
      seen.set(folded, name);
    }
  }

  return { names, was: names.map((_, index) => was[index] || null), error };
}

export function parseClothing(form: FormData): ClothingValidation {
  const errors: ClothingErrors = {};

  const colours = readNames(form, "colour", { one: "colour", many: "colours" });
  const sizes = readNames(form, "size", { one: "size", many: "sizes" });
  if (colours.error) errors.colours = colours.error;
  if (sizes.error) errors.sizes = sizes.error;

  const combos: ClothingCombo[] = [];
  if (colours.names.length > 0 || sizes.names.length > 0) {
    // A list that is empty is one slot with nothing in it, so a piece in
    // sizes only has a box per size.
    const colourSlots = colours.names.length > 0 ? colours.names.map((_, index) => index) : [null];
    const sizeSlots = sizes.names.length > 0 ? sizes.names.map((_, index) => index) : [null];

    for (const c of colourSlots) {
      for (const s of sizeSlots) {
        const raw = form.get(stockFieldName(c, s));
        const typed = typeof raw === "string" ? raw.trim() : "";
        const stock = typed === "" ? 0 : /^\d+$/.test(typed) ? Number.parseInt(typed, 10) : NaN;
        if (!Number.isSafeInteger(stock)) errors.variantStock = "Stock has to be a whole number, zero or more.";

        combos.push({
          colour: c === null ? null : colours.names[c],
          size: s === null ? null : sizes.names[s],
          colourWas: c === null ? null : colours.was[c],
          sizeWas: s === null ? null : sizes.was[s],
          stock,
        });
      }
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: { colours: colours.names, sizes: sizes.names, combos } };
}
