import { ui } from "@/lib/brand/ui";

/**
 * How an order reads in the CMS.
 *
 * The database's names describe the payment; these describe what is left to
 * do, which is what somebody looking at the list actually wants to know.
 */

export const ORDER_STATUSES = ["PENDING", "PAID", "FULFILLED", "CANCELLED", "REFUNDED"] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

const LABELS: Record<OrderStatus, string> = {
  PENDING: "Not paid",
  PAID: "To send",
  FULFILLED: "Sent",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

export function orderStatusLabel(status: OrderStatus): string {
  return LABELS[status];
}

/**
 * Whether the order is waiting on somebody here.
 *
 * Only a paid one is: an unpaid order is waiting on the customer, and the
 * other three are finished with.
 */
export function isAwaitingFulfilment(status: OrderStatus): boolean {
  return status === "PAID";
}

/** Sage draws the eye, and exactly one status has earned it. */
export function orderStatusBadge(status: OrderStatus): string {
  return isAwaitingFulfilment(status) ? ui.badgeSale : ui.badgeQuiet;
}

// Pinned to London: the shop's day starts and ends there, and a server in
// another timezone must not shift an order onto the wrong date. Only the
// numbers come from Intl - the month names are written out here because the
// abbreviations move with the ICU data the runtime happens to carry (recent
// versions render September in en-GB as "Sept"), and a date should not read
// differently on Vercel than it does here.
const PARTS = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "numeric",
  year: "numeric",
  timeZone: "Europe/London",
});

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatOrderDate(date: Date): string {
  const parts = Object.fromEntries(PARTS.formatToParts(date).map((part) => [part.type, part.value]));

  return `${Number(parts.day)} ${MONTHS[Number(parts.month) - 1]} ${parts.year}`;
}
