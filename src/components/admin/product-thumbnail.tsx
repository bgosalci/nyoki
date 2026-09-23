"use client";

import Image from "next/image";
import { useState } from "react";

import { ui } from "@/lib/brand/ui";

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

/** Big enough to read a card's greeting without leaving the list. */
const PREVIEW = 288;

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
  preview = false,
}: {
  image: { url: string; alt: string | null } | null;
  size?: ThumbnailSize;
  /**
   * Show a larger copy while the pointer rests on it. A deliberate
   * enhancement for mice rather than the only way to see the photograph:
   * the row's name links to the product, where it is shown in full.
   */
  preview?: boolean;
}) {
  const [showing, setShowing] = useState(false);
  const { px, className } = SIZES[size];

  if (!image) {
    return (
      <div
        aria-hidden="true"
        className={`${className} shrink-0 rounded-md bg-nyoki-soft-ash dark:bg-nyoki-navy`}
      />
    );
  }

  return (
    <span
      className="relative inline-block"
      onMouseEnter={preview ? () => setShowing(true) : undefined}
      onMouseLeave={preview ? () => setShowing(false) : undefined}
    >
      <Image
        src={image.url}
        alt=""
        width={px}
        height={px}
        className={`${className} shrink-0 rounded-md bg-nyoki-soft-ash object-cover dark:bg-nyoki-navy`}
      />

      {showing ? (
        // Pointer-transparent on purpose: under the cursor, a preview that
        // captured the pointer would end the hover that opened it, which
        // would close it, which would open it again.
        <span
          className={`pointer-events-none absolute top-1/2 left-full z-30 ml-3 -translate-y-1/2 rounded-lg border p-1 shadow-xl ${ui.panel} ${ui.rule}`}
        >
          <Image
            src={image.url}
            alt=""
            width={PREVIEW}
            height={PREVIEW}
            className="block size-72 max-w-none rounded bg-nyoki-soft-ash object-contain dark:bg-nyoki-navy"
          />
        </span>
      ) : null}
    </span>
  );
}
