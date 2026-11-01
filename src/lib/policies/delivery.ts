import { deliveryDays } from "@/lib/delivery/validate";
import type { RateSource } from "@/lib/delivery/parcel";
import { formatPence } from "@/lib/money";

/** A delivery option as the delivery policy lists it. */
export interface DeliveryOption {
  name: string;
  cost: string;
  /** "2 to 3 working days"; null when the option does not say. */
  time: string | null;
}

/**
 * The ways checkout offers, in words, for the delivery policy: read from the
 * same options, so the page cannot promise what checkout does not charge.
 * One priced by size and weight is given from its cheapest price, since what
 * it costs depends on the parcel; one with no prices yet is left out, as
 * checkout leaves it out.
 */
export function deliveryOptions(rates: readonly RateSource[]): DeliveryOption[] {
  return rates.flatMap((rate) => {
    if (rate.byWeight && rate.bands.length === 0) return [];
    return [{ name: rate.name, cost: costOf(rate), time: deliveryDays(rate) }];
  });
}

function costOf(rate: RateSource): string {
  const always = rate.freeOverPence === 0 || (!rate.byWeight && rate.pricePence === 0);
  if (always) return "Free on every order";

  const over = rate.freeOverPence === null ? null : `free on orders over ${formatPence(rate.freeOverPence)}`;
  if (rate.byWeight) {
    const from = `From ${formatPence(Math.min(...rate.bands.map((band) => band.pricePence)))}`;
    return over ? `${from} by size and weight, ${over}` : `${from}, by size and weight`;
  }
  return over ? `${formatPence(rate.pricePence)}, ${over}` : formatPence(rate.pricePence);
}
