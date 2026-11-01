import type { Metadata } from "next";

import { PolicyLink, PolicyList, PolicyPage, type PolicySection } from "@/components/shop/policy-page";
import { ui } from "@/lib/brand/ui";
import { BUSINESS, addressLine } from "@/lib/policies/business";

export const metadata: Metadata = {
  title: "Returns and refunds",
  description:
    "Changing your mind, personalised pieces, faulty pieces and refunds at Nyoki Handmade: your rights, and how we put things right.",
};

/**
 * Returns, as the Consumer Contracts Regulations 2013 and the Consumer
 * Rights Act 2015 have them, kept to what a small maker can honour: the
 * legal 14 days, the shopper paying for a change-of-mind return, delivery
 * refunded up to the least expensive way. Personalised pieces are exempt
 * from cancelling (reg 28(1)(b)); a piece made to order exactly as shown is
 * not, and the page says so rather than let "made to order" read as "no
 * returns".
 */
export default function ReturnsPage() {
  return (
    <PolicyPage
      slug="returns"
      intro={
        <>
          <p>
            We&apos;re a small family business and every piece is made by hand, so we look after each order closely. If
            something isn&apos;t right, tell us and we&apos;ll put it right.
          </p>
          <p>
            This page sets out your rights when you buy from nyoki.co.uk, and how returns work. Nothing here takes away
            your legal rights.
          </p>
        </>
      }
      sections={SECTIONS}
    />
  );
}

const writeTo = BUSINESS.email ? (
  <>
    email us at <PolicyLink href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</PolicyLink> or write through our{" "}
    <PolicyLink href="/contact">Contact page</PolicyLink>
  </>
) : (
  <>
    write to us through our <PolicyLink href="/contact">Contact page</PolicyLink>
  </>
);

const SECTIONS: PolicySection[] = [
  {
    id: "changing-your-mind",
    heading: "Changing your mind",
    body: (
      <>
        <p>
          You can cancel your order for any reason, without giving one, within 14 days, starting the day after it
          arrives - with you, or with the person you sent it to. If an order comes in more than one parcel, the 14 days
          start the day after the last one arrives. You can also cancel at any time before it arrives.
        </p>
        <p>
          To cancel, {writeTo}, with your order number (it starts NYK-). A clear message is all we need; you can use the{" "}
          <PolicyLink href="#cancellation-form">cancellation form</PolicyLink> below if you like, but you don&apos;t
          have to.
        </p>
        <p>Then send it back within 14 days of telling us.</p>
        <p>
          Pieces in a sale can be returned just as any other. The one exception is a personalised piece, which comes
          next.
        </p>
      </>
    ),
  },
  {
    id: "personalised",
    heading: "Personalised pieces",
    body: (
      <>
        <p>
          A piece personalised for you - a card with your own message printed inside, or a name, initials or anything
          else you chose for it - can&apos;t be returned because you&apos;ve changed your mind. We made it for you, and
          we can&apos;t sell it to anyone else. The law allows this, and we say so on the piece before you buy it.
        </p>
        <p>
          This doesn&apos;t touch your rights if it arrives faulty, damaged or different from what you ordered,
          including a mistake of ours in the words - see{" "}
          <PolicyLink href="#faulty">Faulty, damaged or not as described</PolicyLink>.
        </p>
        <p>
          Some pieces are made to order: we make them once you&apos;ve ordered. A piece made to order in a size, colour
          or pack we offer, exactly as it is on the shop, is not personalised, and it can be returned like anything
          else.
        </p>
        <p>
          If you change your mind about a personalised piece, tell us as soon as you can: if we haven&apos;t started
          making it, we&apos;ll cancel it and refund you in full.
        </p>
      </>
    ),
  },
  {
    id: "sending-it-back",
    heading: "Sending it back",
    body: (
      <>
        <p>
          Unless the piece is faulty or not what you ordered, you pay for sending it back. We suggest a tracked service,
          and please keep your proof of postage: it&apos;s what shows you sent it if the parcel goes astray.
        </p>
        <p>
          {BUSINESS.address ? (
            <>
              Send it to {BUSINESS.legalName}, {addressLine(BUSINESS.address)}, with a note of your order number.
            </>
          ) : (
            <>When you tell us you&apos;re returning something, we&apos;ll give you the address to send it to.</>
          )}{" "}
          Pack it well, so it reaches us as it left us.
        </p>
        <p>
          You&apos;re welcome to look a piece over as you would in a shop: try clothes on, open the packaging. Please
          send clothes back unworn and unwashed, with any labels still on, and cards unwritten. If a piece has been used
          or handled more than that, we may take something off the refund for the value it has lost. We won&apos;t
          refuse the return.
        </p>
      </>
    ),
  },
  {
    id: "refunds",
    heading: "Your refund",
    body: (
      <>
        <p>We refund the price of what you send back, and what you paid for delivery - up to the cost of the least expensive delivery we offer. Royal Mail Tracked 48 is free, so if you chose a faster way, the extra isn&apos;t refunded. Delivery is refunded when the whole order comes back; for part of an order, we refund the pieces returned.</p>
        <p>
          We refund within 14 days of the piece reaching us, or of your proof of postage if that comes first. If you
          cancel before we&apos;ve sent your order, we refund within 14 days of you telling us. In practice it&apos;s
          usually much sooner.
        </p>
        <p>Refunds go back to the card you paid with, at no charge. The cost of sending a piece back isn&apos;t refunded, unless it was faulty or not what you ordered.</p>
      </>
    ),
  },
  {
    id: "faulty",
    heading: "Faulty, damaged or not as described",
    body: (
      <>
        <p>
          Under the Consumer Rights Act 2015, everything we sell must be of satisfactory quality, fit for its purpose and
          as described. If it isn&apos;t, this applies to every piece, personalised ones included:
        </p>
        <PolicyList>
          <li>within 30 days of it arriving, you can return it for a full refund;</li>
          <li>after 30 days, we&apos;ll repair or replace it; if we can&apos;t, or that doesn&apos;t put it right, you can have a refund or a lower price;</li>
          <li>a fault that shows within six months is taken to have been there when it arrived, unless we can show otherwise;</li>
          <li>after that, you can still claim for a piece that hasn&apos;t lasted as long as it reasonably should, for up to six years (five in Scotland).</li>
        </PolicyList>
        <p>
          If something arrives damaged, please tell us as soon as you can, with a photo of the piece and of the
          packaging. It helps us put it right quickly and claim from Royal Mail. Asking this doesn&apos;t shorten your
          legal rights. For something small, we may simply send a new one without asking for the old one back.
        </p>
        <p>
          When a piece is faulty, we pay to send it back: we&apos;ll send you a label, or refund what it cost you.
        </p>
        <p>
          The small differences that come from making by hand are not faults - see{" "}
          <PolicyLink href="/policies/terms#handmade">Handmade pieces</PolicyLink> - and neither is wear and tear, an
          accident, or washing against the care label.
        </p>
      </>
    ),
  },
  {
    id: "printed-words",
    heading: "Mistakes in printed words",
    body: (
      <>
        <p>
          We print exactly what you type, spelling, capitals and punctuation included, so please check it before you
          order. We don&apos;t correct it, in case what looks like a mistake is meant.
        </p>
        <p>
          If what we print differs from what you typed, that&apos;s our mistake: we&apos;ll remake it free or refund you
          in full, and you won&apos;t need to send it back. A mistake in what was typed isn&apos;t one we can take back,
          as the piece was made exactly as asked.
        </p>
      </>
    ),
  },
  {
    id: "gifts",
    heading: "Gifts",
    body: (
      <p>
        A gift we sent straight to someone can be returned by them, within the same 14 days from when it reached them. The
        refund goes to the person who paid, to the card they paid with, and we&apos;ll let them know. A personalised gift
        can be returned only if it&apos;s faulty, as above.
      </p>
    ),
  },
  {
    id: "exchanges",
    heading: "Swapping for another size or colour",
    body: (
      <p>
        Most pieces are made in small numbers, so we can&apos;t promise a swap. Ask us first: if we have the size or
        colour you want, we&apos;ll gladly send it once yours is back with us. If not, return it for a refund and order
        the one you want.
      </p>
    ),
  },
  {
    id: "elsewhere",
    heading: "Bought from us somewhere else",
    body: (
      <p>
        This page covers orders from nyoki.co.uk. If you bought from us on Not On The High Street, its own returns
        policy applies: please contact us through your account there.
      </p>
    ),
  },
  {
    id: "cancellation-form",
    heading: "Cancellation form",
    body: (
      <>
        <p>
          You don&apos;t need this to cancel - any clear message will do - but here is the form the law provides, if
          you&apos;d like to use it. Copy it into an email or a letter.
        </p>
        <div className={`flex flex-col gap-2 rounded-md border bg-nyoki-white px-5 py-4 text-sm ${ui.shopRule}`}>
          <p>
            To: {BUSINESS.legalName}, trading as {BUSINESS.tradingName}
            {BUSINESS.address ? `, ${addressLine(BUSINESS.address)}` : ""}
            {BUSINESS.email ? `, ${BUSINESS.email}` : ""}
          </p>
          <p>I hereby give notice that I cancel my contract of sale of the following goods:</p>
          <p>Order number:</p>
          <p>Ordered on / received on:</p>
          <p>Your name:</p>
          <p>Your address:</p>
          <p>Your signature (only if sending this on paper):</p>
          <p>Date:</p>
        </div>
      </>
    ),
  },
];
