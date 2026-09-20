import { Th } from "@/components/admin/th";
import { ui } from "@/lib/brand/ui";
import { formatPence } from "@/lib/money";
import { formatOrderDate, orderStatusBadge, orderStatusLabel, type OrderStatus } from "@/lib/orders/status";

export interface OrderRow {
  id: string;
  orderNumber: string;
  placedAt: Date;
  email: string;
  status: OrderStatus;
  itemCount: number;
  totalPence: number;
}

/**
 * The orders list.
 *
 * Nothing here links anywhere yet: an order has no page of its own until
 * there is something to do on it, which arrives with checkout. The columns
 * are the ones needed to pack and post - what was bought, by whom, and
 * whether it has gone.
 */
export function OrderTable({ rows }: { rows: OrderRow[] }) {
  return (
    <div className="mt-4">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <Th>Order</Th>
            <Th>Placed</Th>
            <Th>Customer</Th>
            <Th>Status</Th>
            <Th align="right">Items</Th>
            <Th align="right">Total</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className={`border-b ${ui.tableRow}`}>
              <td className="py-3 pr-4 font-medium tabular-nums">{row.orderNumber}</td>
              <td className={`py-3 pr-4 ${ui.mutedOnPage}`}>{formatOrderDate(row.placedAt)}</td>
              <td className="py-3 pr-4">{row.email}</td>
              <td className="py-3 pr-4">
                <span className={`inline-block rounded-[3px] px-2 py-0.5 text-xs ${orderStatusBadge(row.status)}`}>
                  {orderStatusLabel(row.status)}
                </span>
              </td>
              <td className="py-3 pr-4 text-right tabular-nums">{row.itemCount}</td>
              <td className="py-3 pr-4 text-right tabular-nums">{formatPence(row.totalPence)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
