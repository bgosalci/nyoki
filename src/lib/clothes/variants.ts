import type { ClothingCombo } from "@/lib/clothes/settings";

/**
 * A piece of clothing's variants - one per colour in each size - kept in step
 * with what the Details form saves.
 *
 * A variant is updated where it can be, not replaced: an order line points at
 * it, and it carries what Shopify recorded (a code, the price a size used to
 * sell at). So a stock change, a rename and a colour added to a sized piece
 * all keep the rows they had, and only what is gone is removed.
 */

export interface StoredVariant {
  id: string;
  colour: string | null;
  size: string | null;
}

export interface VariantWrite {
  colour: string | null;
  size: string | null;
  name: string;
  stock: number;
  position: number;
}

export interface VariantPlan {
  update: (VariantWrite & { id: string })[];
  create: VariantWrite[];
  remove: string[];
}

/** "Lupin / 3-4 years", or whichever of the two it has. */
export function variantLabel(colour: string | null, size: string | null): string {
  return [colour, size].filter((part): part is string => part !== null).join(" / ");
}

const keyOf = (colour: string | null, size: string | null) => JSON.stringify([colour, size]);

export function planVariants(stored: readonly StoredVariant[], combos: readonly ClothingCombo[]): VariantPlan {
  // Stored rows by colour and size, in case the same pair is there twice.
  const free = new Map<string, StoredVariant[]>();
  for (const variant of stored) {
    const key = keyOf(variant.colour, variant.size);
    free.set(key, [...(free.get(key) ?? []), variant]);
  }
  const claim = (key: string) => free.get(key)?.shift();

  // By the names saved under first, for every row, so a renamed colour keeps
  // its rows ahead of a new colour that takes its old name; then by name.
  const matched = combos.map((combo) => claim(keyOf(combo.colourWas, combo.sizeWas)));
  combos.forEach((combo, index) => {
    matched[index] ??= claim(keyOf(combo.colour, combo.size));
  });

  const plan: VariantPlan = { update: [], create: [], remove: [] };
  combos.forEach(({ colour, size, stock }, position) => {
    const write = { colour, size, name: variantLabel(colour, size), stock, position };
    const variant = matched[position];
    if (variant) plan.update.push({ id: variant.id, ...write });
    else plan.create.push(write);
  });

  const kept = new Set(matched.flatMap((variant) => (variant ? [variant.id] : [])));
  plan.remove = stored.filter((variant) => !kept.has(variant.id)).map((variant) => variant.id);
  return plan;
}

const option = (value: unknown) => (typeof value === "string" && value.trim() !== "" ? value.trim() : null);

/**
 * The colour and size in a variant's Shopify options. Shopify spelt colour
 * both ways; anything else it held - one piece had "Inventory" - is neither.
 */
export function axesFromOptions(options: Readonly<Record<string, unknown>>): { colour: string | null; size: string | null } {
  return { colour: option(options.Colour) ?? option(options.Color), size: option(options.Size) };
}

/** Each colour and each size once, in the order the variants came. */
export function axesOf(variants: readonly { colour: string | null; size: string | null }[]): { colours: string[]; sizes: string[] } {
  const distinct = (values: (string | null)[]) => [...new Set(values.filter((value): value is string => value !== null))];
  return { colours: distinct(variants.map((v) => v.colour)), sizes: distinct(variants.map((v) => v.size)) };
}
