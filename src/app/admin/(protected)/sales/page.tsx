import Link from "next/link";

import { db } from "@/lib/db";
import { formatPence } from "@/lib/money";

function describeDiscount(type: string, value: number): string {
  return type === "PERCENTAGE" ? `${value}% off` : `${formatPence(value)} off`;
}

/** Live right now: switched on and inside its window. */
function isRunning(sale: { active: boolean; startsAt: Date; endsAt: Date | null }, now: Date): boolean {
  if (!sale.active) return false;
  if (sale.startsAt > now) return false;
  return sale.endsAt === null || sale.endsAt > now;
}

const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" });

export default async function SalesPage() {
  const now = new Date();
  const sales = await db.sale.findMany({
    orderBy: [{ active: "desc" }, { startsAt: "desc" }],
    include: { _count: { select: { products: true } } },
  });

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Sales</h1>
        <Link
          href="/admin/sales/new"
          className="rounded-md bg-neutral-900 px-3.5 py-2 text-sm font-medium text-white hover:opacity-90 dark:bg-white dark:text-neutral-900"
        >
          New sale
        </Link>
      </div>

      {sales.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-black/15 p-10 text-center dark:border-white/15">
          <p className="text-sm text-black/60 dark:text-white/60">
            No sales yet. A sale takes a percentage or a fixed amount off any number of products for a period you choose.
          </p>
          <Link href="/admin/sales/new" className="mt-2 inline-block text-sm underline underline-offset-4">
            Create the first one
          </Link>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-2xl border-collapse text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left dark:border-white/10">
                <th className="py-2.5 pr-4 font-medium">Name</th>
                <th className="py-2.5 pr-4 font-medium">Discount</th>
                <th className="py-2.5 pr-4 font-medium">Runs</th>
                <th className="py-2.5 pr-4 text-right font-medium">Products</th>
                <th className="py-2.5 pr-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => {
                const running = isRunning(sale, now);
                return (
                  <tr key={sale.id} className="border-b border-black/5 dark:border-white/5">
                    <td className="py-3 pr-4">
                      <Link href={`/admin/sales/${sale.id}`} className="font-medium underline-offset-4 hover:underline">
                        {sale.name}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 tabular-nums">{describeDiscount(sale.type, sale.value)}</td>
                    <td className="py-3 pr-4 text-black/70 dark:text-white/70">
                      {dateFormat.format(sale.startsAt)}
                      {sale.endsAt ? ` → ${dateFormat.format(sale.endsAt)}` : " → until switched off"}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums">{sale._count.products}</td>
                    <td className="py-3 pr-4">
                      {running ? (
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                          Running
                        </span>
                      ) : sale.active ? (
                        <span className="text-xs text-black/60 dark:text-white/60">
                          {sale.startsAt > now ? "Scheduled" : "Ended"}
                        </span>
                      ) : (
                        <span className="text-xs text-black/60 dark:text-white/60">Paused</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
