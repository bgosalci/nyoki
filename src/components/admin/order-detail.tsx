import { CopyButton } from "@/components/admin/copy-button";
import { ProductThumbnail } from "@/components/admin/product-thumbnail";
import { ui } from "@/lib/brand/ui";
import { printedWords } from "@/lib/checkout/order";
import type { SummaryRow } from "@/lib/customisation/choices";
import { SIZE_NAMES, type ParcelSize } from "@/lib/delivery/royal-mail";
import { formatPence } from "@/lib/money";
import { formatDateTime, orderStatusBadge, orderStatusLabel, type OrderStatus } from "@/lib/orders/status";

export interface OrderView {
  orderNumber: string;
  status: OrderStatus;
  placedAt: Date;
  email: string;
  phone: string | null;
  /** Ordered without an account. */
  guest: boolean;
  gift: boolean;
  giftNote: string | null;
  hidePrices: boolean;
  shippingMethod: string | null;
  /** The parcel checkout priced: its size, its weight packed, and a letter's thickness. */
  parcel: { size: ParcelSize; grams: number; mm: number | null } | null;
  address: { name: string; line1: string; line2: string | null; city: string; county: string | null; postcode: string } | null;
  items: {
    id: string;
    name: string;
    variantName: string | null;
    sku: string | null;
    imageUrl: string | null;
    quantity: number;
    unitPence: number;
    totalPence: number;
    details: SummaryRow[];
  }[];
  subtotalPence: number;
  discountPence: number;
  codeName: string | null;
  shippingPence: number;
  totalPence: number;
  taxPence: number;
}

const QUOTE = "mt-2 flex items-start justify-between gap-3 rounded-md border px-3 py-2.5";

/**
 * One order, as Njomza works from it: what to make first - the words to
 * print in full, with Copy, then the names, colour and size - and then where
 * it goes, whether it is a gift, and who ordered it. Read only: marking it
 * sent comes with payment, since only a paid order is waiting on her.
 */
export function OrderDetail({ order }: { order: OrderView }) {
  const address = order.address;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold tracking-tight tabular-nums">{order.orderNumber}</h1>
        <span className={`rounded-[3px] px-2 py-0.5 text-xs ${orderStatusBadge(order.status)}`}>{orderStatusLabel(order.status)}</span>
        {order.gift ? <span className={`rounded-[3px] px-2 py-0.5 text-xs ${ui.badgeDark}`}>Gift</span> : null}
      </div>
      <p className={`mt-1 text-sm ${ui.mutedOnPage}`}>
        Placed {formatDateTime(order.placedAt)} · {formatPence(order.totalPence)} ·{" "}
        {order.items.reduce((sum, item) => sum + item.quantity, 0)} pieces
      </p>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section aria-labelledby="make-heading" className={`rounded-lg border p-5 ${ui.panel} ${ui.rule}`}>
          <h2 id="make-heading" className={`text-[13px] font-semibold tracking-[0.1em] uppercase ${ui.mutedOnPanel}`}>
            To make and send
          </h2>
          <ul className="mt-2">
            {order.items.map((item) => (
              <li key={item.id} className={`grid grid-cols-[56px_minmax(0,1fr)_auto] gap-4 border-b py-4 last:border-b-0 ${ui.tableRow}`}>
                <ProductThumbnail image={item.imageUrl ? { url: item.imageUrl, alt: null } : null} />
                <div className="min-w-0">
                  <p className="font-medium">{item.name}</p>
                  <p className={`text-sm ${ui.mutedOnPanel}`}>
                    {[item.variantName, `${item.quantity} × ${formatPence(item.unitPence)}`, item.sku ? `Code ${item.sku}` : null].filter(Boolean).join(" · ")}
                  </p>
                  {item.details.length > 0 ? (
                    <dl className="mt-2 flex flex-col gap-1 text-sm">
                      {item.details.map((row) => {
                        const words = printedWords(row.value);
                        return words !== null ? (
                          <div key={row.label} className={`${QUOTE} ${ui.rule}`}>
                            <div className="min-w-0">
                              <dt className={`text-xs tracking-[0.08em] uppercase ${ui.mutedOnPanel}`}>Printed {row.label.toLowerCase()}</dt>
                              <dd className="whitespace-pre-line break-words">{words}</dd>
                            </div>
                            <CopyButton text={words} label="Copy the printed message" />
                          </div>
                        ) : (
                          <div key={row.label}>
                            <dt className={`inline ${ui.mutedOnPanel}`}>{row.label}: </dt>
                            <dd className="inline font-medium break-words">{row.value}</dd>
                          </div>
                        );
                      })}
                    </dl>
                  ) : null}
                </div>
                <p className="text-sm tabular-nums">{formatPence(item.totalPence)}</p>
              </li>
            ))}
          </ul>
          <dl className={`mt-2 ml-auto grid max-w-xs grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 border-t pt-4 text-sm tabular-nums ${ui.rule}`}>
            <dt className={ui.mutedOnPanel}>Subtotal</dt>
            <dd className="text-right">{formatPence(order.subtotalPence)}</dd>
            {order.discountPence > 0 ? (
              <>
                <dt className={ui.mutedOnPanel}>{order.codeName ?? "Promo code"}</dt>
                <dd className="text-right">−{formatPence(order.discountPence)}</dd>
              </>
            ) : null}
            <dt className={ui.mutedOnPanel}>{order.shippingMethod ?? "Delivery"}</dt>
            <dd className="text-right">{order.shippingPence === 0 ? "Free" : formatPence(order.shippingPence)}</dd>
            <dt className="font-semibold">Total</dt>
            <dd className="text-right font-semibold">{formatPence(order.totalPence)}</dd>
            <dt className={ui.mutedOnPanel}>VAT included</dt>
            <dd className={`text-right ${ui.mutedOnPanel}`}>{formatPence(order.taxPence)}</dd>
          </dl>
        </section>

        <div className="flex flex-col gap-4">
          <section aria-labelledby="send-heading" className={`rounded-lg p-5 ${ui.card}`}>
            <h2 id="send-heading" className={`text-[13px] font-semibold tracking-[0.1em] uppercase ${ui.mutedOnPanel}`}>
              Send to
            </h2>
            {address ? (
              <address className="mt-2.5 not-italic">
                <p className="font-medium">{address.name}</p>
                {[address.line1, address.line2, address.city, address.county, address.postcode].filter(Boolean).map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </address>
            ) : null}
            <p className="mt-3 text-sm">
              <span className="font-medium">{order.shippingMethod ?? "No delivery chosen"}</span>
              {order.shippingMethod ? ` · ${order.shippingPence === 0 ? "free" : formatPence(order.shippingPence)}` : null}
            </p>
            {order.parcel ? (
              <p className={`text-sm ${ui.mutedOnPanel}`}>
                {`${SIZE_NAMES[order.parcel.size]}, ${order.parcel.grams} g packed${order.parcel.mm !== null ? `, ${order.parcel.mm} mm thick` : ""}`}
              </p>
            ) : null}
            {order.gift && order.hidePrices ? <p className={`text-sm ${ui.mutedOnPanel}`}>Leave the prices off the delivery note</p> : null}
            {order.gift && order.giftNote ? (
              <div className={`${QUOTE} mt-3 ${ui.panel} ${ui.rule}`}>
                <div className="min-w-0">
                  <p className={`text-xs tracking-[0.08em] uppercase ${ui.mutedOnPanel}`}>Note for the parcel</p>
                  <p className="text-sm whitespace-pre-line break-words">{order.giftNote}</p>
                </div>
                <CopyButton text={order.giftNote} label="Copy the note" />
              </div>
            ) : null}
          </section>

          <section aria-labelledby="by-heading" className={`rounded-lg border p-5 ${ui.panel} ${ui.rule}`}>
            <h2 id="by-heading" className={`text-[13px] font-semibold tracking-[0.1em] uppercase ${ui.mutedOnPanel}`}>
              Ordered by
            </h2>
            <dl className="mt-2.5 grid grid-cols-[88px_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
              <dt className={ui.mutedOnPanel}>Email</dt>
              <dd className="break-words">{order.email}</dd>
              <dt className={ui.mutedOnPanel}>Phone</dt>
              <dd className={order.phone ? "" : ui.mutedOnPanel}>{order.phone ?? "Not given"}</dd>
              <dt className={ui.mutedOnPanel}>Account</dt>
              <dd>{order.guest ? "Guest" : "Has an account"}</dd>
            </dl>
          </section>
        </div>
      </div>
    </>
  );
}
