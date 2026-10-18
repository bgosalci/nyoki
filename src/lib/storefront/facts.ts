export interface Fact {
  label: string;
  value: string;
  /**
   * Written in the formatting editor, so bold, italic and bullets are meant.
   * The rest are typed into plain boxes, where an asterisk is an asterisk.
   */
  rich: boolean;
}

/** A weight for shoppers: grams under a kilo, kilos above, never a trailing zero. */
export function formatGrams(grams: number): string {
  if (grams < 1000) return `${grams}g`;
  const kilos = grams / 1000;
  return `${Number(kilos.toFixed(2))}kg`;
}

/**
 * The making details, in the order a shopper wants them. Anything Njomza left
 * blank is left out, so the panel can be hidden entirely when nothing is known.
 */
export function productFacts(product: {
  dimensions: string | null;
  materials: string | null;
  weightGrams: number | null;
  careInstructions: string | null;
}): Fact[] {
  const facts: Fact[] = [];

  if (product.dimensions) facts.push({ label: "Size", value: product.dimensions, rich: false });
  if (product.materials) facts.push({ label: "Materials", value: product.materials, rich: true });
  if (product.weightGrams) facts.push({ label: "Weight", value: formatGrams(product.weightGrams), rich: false });
  if (product.careInstructions) facts.push({ label: "Care", value: product.careInstructions, rich: false });

  return facts;
}
