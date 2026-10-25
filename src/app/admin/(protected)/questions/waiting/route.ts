import { NextResponse, type NextRequest } from "next/server";

import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import type { WaitingSnapshot } from "@/lib/questions/alerts";

/**
 * Asked every few seconds by every open admin page: how many questions wait,
 * how many arrived since the page last asked, and who sent the newest - so the
 * page can show the count, chime and say so. A route handler is not wrapped by
 * the admin layout, so it checks the account itself.
 */
export async function GET(request: NextRequest) {
  await requireAdmin();

  const checkedAt = new Date();
  const asked = request.nextUrl.searchParams.get("since");
  const since = asked ? new Date(asked) : null;
  // Up to the moment of looking: the next ask starts there.
  const range = since && !Number.isNaN(since.getTime()) ? { gt: since, lte: checkedAt } : null;

  const [waiting, arrived, newest] = await Promise.all([
    db.question.count({ where: { answeredAt: null } }),
    range ? db.question.count({ where: { createdAt: range } }) : 0,
    range
      ? db.question.findFirst({ where: { createdAt: range }, orderBy: { createdAt: "desc" }, select: { name: true, productName: true } })
      : null,
  ]);

  const body: WaitingSnapshot = { waiting, arrived, newest: arrived > 0 ? newest : null, checkedAt: checkedAt.toISOString() };
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}
