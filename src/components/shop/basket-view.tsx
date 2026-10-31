import Link from "next/link";

import type { AddResult, RemovedLine } from "@/app/(shop)/basket/actions";
import { BasketChanges } from "@/components/shop/basket-changes";
import { BasketLines } from "@/components/shop/basket-lines";
import { FreeDeliveryNote } from "@/components/shop/free-delivery-note";
import type { PricedLine } from "@/lib/basket/review";
import { madeToOrderNote, piecesLabel } from "@/lib/basket/summary";
import { ui } from "@/lib/brand/ui";
import { cheapestDelivery, type DeliveryRate, freeDelivery } from "@/lib/checkout/totals";
import { formatPence } from "@/lib/money";

const PANEL =
  "rounded-[20px] border-[1.5px] border-nyoki-light-slate bg-nyoki-white shadow-[0_1px_2px_rgb(0_0_0/0.03),0_10px_30px_-18px_rgb(0_0_0/0.18)]";
const CHECKOUT =
  "grid h-[52px] place-items-center rounded-full bg-nyoki-navy px-6 text-[15px] font-medium tracking-[0.12em] text-nyoki-beige uppercase transition-colors duration-150 hover:bg-nyoki-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-nyoki-navy motion-reduce:transition-none";

/**
 * The basket page as drawn, from what the page worked out: its lines, what
 * changed, the delivery options for its parcel and, when it is empty, how
 * many pieces the shopper has saved.
 *
 * The actions are props, so the page can be tested without a server.
 */
export function BasketView({
  lines,
  changes,
  pieces,
  subtotalPence,
  rates,
  saved,
  changeQuantity,
  removeLine,
  putBack,
}: {
  lines: PricedLine[];
  changes: string[];
  pieces: number;
  subtotalPence: number;
  rates: DeliveryRate[];
  saved: number;
  changeQuantity: (lineId: string, quantity: number) => Promise<void>;
  removeLine: (lineId: string) => Promise<RemovedLine | null>;
  putBack: (removed: RemovedLine) => Promise<AddResult>;
}) {
  const empty = lines.length === 0;
  const free = freeDelivery(rates, subtotalPence);
  const cheapest = cheapestDelivery(rates, subtotalPence);
  const sending = madeToOrderNote(lines);

  return (
    <div className={`mx-auto max-w-shop px-4 sm:px-6 ${empty ? "py-10 sm:py-12" : "pt-10 sm:pt-12"}`}>
      <div className="flex items-baseline gap-3.5">
        <h1 className={`text-3xl tracking-tight ${ui.shopHeading}`}>Your basket</h1>
        {empty ? null : <span className={ui.shopMuted}>{piecesLabel(pieces)}</span>}
      </div>
      <BasketChanges changes={changes} />

      {/* The lines keep one place on the page, empty or not: moved, React would
          draw them afresh and forget the piece just taken out, so the last one
          out could not be put back. */}
      <div className={empty ? "mt-6" : "mt-7 grid items-start gap-6 md:gap-10 lg:grid-cols-[minmax(0,1fr)_400px]"}>
        <div className="flex flex-col gap-5">
          <BasketLines lines={lines} changeQuantity={changeQuantity} removeLine={removeLine} putBack={putBack} />
          {empty ? (
            <EmptyBasket saved={saved} />
          ) : (
            <Link href="/shop" className={`self-start text-[15px] underline underline-offset-4 ${ui.shopMuted}`}>
              Keep shopping
            </Link>
          )}
        </div>

        {empty ? null : (
          <aside aria-labelledby="summary-heading" className={`flex flex-col gap-5 p-6 sm:p-7 lg:sticky lg:top-60 ${PANEL}`}>
            <h2 id="summary-heading" className={`text-xl font-medium tracking-tight ${ui.shopHeading}`}>
              Order summary
            </h2>
            <dl className="flex flex-col gap-2.5 tabular-nums">
              <div className="flex justify-between gap-4">
                <dt className={ui.shopMuted}>Subtotal · {piecesLabel(pieces)}</dt>
                <dd>{formatPence(subtotalPence)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className={ui.shopMuted}>Delivery</dt>
                {cheapest === null ? (
                  <dd className={ui.shopMuted}>Chosen at checkout</dd>
                ) : (
                  <dd>{cheapest === 0 ? "Free" : `from ${formatPence(cheapest)}`}</dd>
                )}
              </div>
            </dl>
            {free ? <FreeDeliveryNote free={free} subtotalPence={subtotalPence} /> : null}
            <div className={`flex items-baseline justify-between border-t pt-5 ${ui.shopRule}`}>
              <span className="font-medium text-nyoki-ink">Total so far</span>
              <span className="text-2xl font-semibold text-nyoki-ink tabular-nums">{formatPence(subtotalPence)}</span>
            </div>
            <Link href="/checkout" className={`hidden md:grid ${CHECKOUT}`}>
              Checkout
            </Link>
            <div className={`flex flex-col gap-1.5 text-sm ${ui.shopMuted}`}>
              <p>Promo codes go in at checkout.</p>
              {sending ? <p>{sending}</p> : null}
            </div>
          </aside>
        )}
      </div>

      {/* On a phone the total and Checkout are held at the foot of the screen, as Add to basket is. */}
      {empty ? null : (
        <div className={`sticky bottom-0 z-20 -mx-4 mt-10 border-t px-4 pb-[env(safe-area-inset-bottom)] sm:-mx-6 sm:px-6 md:hidden ${ui.shopRule} ${ui.shopPage}`}>
          <div className="flex h-16 items-center gap-3">
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="text-xl leading-tight font-semibold tabular-nums">{formatPence(subtotalPence)}</p>
              <p className={`truncate text-xs ${ui.shopMuted}`}>
                {piecesLabel(pieces)}
                {free?.reached ? " · free delivery" : ""}
              </p>
            </div>
            <Link href="/checkout" className="grid h-11 shrink-0 place-items-center rounded-full bg-nyoki-navy px-7 text-sm font-medium tracking-[0.12em] text-nyoki-beige uppercase">
              Checkout
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyBasket({ saved }: { saved: number }) {
  return (
    <div className={`rounded-lg border-[1.5px] border-dashed px-6 py-14 text-center ${ui.shopRule}`}>
      <p className="text-xl text-nyoki-ink">Your basket is empty</p>
      <p className={`mt-2 ${ui.shopMuted}`}>Everything is made by hand, a few at a time.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/shop" className="grid h-11 place-items-center rounded-full bg-nyoki-navy px-6 text-sm font-medium tracking-[0.12em] text-nyoki-beige uppercase hover:bg-nyoki-ink">
          Have a look around
        </Link>
        {saved > 0 ? (
          <Link
            href="/account/favourites"
            className="grid h-11 place-items-center rounded-full px-6 text-sm font-medium tracking-[0.12em] text-nyoki-navy uppercase ring-[1.5px] ring-nyoki-navy ring-inset hover:bg-nyoki-accent-beige"
          >
            Your {saved} saved {saved === 1 ? "piece" : "pieces"}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
