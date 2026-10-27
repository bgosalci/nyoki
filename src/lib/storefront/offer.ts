import { toClothingOffer, type StockRow } from "@/lib/clothes/stock";
import { isClothes } from "@/lib/clothes/group";
import { customisationGroup, type CategoryNode } from "@/lib/customisation/group";
import { toOffer, type CustomisationRow, type Offer, type PersonalisationFieldOffer } from "@/lib/customisation/offer";
import type { PricingSale } from "@/lib/pricing";

/**
 * What a piece offers a shopper, worked out once for the product page and
 * the basket alike, so the basket prices a line exactly as the page did.
 *
 * Every piece has an offer: a card or bookmark's packs, message and
 * personalisation, clothing's colours and sizes, or - for anything else -
 * nothing to choose, just its price as the shop sells it now.
 */
export interface OfferSource {
  pricePence: number;
  compareAtPence: number | null;
  colours: readonly string[];
  sizes: readonly string[];
  madeToOrder: boolean;
  variants: readonly StockRow[];
  customisation: CustomisationRow | null;
  personalisationFields: readonly (PersonalisationFieldOffer & { position: number })[];
  packs: readonly { id: string; cards: number; pricePence: number; position: number }[];
  sales: readonly PricingSale[];
  categoryIds: readonly string[];
}

const PIECE = { one: "piece", many: "pieces" };

export function productOffer(source: OfferSource, categories: readonly CategoryNode[], now: Date): { offer: Offer; clothes: boolean } {
  const noun = customisationGroup(source.categoryIds, categories);
  const clothes = isClothes(source.categoryIds, categories);

  const offer = toOffer({
    product: source,
    customisation: noun ? source.customisation : null,
    fields: noun ? source.personalisationFields : [],
    packs: noun ? source.packs : [],
    sales: source.sales,
    noun: noun ?? PIECE,
    now,
    clothing: clothes ? toClothingOffer(source) : null,
  });

  return { offer, clothes };
}
