import Image from "next/image";

/**
 * The seven round badges under the header, from Njomza's own artwork
 * (docs/brand/badges-artwork.jpg), each cut out of it onto a clear ground so
 * it sits on the page's beige rather than in a white box.
 *
 * Since 2009 sits in the middle of the row, as in the artwork; on a phone,
 * where seven across would be too small to read, it stands above the rest.
 */
const BADGES = [
  { file: "family", alt: "Small family business", size: 214 },
  { file: "uk", alt: "Sourced and made in the UK", size: 212 },
  { file: "eco", alt: "Eco-conscious", size: 210 },
  { file: "since", alt: "Moments to memories, since 2009", size: 238 },
  { file: "recycled", alt: "Recycled and recyclable", size: 212 },
  { file: "solvent", alt: "Solvent-free adhesives", size: 213 },
  { file: "compostable", alt: "Biodegradable and compostable", size: 210 },
] as const;

export function HomeBadges() {
  return (
    // role="list" because Safari drops a list's role once its bullets go.
    <ul
      role="list"
      aria-label="What every piece promises"
      className="mx-auto grid max-w-md grid-cols-3 items-center gap-x-4 gap-y-3 md:flex md:max-w-none md:justify-center md:gap-[1.125rem]"
    >
      {BADGES.map((badge) => (
        <li
          key={badge.file}
          className={
            badge.file === "since"
              ? "order-first col-span-3 mx-auto w-40 md:order-none md:mx-0 md:w-auto md:min-w-0 md:flex-[0_1_10.5rem]"
              : "md:min-w-0 md:flex-[0_1_9.25rem]"
          }
        >
          {/* Small pictures already cut to size: nothing for the optimiser to do. */}
          <Image
            src={`/brand/badges/${badge.file}.png`}
            alt={badge.alt}
            width={badge.size}
            height={badge.size}
            unoptimized
            className="block h-auto w-full"
          />
        </li>
      ))}
    </ul>
  );
}
