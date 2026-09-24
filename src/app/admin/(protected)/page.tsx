import Link from "next/link";

import { overviewStats } from "@/lib/admin/overview";
import { ui } from "@/lib/brand/ui";
import { db } from "@/lib/db";

export default async function AdminOverviewPage() {
  const [live, drafts, toFulfil, sales, codes] = await Promise.all([
    db.product.count({ where: { status: "ACTIVE" } }),
    db.product.count({ where: { status: "DRAFT" } }),
    db.order.count({ where: { status: "PAID" } }),
    // Few enough to judge one by one, by the rules the shop and checkout use.
    db.sale.findMany({ select: { active: true, startsAt: true, endsAt: true } }),
    db.discountCode.findMany({ select: { active: true, startsAt: true, endsAt: true, usageLimit: true, usedCount: true } }),
  ]);

  const stats = overviewStats({ live, drafts, toFulfil, sales, codes }, new Date());

  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">Overview</h1>

      <dl className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
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
          </div>
        ))}
      </dl>
    </>
  );
}
