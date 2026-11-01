import Link from "next/link";

import { deleteReview, hideReview, publishReview, saveReply } from "@/app/admin/(protected)/reviews/actions";
import { AlertSoundToggle } from "@/components/admin/admin-alerts";
import { PinnedHeight } from "@/components/admin/pinned-height";
import { ReviewModerationList, type ModerationRow } from "@/components/admin/review-list";
import { PINNED_BLOCK_CLASS } from "@/components/admin/th";
import { requireAdmin } from "@/lib/auth/dal";
import { ui } from "@/lib/brand/ui";
import { db } from "@/lib/db";

/** Published and kept-off reviews pile up; the page keeps to the most recent of each. */
const RECENT = 100;

const SELECT = {
  id: true,
  rating: true,
  body: true,
  name: true,
  verifiedOrderNumber: true,
  status: true,
  hiddenReason: true,
  reply: true,
  submittedAt: true,
  moderatedAt: true,
  customer: { select: { email: true } },
  product: { select: { id: true, name: true } },
} as const;

type Row = { customer: { email: string }; product: { id: string; name: string } } & Omit<ModerationRow, "email" | "productId" | "productName">;

const toRow = ({ customer, product, ...review }: Row): ModerationRow => ({
  ...review,
  email: customer.email,
  productId: product.id,
  productName: product.name,
});

export default async function ReviewsPage() {
  // Checked here as well as in the admin layout, which moving between
  // admin pages does not render again.
  await requireAdmin();

  const [waiting, published, hidden, publishedCount, hiddenCount] = await Promise.all([
    // Oldest first: the first written is the first to be read.
    db.review.findMany({ where: { status: "PENDING" }, orderBy: { submittedAt: "asc" }, select: SELECT }),
    db.review.findMany({ where: { status: "PUBLISHED" }, orderBy: { moderatedAt: "desc" }, take: RECENT, select: SELECT }),
    db.review.findMany({ where: { status: "HIDDEN" }, orderBy: { moderatedAt: "desc" }, take: RECENT, select: SELECT }),
    db.review.count({ where: { status: "PUBLISHED" } }),
    db.review.count({ where: { status: "HIDDEN" } }),
  ]);

  const actions = { publish: publishReview, hide: hideReview, saveReply, remove: deleteReview };
  const recent = (count: number) => (count > RECENT ? `, the most recent ${RECENT}` : null);

  return (
    <>
      <PinnedHeight className={PINNED_BLOCK_CLASS}>
        <h1 className="text-xl font-semibold tracking-tight">Reviews</h1>
        <p className={`mt-4 max-w-prose text-sm ${ui.mutedOnPage}`}>
          {waiting.length} to read · {publishedCount} published · {hiddenCount} not published. A review goes on its
          piece&apos;s page only once it is published here. Publish the critical ones as readily as the glowing: a review
          is kept off the shop only for one of the reasons in the{" "}
          <Link href="/policies/reviews" className={ui.link}>
            reviews policy
          </Link>
          , and the law forbids leaving out the bad ones. A reply goes beneath the review on the shop.
        </p>
        <div className="mt-3">
          <AlertSoundToggle />
        </div>
      </PinnedHeight>

      {waiting.length === 0 && published.length === 0 && hidden.length === 0 ? (
        <div className={`mt-8 rounded-lg border border-dashed p-10 text-center ${ui.ruleOnPage}`}>
          <p className={`text-sm ${ui.mutedOnPage}`}>
            No reviews yet. Shoppers write them on each piece&apos;s page, signed in to their account.
          </p>
        </div>
      ) : (
        <div className="mt-6 flex max-w-3xl flex-col gap-10">
          <section aria-labelledby="reviews-waiting" className="flex flex-col gap-3">
            <h2 id="reviews-waiting" className="text-sm font-semibold">
              To read
            </h2>
            {waiting.length > 0 ? (
              <ReviewModerationList reviews={waiting.map(toRow)} {...actions} />
            ) : (
              <p className={`text-sm ${ui.mutedOnPage}`}>Nothing to read. Every review has been published or kept off.</p>
            )}
          </section>

          {published.length > 0 ? (
            <section aria-labelledby="reviews-published" className="flex flex-col gap-3">
              <h2 id="reviews-published" className="text-sm font-semibold">
                Published{recent(publishedCount)}
              </h2>
              <ReviewModerationList reviews={published.map(toRow)} {...actions} />
            </section>
          ) : null}

          {hidden.length > 0 ? (
            <section aria-labelledby="reviews-hidden" className="flex flex-col gap-3">
              <h2 id="reviews-hidden" className="text-sm font-semibold">
                Not published{recent(hiddenCount)}
              </h2>
              <ReviewModerationList reviews={hidden.map(toRow)} {...actions} />
            </section>
          ) : null}
        </div>
      )}
    </>
  );
}
