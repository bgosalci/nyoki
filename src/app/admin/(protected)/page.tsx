import Link from "next/link";

import { overviewStats } from "@/lib/admin/overview";
import { requireAdmin } from "@/lib/auth/dal";
import { ui } from "@/lib/brand/ui";
import { db } from "@/lib/db";

export default async function AdminOverviewPage() {
  // Checked here as well as in the admin layout, which moving between
  // admin pages does not render again.
  await requireAdmin();

  const [live, drafts, toFulfil, questions, sales, codes] = await Promise.all([
    db.product.count({ where: { status: "ACTIVE" } }),
    db.product.count({ where: { status: "DRAFT" } }),
    db.order.count({ where: { status: "PAID" } }),
    db.question.count({ where: { answeredAt: null } }),
    // Few enough to judge one by one, by the rules the shop and checkout use.
    db.sale.findMany({ select: { active: true, startsAt: true, endsAt: true } }),
    db.discountCode.findMany({ select: { active: true, startsAt: true, endsAt: true, usageLimit: true, usedCount: true } }),
  ]);

  const stats = overviewStats({ live, drafts, toFulfil, questions, sales, codes }, new Date());

  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">Overview</h1>

      <dl className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat) => (
          // The label is the link, stretched over the card, so the whole card
          // opens the page behind the figure while the list stays a list.
          <div key={stat.label} className={`relative rounded-lg border p-4 hover:border-current ${ui.card} ${ui.rule}`}>
            <dt className={`text-sm ${ui.mutedOnPanel}`}>
              <Link href={stat.href} className="after:absolute after:inset-0">
                {stat.label}
              </Link>
            </dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{stat.value}</dd>
            {stat.detail ? <dd className={`mt-1 text-xs ${ui.mutedOnPanel}`}>{stat.detail}</dd> : null}
          </div>
        ))}
      </dl>
    </>
  );
}
