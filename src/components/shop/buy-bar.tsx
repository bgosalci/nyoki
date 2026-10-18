import { ui } from "@/lib/brand/ui";
import { formatPence } from "@/lib/money";

/**
 * The price and Add to basket, held at the bottom of a phone's screen while
 * the product page scrolls - the way Zara's shop does it. Sticky rather than
 * fixed, so it comes to rest at the end of the page instead of covering the
 * footer. Phones only: from md up the price sits beside the photos, in view.
 *
 * There is no basket yet, so the button cannot be used; like the basket in
 * the header, it says it is coming.
 */
export function BuyBar({ pricePence, wasPence }: { pricePence: number; wasPence: number | null }) {
  return (
    <div
      className={`sticky bottom-0 z-20 -mx-4 mt-10 border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:-mx-6 sm:px-6 md:hidden ${ui.shopRule} ${ui.shopPage}`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <p className="flex items-baseline gap-2 text-lg tabular-nums">
            {formatPence(pricePence)}
            {wasPence !== null ? (
              <>
                <span className="sr-only">was</span>
                <s className={`text-sm ${ui.shopMuted}`}>{formatPence(wasPence)}</s>
              </>
            ) : null}
          </p>
          <p className={`text-xs ${ui.shopMuted}`}>Ordering opens soon</p>
        </div>
        <button
          type="button"
          disabled
          title="Online ordering is coming soon"
          className={`px-6 py-3 text-sm tracking-[0.14em] uppercase disabled:cursor-not-allowed disabled:opacity-60 ${ui.shopButton}`}
        >
          Add to basket
        </button>
      </div>
    </div>
  );
}
