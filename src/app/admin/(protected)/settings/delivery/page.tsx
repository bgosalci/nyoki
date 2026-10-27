import Link from "next/link";

import { BackLink } from "@/components/admin/back-link";
import { PinnedHeight } from "@/components/admin/pinned-height";
import { PINNED_BLOCK_CLASS, Th } from "@/components/admin/th";
import { ui } from "@/lib/brand/ui";
import { db } from "@/lib/db";
import { deliveryDays } from "@/lib/delivery/validate";
import { formatPence } from "@/lib/money";

/** The ways an order can be sent, as checkout offers them: cheapest first. */
export default async function DeliveryPage() {
  const rates = await db.shippingRate.findMany({ orderBy: [{ active: "desc" }, { position: "asc" }, { pricePence: "asc" }] });

  return (
    <>
      <PinnedHeight className={PINNED_BLOCK_CLASS}>
        <BackLink href="/admin/settings">Back to settings</BackLink>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold tracking-tight">Delivery</h1>
          <Link href="/admin/settings/delivery/new" className={`rounded-md px-3.5 py-2 text-sm font-medium ${ui.buttonPrimary}`}>
            New option
          </Link>
        </div>
        <p className={`mt-4 text-sm ${ui.mutedOnPage}`}>
          What shoppers choose from at checkout. UK only for now. Free delivery is judged on the goods after any promo code.
        </p>
      </PinnedHeight>

      {rates.length === 0 ? (
        <div className={`mt-8 rounded-lg border border-dashed p-10 text-center ${ui.ruleOnPage}`}>
          <p className={`text-sm ${ui.mutedOnPage}`}>No delivery options yet, so checkout has nothing to offer. Add the first one.</p>
          <Link href="/admin/settings/delivery/new" className="mt-2 inline-block text-sm underline underline-offset-4">
            Add an option
          </Link>
        </div>
      ) : (
        <div className="mt-4">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <Th>Option</Th>
                <Th align="right">Price</Th>
                <Th>Free</Th>
                <Th>Takes</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {rates.map((rate) => (
                <tr key={rate.id} className={`border-b ${ui.tableRow}`}>
                  <td className="py-3 pr-4">
                    <Link href={`/admin/settings/delivery/${rate.id}`} className="font-medium underline-offset-4 hover:underline">
                      {rate.name}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums">{rate.pricePence === 0 ? "Free" : formatPence(rate.pricePence)}</td>
                  <td className={`py-3 pr-4 tabular-nums ${ui.mutedOnPage}`}>{rate.freeOverPence !== null ? `over ${formatPence(rate.freeOverPence)}` : "Never"}</td>
                  <td className={`py-3 pr-4 ${ui.mutedOnPage}`}>{deliveryDays(rate) ?? "Not said"}</td>
                  <td className="py-3 pr-4">
                    {rate.active ? (
                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">Offered</span>
                    ) : (
                      <span className={`text-xs ${ui.mutedOnPage}`}>Off</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
