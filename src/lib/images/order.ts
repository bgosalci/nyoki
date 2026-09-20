/**
 * Ordering rules for a product's photos. Pure functions over the position
 * column, so the server actions stay thin and the rules stay testable.
 */

export interface Positioned {
  id: string;
  position: number;
}

/** Where a newly uploaded image goes: after the highest position, not the count, since deletions leave gaps. */
export function nextPosition(images: readonly { position: number }[]): number {
  if (images.length === 0) return 0;
  return Math.max(...images.map((image) => image.position)) + 1;
}

/** The images sorted by position and renumbered 0..n-1, as a new array. */
export function renumber<T extends Positioned>(images: readonly T[]): T[] {
  return [...images]
    .sort((a, b) => a.position - b.position)
    .map((image, position) => ({ ...image, position }));
}

/**
 * Swap an image with its neighbour. At either end, or for an unknown id, the
 * result is simply the renumbered list.
 */
export function moveImage<T extends Positioned>(
  images: readonly T[],
  id: string,
  direction: "up" | "down",
): T[] {
  const ordered = renumber(images);
  const index = ordered.findIndex((image) => image.id === id);
  const target = direction === "up" ? index - 1 : index + 1;

  if (index === -1 || target < 0 || target >= ordered.length) return ordered;

  // Exchange the two positions rather than the two array slots: renumber
  // sorts by position, so swapped slots that kept their old positions would
  // be sorted straight back to where they started.
  const moving = ordered[index];
  const other = ordered[target];

  return renumber(
    ordered.map((image) => {
      if (image.id === moving.id) return { ...image, position: other.position };
      if (image.id === other.id) return { ...image, position: moving.position };
      return image;
    }),
  );
}
