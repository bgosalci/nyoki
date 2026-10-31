import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { changeQuantity, putBack, removeLine } from "@/app/(shop)/basket/actions";
import { BasketView } from "@/components/shop/basket-view";
import { currentCustomer } from "@/lib/account/dal";
import { EMPTY_REVIEW, findBasketId, ratesFor, reviewAndSave } from "@/lib/basket/store";
import { db } from "@/lib/db";
import { orderingOpen } from "@/lib/ordering";

export const metadata: Metadata = {
  title: "Your basket",
  robots: { index: false, follow: false },
};

/**
 * The basket, priced afresh each time it is looked at. Whatever changed
 * since a piece went in - a sale ended, stock ran short, a piece came off
 * the shop - is put right and said once, at the top. Delivery is chosen at
 * checkout; here the summary only says how close free delivery is.
 */
export default async function BasketPage() {
  if (!orderingOpen()) notFound();

  const basketId = await findBasketId();
  const [review, shopper] = await Promise.all([basketId ? reviewAndSave(basketId) : EMPTY_REVIEW, currentCustomer()]);
  const { lines, changes, pieces, subtotalPence } = review;
  // Each option priced for the parcel this basket makes.
  const rates = lines.length > 0 ? await ratesFor(lines) : [];
  // An empty basket points to the pieces the shopper has saved, if any.
  const saved =
    lines.length === 0 && shopper ? await db.favourite.count({ where: { customerId: shopper.id, product: { status: "ACTIVE" } } }) : 0;

  return (
    <BasketView
      lines={lines}
      changes={changes}
      pieces={pieces}
      subtotalPence={subtotalPence}
      rates={rates}
      saved={saved}
      changeQuantity={changeQuantity}
      removeLine={removeLine}
      putBack={putBack}
    />
  );
}
