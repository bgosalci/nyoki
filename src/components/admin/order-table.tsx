import Link from "next/link";

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
 * The orders list. Each opens from its number, onto what to make and where
 * it goes. The columns are the ones needed to pack and post - what was
 * bought, by whom, and whether it has gone.
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
              <td className="py-3 pr-4 font-medium tabular-nums">
                <Link href={`/admin/orders/${row.orderNumber}`} className="underline-offset-4 hover:underline">
                  {row.orderNumber}
                </Link>
              </td>
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
