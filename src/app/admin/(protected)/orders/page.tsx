import { OrderTable } from "@/components/admin/order-table";
import { PinnedHeight } from "@/components/admin/pinned-height";
import { PINNED_BLOCK_CLASS } from "@/components/admin/th";
import { ui } from "@/lib/brand/ui";
import { db } from "@/lib/db";
import { isAwaitingFulfilment } from "@/lib/orders/status";

/**
 * Orders grow without limit where the catalogue does not, so the page shows
 * the most recent and says so rather than fetching every order ever placed.
 */
const RECENT = 200;

export default async function OrdersPage() {
  const [orders, total] = await Promise.all([
    db.order.findMany({
      orderBy: { createdAt: "desc" },
      take: RECENT,
      include: { items: { select: { quantity: true } } },
    }),
    db.order.count(),
  ]);

  const rows = orders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    placedAt: order.createdAt,
    email: order.email,
    status: order.status,
    // Pieces to pack, not lines on the order: two of one card is two things.
    itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    totalPence: order.totalPence,
  }));

  const toSend = rows.filter((row) => isAwaitingFulfilment(row.status)).length;

  return (
    <>
      <PinnedHeight className={PINNED_BLOCK_CLASS}>
        <h1 className="text-xl font-semibold tracking-tight">Orders</h1>

        {total > 0 ? (
          <p className={`mt-4 text-sm ${ui.mutedOnPage}`}>
            {toSend > 0 ? `${toSend} to send · ` : null}
            {total} {total === 1 ? "order" : "orders"}
            {total > RECENT ? `, showing the most recent ${RECENT}` : null}
          </p>
        ) : null}
      </PinnedHeight>

      {rows.length === 0 ? (
        <div className={`mt-8 rounded-lg border border-dashed p-10 text-center ${ui.ruleOnPage}`}>
          <p className={`text-sm ${ui.mutedOnPage}`}>
            No orders yet. They will appear here the moment the shop can take one - checkout is the last piece still
            to build.
          </p>
        </div>
      ) : (
        <OrderTable rows={rows} />
      )}
    </>
  );
}
