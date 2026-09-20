import type { Metadata } from "next";
import Link from "next/link";

import { requireCustomer } from "@/lib/account/dal";
import { ui } from "@/lib/brand/ui";
import { db } from "@/lib/db";
import { formatPence } from "@/lib/money";
import { customerOrderStatusLabel, formatOrderDate } from "@/lib/orders/status";

export const metadata: Metadata = {
  title: "Your orders",
  robots: { index: false, follow: false },
};

export default async function AccountOrdersPage() {
  const shopper = await requireCustomer();

  const orders = await db.order.findMany({
    where: { customerId: shopper.id },
    orderBy: { createdAt: "desc" },
    include: { items: { select: { id: true, productName: true, quantity: true, totalPence: true } } },
  });

  return (
    <div className="mx-auto max-w-shop px-4 py-12 sm:px-6">
      <Link href="/account" className={`text-sm underline underline-offset-4 ${ui.shopMuted}`}>
        Back to your account
      </Link>

      <h1 className={`mt-4 text-3xl tracking-tight ${ui.shopHeading}`}>Your orders</h1>

      {orders.length === 0 ? (
        <div className={`mt-8 rounded-lg border border-dashed p-10 text-center ${ui.shopRule}`}>
          <p className={`text-sm ${ui.shopMuted}`}>
            Nothing here yet. Ordering is the last piece still being built - when it opens, everything you buy will
            be listed here.
          </p>
          <Link href="/shop" className="mt-3 inline-block text-sm underline underline-offset-4">
            Have a look around
          </Link>
        </div>
      ) : (
        <ul className="mt-8 flex flex-col gap-4">
          {orders.map((order) => (
            <li key={order.id} className={`p-5 ${ui.shopCard}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <p className={`font-medium ${ui.shopHeading}`}>{order.orderNumber}</p>
                <p className={`text-sm ${ui.shopMuted}`}>{formatOrderDate(order.createdAt)}</p>
              </div>

              <p className="mt-1 text-sm">
                {customerOrderStatusLabel(order.status)} · {formatPence(order.totalPence)}
              </p>

              <ul className={`mt-3 flex flex-col gap-1 text-sm ${ui.shopMuted}`}>
                {order.items.map((item) => (
                  <li key={item.id}>
                    {item.quantity} × {item.productName} · {formatPence(item.totalPence)}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
