import type { Metadata } from "next";

import { PolicyLink, PolicyList, PolicyPage, type PolicySection } from "@/components/shop/policy-page";
import { BUSINESS, addressLine, legalLine, registeredOfficeLine } from "@/lib/policies/business";

export const metadata: Metadata = {
  title: "Terms and conditions",
  description: "The terms on which Nyoki Handmade sells: ordering, prices, handmade and personalised pieces, and your rights.",
};

/**
 * The terms of sale, written to the CMA's guidance on unfair terms (2026
 * edition): no blanket disclaimers, no cap on liability, the shopper's own
 * courts kept. What protects the shop is what the law lets a seller say - an
 * obvious price mistake, handmade variation described up front, words for
 * printing that are the shopper's to check, delays a very small team cannot
 * help - each with a full refund where the shopper loses out.
 */
export default function TermsPage() {
  return (
    <PolicyPage
      slug="terms"
      intro={
        <>
          <p>
            These are the terms on which we sell to you when you order from nyoki.co.uk. We&apos;ve kept them as plain as
            we can. They don&apos;t take away any of your legal rights.
          </p>
          <p>
            They work alongside our <PolicyLink href="/policies/delivery">Delivery</PolicyLink> and{" "}
            <PolicyLink href="/policies/returns">Returns and refunds</PolicyLink> policies, which are part of them.
          </p>
        </>
      }
      sections={SECTIONS}
    />
  );
}

const SECTIONS: PolicySection[] = [
  {
    id: "about-us",
    heading: "About us",
    body: (
      <>
        <p>
          {legalLine(BUSINESS)} {registeredOfficeLine(BUSINESS)}
        </p>
        <p>
          &quot;We&quot; and &quot;us&quot; mean {BUSINESS.legalName}. To reach us, use our{" "}
          <PolicyLink href="/contact">Contact page</PolicyLink>
          {BUSINESS.email ? (
            <>
              {" "}
              or email <PolicyLink href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</PolicyLink>
            </>
          ) : null}
          {BUSINESS.address ? <>, or write to us at {addressLine(BUSINESS.address)}</> : null}.
        </p>
      </>
    ),
  },
  {
    id: "ordering",
    heading: "Ordering from us",
    body: (
      <>
        <p>
          To order you must be 18 or over, buying for yourself or as a gift rather than to sell on, and sending to an
          address we deliver to.
        </p>
        <p>
          Choose a piece and anything it offers, add it to your basket and go to checkout. There you tell us who you are,
          who it&apos;s for, where it goes and how it&apos;s sent. Before you pay you&apos;ll see the whole order and
          its total once more, and you can go back and change anything until then. Orders are taken in English.
        </p>
        <p>
          The contract between us is made when we confirm your order, which we do once your payment has gone through.
          We&apos;ll confirm it in writing by the time it reaches you at the latest, and keep a record of it; with an
          account, you&apos;ll find your orders there.
        </p>
        <p>
          Each piece is made in small numbers, and very occasionally one sells out in the moment you order it. If that
          happens we&apos;ll tell you and refund it in full, or offer to make another if we can.
        </p>
        <p>
          If there&apos;s an obvious mistake in a price - one you could reasonably have spotted - we&apos;ll tell you
          before sending, and you can have the piece at the right price or cancel for a full refund. We may also cancel
          an order, refunding it in full, if we believe it to be fraudulent.
        </p>
      </>
    ),
  },
  {
    id: "prices",
    heading: "Prices and payment",
    body: (
      <>
        <p>
          Prices are in pounds and include VAT. What delivery costs is shown at checkout before you pay; see{" "}
          <PolicyLink href="/policies/delivery">Delivery</PolicyLink>.
        </p>
        <p>
          We take payment by card when you order. Card payments are handled by Stripe: we never see or keep your card
          number.
        </p>
        <PolicyList>
          <li>A promo code comes off the pieces at the prices they sell at, a sale price included, and not off delivery. One code to an order; a code has no cash value and can&apos;t be added once an order is placed.</li>
          <li>Sales don&apos;t add together. Where more than one could apply to a piece, you get the single best one.</li>
        </PolicyList>
      </>
    ),
  },
  {
    id: "handmade",
    heading: "Handmade pieces",
    body: (
      <>
        <p>
          Every piece is made by hand, so no two are exactly alike. Colours, sizes, stitches and where a pattern falls can
          differ a little from the photos and from one piece to the next, and every screen shows colours slightly
          differently. Measurements are as close as we can make them.
        </p>
        <p>
          A small difference like this is part of its character, not a fault. A piece that is noticeably different from
          its description is - see <PolicyLink href="/policies/returns#faulty">Returns and refunds</PolicyLink>.
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
          We print exactly what you type, or make exactly what you choose - spelling, capitals and punctuation included -
          so please check it carefully before you order. We don&apos;t correct it, in case what looks like a mistake is
          meant.
        </p>
        <p>
          We may refuse words that are offensive, abusive or unlawful, or that use names, characters, logos or lyrics
          belonging to someone else. If we do, we&apos;ll tell you and refund you in full.
        </p>
        <p>
          By giving us words or names, you confirm we may use them to make your piece; we use them for nothing else. A
          personalised piece can&apos;t be returned for a change of mind, only if something is wrong with it - see{" "}
          <PolicyLink href="/policies/returns#personalised">Personalised pieces</PolicyLink>.
        </p>
      </>
    ),
  },
  {
    id: "delivery",
    heading: "Delivery",
    body: (
      <p>
        Our <PolicyLink href="/policies/delivery">Delivery</PolicyLink> policy says where we send, how long it takes and
        what it costs. A piece is our responsibility until it reaches you, or the person you sent it to. It&apos;s yours
        once it has been delivered and we have been paid in full.
      </p>
    ),
  },
  {
    id: "cancelling",
    heading: "Changing your mind",
    body: (
      <p>
        You have 14 days from delivery to cancel most orders; personalised pieces are the exception. Our{" "}
        <PolicyLink href="/policies/returns">Returns and refunds</PolicyLink> policy explains how, and how you are
        refunded.
      </p>
    ),
  },
  {
    id: "faults",
    heading: "If something is wrong",
    body: (
      <p>
        We are under a legal duty to supply pieces that are as described, of satisfactory quality and fit for their
        purpose. If one isn&apos;t, our <PolicyLink href="/policies/returns#faulty">Returns and refunds</PolicyLink>{" "}
        policy sets out your rights and how we put it right.
      </p>
    ),
  },
  {
    id: "liability",
    heading: "Our responsibility to you",
    body: (
      <>
        <p>
          If we break these terms or fail to take reasonable care, we are responsible for loss or damage you suffer that
          is a foreseeable result. Loss is foreseeable if it was obvious it would happen, or if we both knew it might when
          the contract was made. We are not responsible for loss that wasn&apos;t foreseeable.
        </p>
        <p>
          We sell for your own and your family&apos;s use, and to give as gifts. We aren&apos;t responsible for business
          losses, such as lost profit or a lost opportunity.
        </p>
        <p>
          Nothing in these terms limits our responsibility for death or personal injury caused by our negligence, for
          fraud, or for anything else the law doesn&apos;t allow us to limit - including your legal rights as a consumer.
        </p>
      </>
    ),
  },
  {
    id: "outside-control",
    heading: "Things outside our control",
    body: (
      <p>
        We&apos;re a very small team. If something outside our control - illness, a postal strike, severe weather -
        delays your order, we&apos;ll tell you as soon as we can and do what we can to keep the delay short. If it turns
        into a long one, you can cancel it for a full refund.
      </p>
    ),
  },
  {
    id: "care",
    heading: "Looking after your pieces",
    body: (
      <p>
        Please follow the care label. Hair clips, slides, brooches, key chains and other small accessories have small
        parts a young child could choke on: they aren&apos;t for children under 3, and a child wearing one should be
        watched.
      </p>
    ),
  },
  {
    id: "website",
    heading: "Our website and designs",
    body: (
      <>
        <p>
          The designs, photographs, words and logo on this site are ours. You&apos;re welcome to share a link, or a photo
          with a credit to us, but please don&apos;t copy our designs or use our photos to sell anything.
        </p>
        <p>
          If you open an account, keep your password to yourself. We may close an account used dishonestly or to abuse
          others. You can ask us to close yours at any time.
        </p>
      </>
    ),
  },
  {
    id: "complaints",
    heading: "Complaints and the law",
    body: (
      <>
        <p>
          If something isn&apos;t right, please tell us first, through our <PolicyLink href="/contact">Contact page</PolicyLink>.
          We aim to reply within 3 working days, and we&apos;d much rather put it right. For free, independent advice,
          you can also contact <PolicyLink href="https://www.citizensadvice.org.uk/consumer/">Citizens Advice</PolicyLink>.
        </p>
        <p>
          These terms are under the laws of England and Wales. If you live in Scotland or Northern Ireland, you can also
          bring proceedings in your own courts.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    heading: "Changes and the small print",
    body: (
      <PolicyList>
        <li>We may change these terms from time to time. The terms on this page when you order are the ones that apply to that order.</li>
        <li>If a court finds part of these terms can&apos;t be enforced, the rest still applies.</li>
        <li>The contract is between you and us, and nobody else has rights under it - except that someone you sent a gift to may return it, as our Returns and refunds policy explains.</li>
        <li>We may pass our rights under it to another business. We&apos;ll tell you if we do, and you&apos;ll keep all your rights.</li>
      </PolicyList>
    ),
  },
];
