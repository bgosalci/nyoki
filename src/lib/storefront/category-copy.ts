/**
 * The words a category page opens with.
 *
 * A category carries a description the shopkeeper writes, and most of the
 * imported catalogue has none. Rather than leave those pages with a heading
 * and nothing else, a line is built from the name - plainly enough that it
 * reads as a placeholder worth replacing, and truthfully enough to stand in
 * the meantime.
 */

// A name ending in s can be either - "Cards" is already plural, "Dress" is
// not - so the doubled s is tested first, which is what separates them.
const SIBILANT = /(?:ss|x|z|ch|sh)$/i;
const CONSONANT_Y = /[^aeiou]y$/i;

/** The name as a plural, for a heading that talks about more than one thing. */
export function pluralise(name: string): string {
  if (SIBILANT.test(name)) return `${name}es`;
  if (/s$/i.test(name)) return name;
  if (CONSONANT_Y.test(name)) return `${name.slice(0, -1)}ies`;

  return `${name}s`;
}

export function categoryIntro(category: { name: string; description: string | null }): string {
  const written = category.description?.trim();
  if (written) return written;

  // The name keeps its capitals: half the catalogue is Christmas, Easter and
  // Father's Day, and lowercasing those would be wrong.
  return `${pluralise(category.name)} made by hand in the UK - crocheted, stitched and printed in small numbers, so no two come out quite alike.`;
}
