import { ui } from "@/lib/brand/ui";
import { db } from "@/lib/db";

export default async function AdminOverviewPage() {
  const [products, drafts, orders, activeSales] = await Promise.all([
    db.product.count({ where: { status: "ACTIVE" } }),
    db.product.count({ where: { status: "DRAFT" } }),
    db.order.count({ where: { status: "PAID" } }),
    db.sale.count({ where: { active: true } }),
  ]);

  const stats = [
    { label: "Live products", value: products },
    { label: "Drafts", value: drafts },
    { label: "Orders to fulfil", value: orders },
    { label: "Running sales", value: activeSales },
  ];

  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">Overview</h1>

      <dl className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`rounded-lg border p-4 ${ui.card} ${ui.rule}`}
          >
            <dt className={`text-sm ${ui.mutedOnPanel}`}>
              {stat.label}
            </dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>
    </>
  );
}
