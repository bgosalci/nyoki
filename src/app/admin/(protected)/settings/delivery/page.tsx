import Link from "next/link";

import { markPricesChecked, saveDeliverySettings } from "@/app/admin/(protected)/settings/delivery/actions";
import { BackLink } from "@/components/admin/back-link";
import { DeliverySettingsForm } from "@/components/admin/delivery-settings-form";
import { PinnedHeight } from "@/components/admin/pinned-height";
import { PINNED_BLOCK_CLASS, Th } from "@/components/admin/th";
import { ui } from "@/lib/brand/ui";
import { ROYAL_MAIL_PRICES_FROM } from "@/lib/delivery/royal-mail";
import { deliverySettings, rateSources, unweighedCount } from "@/lib/delivery/store";
import { deliveryDays, freeText, priceRange } from "@/lib/delivery/validate";
import { db } from "@/lib/db";
import { formatOrderDate } from "@/lib/orders/status";

/** The ways an order can be sent, as checkout offers them, and how postage is worked out. */
export default async function DeliveryPage() {
  const [sources, active, settings, unweighed] = await Promise.all([
    rateSources({ activeOnly: false }),
    db.shippingRate.findMany({ where: { active: true }, select: { id: true } }),
    deliverySettings(),
    unweighedCount(),
  ]);
  const offered = new Set(active.map((rate) => rate.id));
  // Offered first, as checkout lists them.
  const rates = [...sources].sort((a, b) => Number(offered.has(b.id)) - Number(offered.has(a.id)));
  const { pricesCheckedOn, ...data } = settings;

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
          What shoppers choose from at checkout, each priced for the parcel in the basket. UK only for now. Free delivery is judged on the goods after any promo code.
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
                <Th>Priced</Th>
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
                  <td className="py-3 pr-4 tabular-nums">{priceRange(rate)}</td>
                  <td className={`py-3 pr-4 tabular-nums ${ui.mutedOnPage}`}>{freeText(rate)}</td>
                  <td className={`py-3 pr-4 ${ui.mutedOnPage}`}>{deliveryDays(rate) ?? "Not said"}</td>
                  <td className="py-3 pr-4">
                    {offered.has(rate.id) ? (
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

      <div className="mt-10">
        <DeliverySettingsForm action={saveDeliverySettings} settings={data} unweighed={unweighed} />
      </div>

      <section aria-labelledby="prices-heading" className={`mt-8 flex max-w-2xl flex-col gap-2 rounded-lg p-4 sm:p-5 ${ui.card}`}>
        <h2 id="prices-heading" className="text-base font-semibold">
          Royal Mail&rsquo;s prices
        </h2>
        <p className="text-sm">
          An option&rsquo;s price list fills in from Royal Mail&rsquo;s online prices from {ROYAL_MAIL_PRICES_FROM}.{" "}
          {pricesCheckedOn ? `Checked against Royal Mail's own on ${formatOrderDate(pricesCheckedOn)}.` : "Not marked as checked yet."}
        </p>
        <p className={`text-sm ${ui.mutedOnPage}`}>
          Royal Mail usually changes its prices in April. When it does, change them in each option&rsquo;s price list, then mark them checked.
        </p>
        <form action={markPricesChecked}>
          <button type="submit" className={`mt-1 rounded-md px-3 py-1.5 text-sm font-medium ${ui.buttonSecondary}`}>
            Mark as checked today
          </button>
        </form>
      </section>
    </>
  );
}
