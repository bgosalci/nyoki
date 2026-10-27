import {
  SINGLE,
  isPersonalising,
  missingChoices,
  type Choices,
  type MessageChoice,
  type SummaryRow,
} from "@/lib/customisation/choices";
import type { Offer } from "@/lib/customisation/offer";

/**
 * A basket line's choices, as the line keeps them - and back again.
 *
 * A line keeps only what the choices made count: no words for a card left
 * blank inside, no names with personalising switched off, no field the piece
 * does not offer. So two lines that would be made the same are the same
 * line, and nothing hidden on the page is ever printed.
 */

export interface StoredChoices {
  /** Clothing's colour and size. */
  variantId: string | null;
  /** A pack; null is the single card, or a piece with no packs. */
  packId: string | null;
  message: MessageChoice | null;
  messageText: string;
  personalise: boolean;
  /** Field id to what was typed or chosen. */
  personalisation: Record<string, string>;
}

export interface VariantRow {
  id: string;
  colour: string | null;
  size: string | null;
  stock: number;
  sku: string | null;
  /** "Seascape / 2-3 years". */
  name: string;
}

/** The variant for a colour and size; either is null where the piece has none. */
function variantFor(offer: Offer, choices: Choices, variants: readonly VariantRow[]): VariantRow | null {
  const clothing = offer.clothing!;
  const colour = clothing.colours.length > 0 ? choices.colour : null;
  const size = clothing.sizes.length > 0 ? choices.size : null;
  return variants.find((variant) => variant.colour === colour && variant.size === size) ?? null;
}

/** The choices as a line keeps them, or null while any is still owed - or out of stock. */
export function toStored(offer: Offer, choices: Choices, variants: readonly VariantRow[]): StoredChoices | null {
  if (missingChoices(offer, choices).length > 0) return null;

  let variantId: string | null = null;
  if (offer.clothing) {
    const variant = variantFor(offer, choices, variants);
    if (!variant) return null;
    variantId = variant.id;
  }

  const printing = offer.message !== null && choices.message === "Printed message";
  const personalising = isPersonalising(offer, choices);

  return {
    variantId,
    packId: offer.packs.length > 0 && choices.unit !== SINGLE ? choices.unit : null,
    message: offer.message ? choices.message : null,
    messageText: printing ? choices.messageText.trim() : "",
    personalise: personalising,
    personalisation: personalising
      ? Object.fromEntries(offer.personalisation!.fields.map((field) => [field.id, (choices.personalisation[field.id] ?? "").trim()]))
      : {},
  };
}

/**
 * The choices a line was made from, to price it and check it by the page's
 * own rules; null when the line no longer fits the piece at all - its colour
 * and size gone, or a piece that has stopped or started being clothing.
 */
export function toChoices(offer: Offer, stored: StoredChoices, variants: readonly VariantRow[], quantity = 1): Choices | null {
  let colour: string | null = null;
  let size: string | null = null;

  if (offer.clothing) {
    const variant = variants.find((row) => row.id === stored.variantId);
    if (!variant) return null;
    colour = variant.colour;
    size = variant.size;
  } else if (stored.variantId !== null) {
    return null;
  }

  return {
    unit: stored.packId ?? SINGLE,
    message: stored.message,
    messageText: stored.messageText,
    personalise: stored.personalise,
    personalisation: stored.personalisation,
    colour,
    size,
    quantity,
  };
}

/**
 * The offer with clothing's stock set aside, so checking a line's choices
 * asks only whether they still fit the piece. Running out is the stock's to
 * say, in its own words.
 */
export function ignoringStock(offer: Offer): Offer {
  return offer.clothing ? { ...offer, clothing: { ...offer.clothing, madeToOrder: true } } : offer;
}

/**
 * Whether a line's choices still fit the piece as it is now: its colour and
 * size still there, nothing it asks for left unanswered, and nothing kept
 * that the choices would not keep.
 */
export function fitsOffer(offer: Offer, stored: StoredChoices, variants: readonly VariantRow[]): boolean {
  const choices = toChoices(offer, stored, variants);
  if (!choices) return false;
  const again = toStored(ignoringStock(offer), choices, variants);
  return again !== null && JSON.stringify(canonical(again)) === JSON.stringify(canonical(stored));
}

const canonical = (stored: StoredChoices) => ({
  ...stored,
  personalisation: Object.keys(stored.personalisation)
    .sort()
    .map((id) => [id, stored.personalisation[id]]),
});

/** How many of the piece's stock one of the line takes: a pack of three takes three cards. */
export function unitsPerItem(offer: Offer, stored: StoredChoices): number {
  return offer.packs.find((pack) => pack.id === stored.packId)?.cards ?? 1;
}

/**
 * A line's choices in words, for the basket, the checkout and the order:
 * each personalised thing on its own row, so the names to stitch read as
 * they were typed.
 */
export function lineDetails(offer: Offer, choices: Choices): SummaryRow[] {
  const rows: SummaryRow[] = [];
  const { one } = offer.noun;

  if (offer.clothing) {
    if (choices.colour) rows.push({ label: "Colour", value: choices.colour });
    if (choices.size) rows.push({ label: "Size", value: choices.size });
  }

  if (offer.packs.length > 0) {
    const pack = offer.packs.find((p) => p.id === choices.unit);
    rows.push({ label: "Single or pack", value: pack ? `Pack of ${pack.cards}` : `Single ${one}` });
  }

  if (offer.message && choices.message) {
    const value = choices.message === "Printed message" ? `Printed: “${choices.messageText.trim()}”` : "Blank inside";
    rows.push({ label: `Inside the ${one}`, value });
  }

  if (isPersonalising(offer, choices)) {
    for (const field of offer.personalisation!.fields) {
      const value = (choices.personalisation[field.id] ?? "").trim();
      if (value) rows.push({ label: field.label, value });
    }
  }

  return rows;
}
