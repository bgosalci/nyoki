import type { Metadata } from "next";

import { PolicyLink, PolicyList, PolicyPage, type PolicySection } from "@/components/shop/policy-page";
import { HIDDEN_REASONS } from "@/lib/reviews/moderation";

export const metadata: Metadata = {
  title: "Reviews",
  description: "Who can review a piece at Nyoki Handmade, what Verified purchase means, how we check reviews and what we don't publish.",
};

/**
 * How the shop handles reviews. The DMCC Act 2024 (Schedule 20, from 6 April
 * 2025) bans fake reviews, and publishing reviews in a way that misleads -
 * leaving out the unfavourable ones, or passing off a review as a buyer's
 * when it is not - and the CMA's guidance asks a shop that publishes them to
 * say how it checks them. Every reason a review is left out comes from the
 * one list the admin chooses from (`HIDDEN_REASONS`), so the two cannot
 * drift apart.
 */
export default function ReviewsPage() {
  return (
    <PolicyPage
      slug="reviews"
      intro={
        <p>
          Reviews are there to help you choose, so they have to be real. This page says who can write one, what
          Verified purchase means, how we check every review, and the few we don&apos;t publish.
        </p>
      }
      sections={SECTIONS}
    />
  );
}

const SECTIONS: PolicySection[] = [
  {
    id: "who",
    heading: "Who can write one",
    body: (
      <p>
        Anyone with an account with us can review a piece, once: a review is written signed in, so each one comes from a
        real person, and nobody can review the same piece twice. You choose the name shown with it; your email address is
        never shown.
      </p>
    ),
  },
  {
    id: "verified",
    heading: "Verified purchase",
    body: (
      <>
        <p>
          A review marked Verified purchase is from someone who bought the piece from us, signed in to the account that
          wrote the review, and had paid for it by the time they wrote the review or last changed it. We check our own
          orders for this; we don&apos;t take anyone&apos;s word for it.
        </p>
        <p>
          A review without the mark may still be from someone who has the piece - bought as a guest, from another shop
          or as a gift - but we can&apos;t show that it is.
        </p>
      </>
    ),
  },
  {
    id: "checking",
    heading: "How we check them",
    body: (
      <>
        <p>
          We read every review before it goes on the shop, usually within a few working days, and we publish good and bad
          alike. We never change the words of a review, and every review on the shop counts towards a piece&apos;s
          average.
        </p>
        <PolicyList>
          <li>We never pay for reviews, or offer a discount, a gift or anything else in return for one.</li>
          <li>We never ask for only good reviews, or only from shoppers we expect to like a piece.</li>
          <li>We never write reviews ourselves, or ask anyone to write them for us.</li>
        </PolicyList>
      </>
    ),
  },
  {
    id: "not-published",
    heading: "What we don't publish",
    body: (
      <>
        <p>We don&apos;t publish a review, or we take it off the shop, only when it:</p>
        <PolicyList>
          {HIDDEN_REASONS.map((reason, index) => (
            <li key={reason.value}>
              {index === HIDDEN_REASONS.length - 1 ? `or ${reason.says}.` : `${reason.says};`}
            </li>
          ))}
        </PolicyList>
        <p>
          We never leave out a review for being critical, or for the stars it gives. If we don&apos;t publish yours, the
          piece&apos;s page tells you why when you&apos;re signed in, and you can change it and send it again.
        </p>
      </>
    ),
  },
  {
    id: "replies",
    heading: "Our replies",
    body: (
      <p>
        We may reply to a review, to thank you or to answer a problem you&apos;ve raised. A reply is shown beneath the
        review and always marked as ours.
      </p>
    ),
  },
  {
    id: "yours",
    heading: "Changing or deleting yours",
    body: (
      <p>
        Signed in, you&apos;ll find your review on the piece&apos;s page, where you can change it or delete it whenever you
        like. A changed review is read again before it goes back on the shop.
      </p>
    ),
  },
  {
    id: "report",
    heading: "Telling us about a review",
    body: (
      <p>
        If you think a review is fake, offensive, or breaks this policy in any other way, please tell us through our{" "}
        <PolicyLink href="/contact">Contact page</PolicyLink>, naming the piece, and we&apos;ll look at it again.
      </p>
    ),
  },
];
