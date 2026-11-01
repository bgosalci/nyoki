import type { Metadata } from "next";

import { PolicyLink, PolicyPage, type PolicySection } from "@/components/shop/policy-page";
import { ui } from "@/lib/brand/ui";
import { rateSources } from "@/lib/delivery/store";
import { deliveryOptions, type DeliveryOption } from "@/lib/policies/delivery";

export const metadata: Metadata = {
  title: "Delivery",
  description: "Where Nyoki Handmade delivers, how long it takes, what it costs, and what happens if a parcel goes astray.",
};

/**
 * Delivery, with the ways to send read from the options checkout offers, so
 * the page cannot promise a price checkout does not charge. A parcel is the
 * shop's responsibility until it reaches the shopper or whoever they sent it
 * to (Consumer Rights Act 2015, s.29), so a lost one is ours to replace.
 */
export default async function DeliveryPage() {
  const options = deliveryOptions(await rateSources({ activeOnly: true }));

  return (
    <PolicyPage
      slug="delivery"
      intro={
        <p>
          Every piece is made and packed by hand, here in the UK. Here is how it gets to you: where we send, how long it
          takes, what it costs, and what we do if anything goes wrong on the way.
        </p>
      }
      sections={sections(options)}
    />
  );
}

function sections(options: readonly DeliveryOption[]): PolicySection[] {
  return [
    {
      id: "where",
      heading: "Where we deliver",
      body: (
        <p>
          We send to addresses across the UK - England, Scotland, Wales and Northern Ireland, the Highlands and islands
          included, at the same price - and to the Isle of Man. We can&apos;t yet send to the Channel Islands or abroad.
        </p>
      ),
    },
    {
      id: "options",
      heading: "Ways to send and what they cost",
      body:
        options.length > 0 ? (
          <>
            <p>We send by Royal Mail. Checkout shows what your own order costs to send, before you pay.</p>
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className={`border-b ${ui.shopRule}`}>
                  <th scope="col" className={`py-2 pr-4 font-medium ${ui.shopHeading}`}>
                    Way
                  </th>
                  <th scope="col" className={`py-2 pr-4 font-medium ${ui.shopHeading}`}>
                    Costs
                  </th>
                  <th scope="col" className={`py-2 font-medium ${ui.shopHeading}`}>
                    Takes, once sent
                  </th>
                </tr>
              </thead>
              <tbody>
                {options.map((option) => (
                  <tr key={option.name} className={`border-b align-top ${ui.shopRule}`}>
                    <td className="py-3 pr-4 font-medium text-nyoki-navy">{option.name}</td>
                    <td className="py-3 pr-4">{option.cost}</td>
                    <td className="py-3">{option.time ?? "As checkout says"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>
              Prices on the shop include VAT. Times are Royal Mail&apos;s, in working days - Monday to Friday, bank holidays
              aside - and most parcels arrive within them, though Royal Mail doesn&apos;t guarantee them.
            </p>
          </>
        ) : (
          <p>Checkout shows the ways we can send your order, and what each costs, before you pay.</p>
        ),
    },
    {
      id: "dispatch",
      heading: "When we send it",
      body: (
        <>
          <p>
            Pieces we have ready usually leave us within 3 working days. A personalised piece can take a little longer, up
            to 5 working days, as we make it for you.
          </p>
          <p>
            A piece made to order says on its page how long it takes to make. Your whole order is sent together once
            it&apos;s ready, and checkout says so.
          </p>
          <p>
            Unless we&apos;ve agreed a longer time, we deliver within 30 days of your order. If anything is going to take
            longer than we&apos;ve said, we&apos;ll tell you, and you can cancel for a full refund if you&apos;d rather
            not wait.
          </p>
        </>
      ),
    },
    {
      id: "tracking",
      heading: "Tracking and delivery",
      body: (
        <p>
          With a tracked service, ask us for your tracking number at any time. Royal Mail may put a small parcel through
          your letterbox, leave it with a neighbour or in a safe place, or leave a card telling you where to collect it.
          If you&apos;ve asked Royal Mail to leave your parcels in a safe place or with a neighbour, a parcel left there
          has been delivered.
        </p>
      ),
    },
    {
      id: "gifts",
      heading: "Gifts sent straight to someone",
      body: (
        <p>
          Choose &quot;A gift for someone else&quot; at checkout and we&apos;ll send it straight to the person it&apos;s for, with your
          note in the parcel if you write one. The prices are left off the delivery note unless you ask for them.
        </p>
      ),
    },
    {
      id: "not-arrived",
      heading: "If it hasn't arrived",
      body: (
        <>
          <p>
            A parcel is our responsibility until it reaches you, or the person you sent it to. If yours hasn&apos;t
            arrived within 5 working days of the latest date given, please tell us through our{" "}
            <PolicyLink href="/contact">Contact page</PolicyLink>.
          </p>
          <p>
            We&apos;ll check the tracking and chase Royal Mail. If it&apos;s lost, we&apos;ll send another or refund you
            in full - and you won&apos;t wait on Royal Mail&apos;s claim, which is ours to make.
          </p>
          <p>
            If tracking says it was delivered but you can&apos;t find it, please check your safe place, your neighbours
            and anyone else at home. Then tell us, and we&apos;ll look into it with Royal Mail; we may ask you to confirm
            in writing that it hasn&apos;t arrived.
          </p>
        </>
      ),
    },
    {
      id: "address",
      heading: "Checking your address",
      body: (
        <p>
          Please check the address before you pay. If a parcel goes astray because the address you gave us was wrong or
          incomplete, we can&apos;t be responsible for it, though we&apos;ll help all we can. If it comes back to us,
          we&apos;ll send it again once the postage is paid again, or refund the pieces.
        </p>
      ),
    },
    {
      id: "damaged",
      heading: "Damaged in the post",
      body: (
        <p>
          If something arrives damaged, please tell us as soon as you can, with a photo of the piece and the packaging,
          and we&apos;ll put it right. See <PolicyLink href="/policies/returns#faulty">Faulty, damaged or not as described</PolicyLink>.
        </p>
      ),
    },
    {
      id: "packaging",
      heading: "Our packaging",
      body: <p>Our packaging is biodegradable, and the adhesives we use are water-based and solvent-free.</p>,
    },
  ];
}
