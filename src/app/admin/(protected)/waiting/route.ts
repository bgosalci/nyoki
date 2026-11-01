import { NextResponse, type NextRequest } from "next/server";

import type { WaitingSnapshot } from "@/lib/admin/waiting";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";

/**
 * Asked every few seconds by every open admin page: how many questions and
 * reviews wait, how many arrived since the page last asked, and the newest
 * of each - so the page can show the counts, chime and say so. A route
 * handler is not wrapped by the admin layout, so it checks the account
 * itself.
 */
export async function GET(request: NextRequest) {
  await requireAdmin();

  const checkedAt = new Date();
  const asked = request.nextUrl.searchParams.get("since");
  const since = asked ? new Date(asked) : null;
  // Up to the moment of looking: the next ask starts there.
  const range = since && !Number.isNaN(since.getTime()) ? { gt: since, lte: checkedAt } : null;

  const [questionsWaiting, questionsArrived, newestQuestion, reviewsWaiting, reviewsArrived, newestReview] = await Promise.all([
    db.question.count({ where: { answeredAt: null } }),
    range ? db.question.count({ where: { createdAt: range } }) : 0,
    range
      ? db.question.findFirst({ where: { createdAt: range }, orderBy: { createdAt: "desc" }, select: { name: true, productName: true } })
      : null,
    db.review.count({ where: { status: "PENDING" } }),
    // Written or changed: a changed review waits to be read again.
    range ? db.review.count({ where: { submittedAt: range } }) : 0,
    range
      ? db.review.findFirst({
          where: { submittedAt: range },
          orderBy: { submittedAt: "desc" },
          select: { name: true, createdAt: true, submittedAt: true, product: { select: { name: true } } },
        })
      : null,
  ]);

  const body: WaitingSnapshot = {
    questions: { waiting: questionsWaiting, arrived: questionsArrived, newest: questionsArrived > 0 ? newestQuestion : null },
    reviews: {
      waiting: reviewsWaiting,
      arrived: reviewsArrived,
      newest:
        reviewsArrived > 0 && newestReview
          ? {
              name: newestReview.name,
              productName: newestReview.product.name,
              // A new review is written at one moment (writeReview), so its two times are the same.
              changed: newestReview.submittedAt.getTime() !== newestReview.createdAt.getTime(),
            }
          : null,
    },
    checkedAt: checkedAt.toISOString(),
  };
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}
