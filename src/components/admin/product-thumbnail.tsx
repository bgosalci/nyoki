import Image from "next/image";

/**
 * The sizes a thumbnail is served and drawn at.
 *
 * The class cannot be built from the number: Tailwind reads the source for
 * whole class names, so `size-${n}` would never be generated.
 */
const SIZES = {
  row: { px: 56, className: "size-14" },
  large: { px: 112, className: "size-28" },
} as const;

export type ThumbnailSize = keyof typeof SIZES;

/**
 * A product's first photo, for list rows.
 *
 * Served through next/image so a 4,000px original is resized rather than
 * downloaded whole - the imported catalogue has several hundred such photos
 * on one page.
 *
 * The alt is deliberately empty: the product name sits beside it in the row,
 * so a description here would be announced straight after it, saying the same
 * thing twice.
 */
export function ProductThumbnail({
  image,
  size = "row",
}: {
  image: { url: string; alt: string | null } | null;
  size?: ThumbnailSize;
}) {
  const { px, className } = SIZES[size];

  if (!image) {
    return (
      <div aria-hidden="true" className={`${className} shrink-0 rounded-md bg-nyoki-soft-ash dark:bg-nyoki-navy`} />
    );
  }

  return (
    <Image
      src={image.url}
      alt=""
      width={px}
      height={px}
      className={`${className} shrink-0 rounded-md bg-nyoki-soft-ash object-cover dark:bg-nyoki-navy`}
    />
  );
}
