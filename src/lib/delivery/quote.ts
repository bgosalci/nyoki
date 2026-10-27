import { naturalSize, parcelOf, priceRates, type Packed, type Packing, type Postage, type RateSource } from "@/lib/delivery/parcel";
import { SIZE_NAMES, type ParcelSize } from "@/lib/delivery/royal-mail";
import { formatPence } from "@/lib/money";

/**
 * What a piece costs to send on its own, or in a pack, by each delivery
 * option: shown in the admin beside its weight, so a wrong number stands out
 * before a shopper is charged by it.
 */
export interface Quote {
  /** The size it goes as, by the cheapest option that prices by size and weight, else by Royal Mail's own limits. */
  packed: Packed;
  prices: { name: string; pricePence: number }[];
}

export function quoteFor(postage: Postage, units: number, rates: readonly RateSource[], packing: Record<ParcelSize, Packing>): Quote | null {
  const parcel = parcelOf([{ postage, units }]);
  if (!parcel) return null;

  const priced = priceRates(rates, parcel, packing).sort((a, b) => a.pricePence - b.pricePence);
  const byWeight = new Set(rates.filter((rate) => rate.byWeight).map((rate) => rate.id));
  const cheapest = priced.find((rate) => byWeight.has(rate.id));

  return {
    packed: cheapest?.parcel ?? naturalSize(parcel, packing),
    prices: priced.map(({ name, pricePence }) => ({ name, pricePence })),
  };
}

export function quoteSentence({ packed, prices }: Quote): string {
  const size = `${SIZE_NAMES[packed.size]}, ${packed.grams} g${packed.mm !== null ? ` and ${packed.mm} mm` : ""} packed.`;
  if (prices.length === 0) return `${size} No delivery option takes it.`;
  return `${size} ${prices.map((price) => `${formatPence(price.pricePence)} by ${price.name}`).join(", ")}.`;
}
