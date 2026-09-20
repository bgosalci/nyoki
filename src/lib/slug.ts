/**
 * Product and category URL slugs.
 */

/**
 * Turn a title into a URL slug.
 *
 * Accents are stripped to their base letter rather than removed, so "Crème"
 * becomes "creme" and not "crme".
 */
export function slugify(input: string): string {
  return input
    .normalize("NFD") // split accented characters into letter + accent
    .replace(/[̀-ͯ]/g, "") // drop the accents, keep the letters
    .toLowerCase()
    // Apostrophes are removed outright rather than treated as a separator:
    // "Tom's Bowl" should be "toms-bowl", not "tom-s-bowl".
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-") // every run of punctuation or space -> one hyphen
    .replace(/^-+|-+$/g, ""); // no leading or trailing hyphen
}

/**
 * A slug not already present in `taken`.
 *
 * Counts past the highest existing suffix rather than filling gaps. If "mug-2"
 * was freed by deleting that product, handing the number to a new item would
 * point any surviving link at something entirely different.
 */
export function uniqueSlug(base: string, taken: readonly string[]): string {
  const used = new Set(taken);

  if (!used.has(base)) return base;

  const suffix = new RegExp(`^${escapeForRegExp(base)}-(\\d+)$`);

  let highest = 1;
  for (const slug of used) {
    const match = suffix.exec(slug);
    if (!match) continue;

    highest = Math.max(highest, Number.parseInt(match[1], 10));
  }

  return `${base}-${highest + 1}`;
}

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
