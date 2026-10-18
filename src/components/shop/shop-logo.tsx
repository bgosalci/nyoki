import Image from "next/image";
import Link from "next/link";

/**
 * The Nyoki wordmark in the middle of the shop header, linking home.
 *
 * object-contain because an image's max-width: 100% lets the header's grid
 * squeeze its column while the height holds - on a phone it came out a thin
 * sliver. Contained, the picture keeps its shape in whatever width the column
 * has, so on the narrowest phones it is drawn smaller rather than stretched
 * or pushed off the side. Smaller on a phone so it fits beside the links and
 * icons at full width from 360px; full size from sm up.
 */
export function ShopLogo() {
  return (
    <Link href="/" aria-label="Nyoki Handmade, home" className="justify-self-center">
      <Image
        src="/brand/nyoki-logo.png"
        alt="Nyoki Handmade"
        width={959}
        height={600}
        priority
        className="h-14 w-auto object-contain sm:h-24 md:h-30"
      />
    </Link>
  );
}
