/**
 * What an order comes to: the goods, the promo code, delivery, the total,
 * and the VAT it includes. Whole pence throughout.
 *
 * A code comes off the goods at the prices they sell at - a sale's included -
 * and never off delivery. Free delivery is judged after the code, so a code
 * cannot both take money off and keep delivery free that the goods no longer
 * earn.
 *
 * Prices include VAT, so nothing is added: the summary says how much of the
 * total is VAT, each line at its own product's rate (cards 20%, children's
 * clothing 0%). The code's discount and the delivery charge are shared
 * between the rates by the goods' value, as HMRC has a discount or a delivery
 * charge on mixed goods shared, and each rate's VAT is taken out with the VAT
 * fraction and rounded to the penny, once.
 */

export interface DeliveryRate {
  id: string;
  name: string;
  pricePence: number;
  /** The goods' value at or above which it is free; null for never. */
  freeOverPence: number | null;
  minDays: number | null;
  maxDays: number | null;
}

export function deliveryPence(rate: Pick<DeliveryRate, "pricePence" | "freeOverPence">, goodsPence: number): number {
  return rate.freeOverPence !== null && goodsPence >= rate.freeOverPence ? 0 : rate.pricePence;
}

export type FreeDelivery = { reached: true; rate: DeliveryRate } | { reached: false; morePence: number; rate: DeliveryRate };

/** How close the goods are to free delivery, by the option free soonest; null when none ever is. */
export function freeDelivery(rates: readonly DeliveryRate[], goodsPence: number): FreeDelivery | null {
  const free = rates
    .filter((rate) => rate.freeOverPence !== null)
    .sort((a, b) => a.freeOverPence! - b.freeOverPence!)[0];
  if (!free) return null;
  return goodsPence >= free.freeOverPence! ? { reached: true, rate: free } : { reached: false, morePence: free.freeOverPence! - goodsPence, rate: free };
}

/**
 * Shares a whole number of pence by weight, adding up exactly: each share
 * rounded down, then the pennies left over given to the largest remainders,
 * first come first served. Every weight nothing shares it evenly.
 */
export function apportion(total: number, weights: readonly number[]): number[] {
  if (weights.length === 0) return [];
  const sum = weights.reduce((a, b) => a + b, 0);
  const even = sum === 0;
  const exact = weights.map((weight) => (even ? total / weights.length : (total * weight) / sum));
  const shares = exact.map(Math.floor);

  let left = total - shares.reduce((a, b) => a + b, 0);
  const byRemainder = exact.map((value, index) => ({ index, remainder: value - Math.floor(value) })).sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (const { index } of byRemainder) {
    if (left <= 0) break;
    shares[index] += 1;
    left -= 1;
  }
  return shares;
}

export interface Totals {
  subtotalPence: number;
  discountPence: number;
  /** Null until an option is chosen. */
  deliveryPence: number | null;
  totalPence: number;
  /** The VAT the total includes. */
  vatPence: number;
}

export function checkoutTotals({
  lines,
  discountPence,
  rate,
}: {
  lines: readonly { totalPence: number; vatRate: number }[];
  /** What the code takes off, already worked out by codeRedeemability. */
  discountPence: number;
  rate: Pick<DeliveryRate, "pricePence" | "freeOverPence"> | null;
}): Totals {
  const subtotalPence = lines.reduce((sum, line) => sum + line.totalPence, 0);
  const goodsPence = subtotalPence - discountPence;
  const delivery = rate ? deliveryPence(rate, goodsPence) : null;

  // The goods by VAT rate, each less its share of the code, plus its share of delivery.
  const rates = [...new Set(lines.map((line) => line.vatRate))];
  const value = rates.map((vatRate) => lines.filter((line) => line.vatRate === vatRate).reduce((sum, line) => sum + line.totalPence, 0));
  const discounts = apportion(discountPence, value);
  const net = value.map((amount, index) => amount - discounts[index]);
  const deliveries = apportion(delivery ?? 0, net);

  const vatPence = rates.reduce((sum, vatRate, index) => {
    const gross = net[index] + deliveries[index];
    return sum + Math.round((gross * vatRate) / (100 + vatRate));
  }, 0);

  return {
    subtotalPence,
    discountPence,
    deliveryPence: delivery,
    totalPence: goodsPence + (delivery ?? 0),
    vatPence,
  };
}
