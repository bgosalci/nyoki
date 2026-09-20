import Image from "next/image";

/** The size the thumbnail is served and displayed at. */
const SIZE = 44;

/**
 * A product's first photo, for list rows.
 *
 * Served through next/image so a 4,000px original is resized to a thumbnail
 * rather than downloaded whole - the imported catalogue has several hundred
 * such photos on one page.
 *
 * The alt is deliberately empty: the product name sits beside it in the row,
 * so a description here would be announced straight after it, saying the same
 * thing twice.
 */
export function ProductThumbnail({ image }: { image: { url: string; alt: string | null } | null }) {
  if (!image) {
    return (
      <div
        aria-hidden="true"
        className="size-11 shrink-0 rounded-md bg-nyoki-soft-ash dark:bg-nyoki-navy"
      />
    );
  }

  return (
    <Image
      src={image.url}
      alt=""
      width={SIZE}
      height={SIZE}
      className="size-11 shrink-0 rounded-md bg-nyoki-soft-ash object-cover dark:bg-nyoki-navy"
    />
  );
}
