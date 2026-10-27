import type { FreeDelivery } from "@/lib/checkout/totals";
import { formatPence } from "@/lib/money";

/**
 * How close the basket is to free delivery: a sage outline once it is there,
 * and before then how much more, with a bar filling in sage.
 */
export function FreeDeliveryNote({ free, subtotalPence }: { free: FreeDelivery; subtotalPence: number }) {
  if (free.reached) {
    return (
      <p className="flex items-start gap-2.5 rounded-xl border border-nyoki-sage px-3 py-2.5 text-sm font-medium text-nyoki-sage-deep">
        <svg viewBox="0 0 20 20" fill="none" strokeWidth="2" aria-hidden="true" className="mt-px size-[18px] shrink-0 stroke-nyoki-sage-deep">
          <path d="m4.5 10.5 3.5 3.5 7.5-8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Your basket gets free {free.rate.name} delivery.
      </p>
    );
  }

  const share = Math.round((100 * subtotalPence) / (subtotalPence + free.morePence));
  return (
    <div className="text-sm">
      <p>
        <span className="font-medium tabular-nums">{formatPence(free.morePence)}</span>{" "}
        <span className="text-nyoki-text-dark">more for free delivery</span>
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-nyoki-accent-beige" aria-hidden="true">
        <div className="h-full rounded-full bg-nyoki-sage" style={{ width: `${share}%` }} />
      </div>
    </div>
  );
}
