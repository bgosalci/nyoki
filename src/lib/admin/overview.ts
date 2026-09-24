import { codeIsLive, type RedeemableCode } from "@/lib/discounts/validate";
import { isSaleLive, type PricingSale } from "@/lib/pricing";

export interface OverviewStat {
  label: string;
  value: number;
  /** The page behind the figure. */
  href: string;
  /** A line beneath the figure: how many more are scheduled to start. */
  detail?: string;
}

type Window = { active: boolean; startsAt: Date };

/**
 * Switched on and due to start later. One switched off will not start on its
 * own, so it is not scheduled, whatever its dates say.
 */
const isScheduled = (item: Window, now: Date) => item.active && item.startsAt.getTime() > now.getTime();

const scheduled = (count: number) => (count === 0 ? "None scheduled" : `${count} scheduled`);

/**
 * The Overview's figures. Sales and promo codes are counted by the rules the
 * shop and checkout themselves use - a sale is running only while it is
 * switched on and between its dates, a code live only while a shopper could
 * use it - so the Overview cannot count one that no basket would see. Those
 * switched on and still to start are given beneath, as scheduled.
 */
export function overviewStats(
  {
    live,
    drafts,
    toFulfil,
    sales,
    codes,
  }: {
    live: number;
    drafts: number;
    toFulfil: number;
    sales: readonly Pick<PricingSale, "active" | "startsAt" | "endsAt">[];
    codes: readonly Pick<RedeemableCode, "active" | "startsAt" | "endsAt" | "usageLimit" | "usedCount">[];
  },
  now: Date,
): OverviewStat[] {
  return [
    { label: "Live products", value: live, href: "/admin/products?status=ACTIVE" },
    { label: "Drafts", value: drafts, href: "/admin/products?status=DRAFT" },
    { label: "Orders to fulfil", value: toFulfil, href: "/admin/orders" },
    {
      label: "Running sales",
      value: sales.filter((sale) => isSaleLive(sale, now)).length,
      href: "/admin/sales",
      detail: scheduled(sales.filter((sale) => isScheduled(sale, now)).length),
    },
    {
      label: "Live promo codes",
      value: codes.filter((code) => codeIsLive(code, now)).length,
      href: "/admin/codes",
      // A code used up before it starts never will.
      detail: scheduled(codes.filter((code) => isScheduled(code, now) && (code.usageLimit === null || code.usedCount < code.usageLimit)).length),
    },
  ];
}
