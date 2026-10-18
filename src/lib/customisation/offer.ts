import type { ItemNoun } from "@/lib/customisation/group";
import { effectivePricePence, type PricingSale } from "@/lib/pricing";

/**
 * What a card or bookmark offers a shopper, priced as the shop sells it now.
 *
 * Built from the product's customisation rows by `toOffer`, on the server, and
 * handed to the page. A live sale comes off the single card and every pack -
 * what the shopper is buying - but not off the extras.
 */

export interface PersonalisationFieldOffer {
  id: string;
  label: string;
  kind: "TEXT" | "CHOICE";
  /** Typed text only. */
  maxLength: number | null;
  /** Chosen from a list only. */
  choices: string[];
}

export interface Offer {
  noun: ItemNoun;
  single: { pricePence: number; wasPence: number | null };
  packs: { id: string; cards: number; pricePence: number; wasPence: number | null }[];
  /** A printed message inside, charged per card; null when not offered. */
  message: { pricePence: number; maxLength: number } | null;
  /** Charged per card; null when not offered. */
  personalisation: { pricePence: number; required: boolean; fields: PersonalisationFieldOffer[] } | null;
}

export interface CustomisationRow {
  message: boolean;
  messagePricePence: number;
  messageMaxLength: number;
  personalisation: boolean;
  personalisationPricePence: number;
  personalisationRequired: boolean;
}

export function toOffer({
  product,
  customisation,
  fields,
  packs,
  sales,
  noun,
  now,
}: {
  product: { pricePence: number; compareAtPence: number | null };
  customisation: CustomisationRow | null;
  fields: readonly (PersonalisationFieldOffer & { position: number })[];
  packs: readonly { id: string; cards: number; pricePence: number; position: number }[];
  sales: readonly PricingSale[];
  noun: ItemNoun;
  now: Date;
}): Offer {
  const single = effectivePricePence(product.pricePence, sales, now);
  const byPosition = <T extends { position: number }>(rows: readonly T[]) => [...rows].sort((a, b) => a.position - b.position);

  return {
    noun,
    single: { pricePence: single.pricePence, wasPence: single.sale ? product.pricePence : product.compareAtPence },
    packs: byPosition(packs).map((pack) => {
      const price = effectivePricePence(pack.pricePence, sales, now);
      return { id: pack.id, cards: pack.cards, pricePence: price.pricePence, wasPence: price.sale ? pack.pricePence : null };
    }),
    message: customisation?.message
      ? { pricePence: customisation.messagePricePence, maxLength: customisation.messageMaxLength }
      : null,
    // Switched on with nothing to personalise offers nothing; the admin
    // refuses to save that, so it is only a guard.
    personalisation:
      customisation?.personalisation && fields.length > 0
        ? {
            pricePence: customisation.personalisationPricePence,
            required: customisation.personalisationRequired,
            fields: byPosition(fields).map(({ id, label, kind, maxLength, choices }) => ({ id, label, kind, maxLength, choices })),
          }
        : null,
  };
}

/** Whether there is anything to choose, beyond the piece itself. */
export function offersAnything(offer: Offer): boolean {
  return offer.packs.length > 0 || offer.message !== null || offer.personalisation !== null;
}
