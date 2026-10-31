import { inStock } from "@/lib/clothes/stock";
import type { ItemNoun } from "@/lib/customisation/group";
import type { Offer } from "@/lib/customisation/offer";
import { formatPence } from "@/lib/money";

/**
 * A shopper's choices - on a card or bookmark, or a piece of clothing - and
 * what they come to.
 *
 * Pure, so the page works from the same rules the basket checks by. Each
 * extra is charged per card: a pack of three with an 80p message pays £2.40
 * for it. A pack carries one message and one personalisation, printed in
 * every card. Every colour and size of a piece sells at its own price.
 */

/** The single card, as the unit chosen; a pack is chosen by its id. */
export const SINGLE = "single";

export type MessageChoice = "Blank inside" | "Printed message";

export interface Choices {
  /** SINGLE or a pack's id; unused when there are no packs. */
  unit: string | null;
  message: MessageChoice | null;
  messageText: string;
  /** The switch, while personalisation is optional. */
  personalise: boolean;
  /** Field id to what was typed or chosen. */
  personalisation: Record<string, string>;
  /** Clothing only. */
  colour: string | null;
  size: string | null;
  quantity: number;
}

/**
 * Nothing chosen, so every shopper decides for themselves; personalising
 * starts switched off.
 */
export const EMPTY_CHOICES: Choices = {
  unit: null,
  message: null,
  messageText: "",
  personalise: false,
  personalisation: {},
  colour: null,
  size: null,
  quantity: 1,
};

/**
 * Where a shopper starts: nothing chosen, except a colour or a size that is
 * the only one there is - and in stock - since there is no choosing it.
 */
export function initialChoices(offer: Offer): Choices {
  const clothing = offer.clothing;
  if (!clothing) return EMPTY_CHOICES;

  const only = (values: string[], available: (value: string) => boolean) => (values.length === 1 && available(values[0]) ? values[0] : null);
  return {
    ...EMPTY_CHOICES,
    colour: only(clothing.colours, (colour) => inStock(clothing, colour, null)),
    size: only(clothing.sizes, (size) => inStock(clothing, null, size)),
  };
}

/** The single card or pack chosen, or null while a choice is still owed. */
function chosenUnit(offer: Offer, choices: Choices): { cards: number; pricePence: number } | null {
  if (offer.packs.length === 0 || choices.unit === SINGLE) return { cards: 1, pricePence: offer.single.pricePence };
  return offer.packs.find((pack) => pack.id === choices.unit) ?? null;
}

export function isPersonalising(offer: Offer, choices: Choices): boolean {
  return offer.personalisation !== null && (offer.personalisation.required || choices.personalise);
}

const isPrinting = (offer: Offer, choices: Choices) => offer.message !== null && choices.message === "Printed message";

/** One of whatever was chosen - a card or a pack - with its extras, or null. */
export function unitPricePence(offer: Offer, choices: Choices): number | null {
  const unit = chosenUnit(offer, choices);
  if (!unit) return null;

  const extrasPerCard =
    (isPrinting(offer, choices) ? offer.message!.pricePence : 0) +
    (isPersonalising(offer, choices) ? offer.personalisation!.pricePence : 0);

  return unit.pricePence + extrasPerCard * unit.cards;
}

export function totalPence(offer: Offer, choices: Choices): number | null {
  const unit = unitPricePence(offer, choices);
  return unit === null ? null : unit * choices.quantity;
}

/** What a pack saves against the same cards bought singly, or null. */
export function packSavingPence(offer: Offer, pack: Offer["packs"][number]): number | null {
  const saving = offer.single.pricePence * pack.cards - pack.pricePence;
  return saving > 0 ? saving : null;
}

/** An extra's cost as the shopper reads it: "+80p a card". */
export function extraNote(pricePence: number, noun: ItemNoun): string {
  if (pricePence === 0) return "No extra charge";
  return `+${pricePence < 100 ? `${pricePence}p` : formatPence(pricePence)} a ${noun.one}`;
}

/** What the page can be missing: a colour or size, the unit, the message, or a field by id. */
export type ChoiceKey = "colour" | "size" | "unit" | "message" | "messageText" | `field:${string}`;

export interface MissingChoice {
  key: ChoiceKey;
  /** In full, beside the choice. */
  message: string;
  /** In a few words, for the line beneath the total in the bar. */
  short: string;
}

const blank = (text: string | undefined) => (text ?? "").trim() === "";

/**
 * What still needs answering, in page order. Nothing the current choices
 * hide is asked: the words for a card left blank inside, or what to
 * personalise with personalising switched off.
 */
export function missingChoices(offer: Offer, choices: Choices): MissingChoice[] {
  const missing: MissingChoice[] = [];

  const clothing = offer.clothing;
  if (clothing) {
    const colour = clothing.colours.length > 0 && choices.colour !== null && clothing.colours.includes(choices.colour) ? choices.colour : null;
    const size = clothing.sizes.length > 0 && choices.size !== null && clothing.sizes.includes(choices.size) ? choices.size : null;
    if (clothing.colours.length > 0 && colour === null) missing.push({ key: "colour", message: "Please choose a colour.", short: "Choose a colour" });
    if (clothing.sizes.length > 0 && size === null) {
      missing.push({ key: "size", message: "Please choose a size.", short: "Choose a size" });
    } else if (missing.length === 0 && !inStock(clothing, colour, size)) {
      // The page will not offer it, but the basket checks by this too.
      const sized = clothing.sizes.length > 0;
      const both = sized && clothing.colours.length > 0;
      const what = both ? "that size is out of stock in that colour" : sized ? "that size is out of stock" : "that colour is out of stock";
      const short = both ? "Out of stock in that colour" : sized ? "That size is out of stock" : "That colour is out of stock";
      missing.push({ key: sized ? "size" : "colour", message: `Sorry, ${what}. Please choose another.`, short });
    }
  }

  if (!chosenUnit(offer, choices)) {
    missing.push({ key: "unit", message: `Please choose a single ${offer.noun.one} or a pack.`, short: "Choose single or pack" });
  }

  if (offer.message) {
    if (choices.message === null) {
      missing.push({ key: "message", message: "Please choose a message option.", short: "Choose a message option" });
    } else if (choices.message === "Printed message" && blank(choices.messageText)) {
      missing.push({ key: "messageText", message: "Please type the message you want printed.", short: "Type your message" });
    }
  }

  if (isPersonalising(offer, choices)) {
    for (const field of offer.personalisation!.fields) {
      const value = choices.personalisation[field.id];
      const what = field.label.toLowerCase();
      if (field.kind === "TEXT" && blank(value)) {
        missing.push({ key: `field:${field.id}`, message: `Please fill in the ${what}.`, short: `Fill in the ${what}` });
      } else if (field.kind === "CHOICE" && !field.choices.includes(value ?? "")) {
        missing.push({ key: `field:${field.id}`, message: `Please choose the ${what}.`, short: `Choose the ${what}` });
      }
    }
  }

  return missing;
}

/**
 * The line beneath the total in the bar: what is still to choose, in a few
 * words - a colour and size together, one thing by name, more by count - and
 * once nothing is, that ordering opens soon, while ordering is closed.
 * Once it is open, `readyHint` says what was chosen instead.
 */
export function barHint(missing: MissingChoice[]): string {
  if (missing.length === 0) return "Online ordering opens soon";
  const [first, second] = missing;
  // Out of stock is only ever said alone, so a colour and a size together are both still to choose.
  if (missing.length === 2 && first.key === "colour" && second.key === "size") return "Choose a colour and size";
  return missing.length === 1 ? first.short : `${missing.length} choices still needed`;
}

/**
 * The line beneath the total once nothing is missing and ordering is open:
 * what was chosen, in a few words - "Seascape · 2-3 years", "Pack of 3 ·
 * Printed message".
 */
export function readyHint(offer: Offer, choices: Choices): string {
  const words: string[] = [];
  if (offer.clothing) {
    if (choices.colour) words.push(choices.colour);
    if (choices.size) words.push(choices.size);
  }
  if (offer.packs.length > 0) {
    const pack = offer.packs.find((p) => p.id === choices.unit);
    words.push(pack ? `Pack of ${pack.cards}` : `Single ${offer.noun.one}`);
  }
  if (offer.message && choices.message) words.push(choices.message);
  if (isPersonalising(offer, choices)) words.push("Personalised");
  return words.length > 0 ? words.join(" · ") : "Ready to add";
}

export interface SummaryRow {
  label: string;
  value: string;
}

/** The "Your choices" panel: a row for each thing the piece offers. */
export function summarise(offer: Offer, choices: Choices): SummaryRow[] {
  const rows: SummaryRow[] = [];
  const { one } = offer.noun;

  if (offer.clothing) {
    if (offer.clothing.colours.length > 0) rows.push({ label: "Colour", value: choices.colour ?? "Not chosen yet" });
    if (offer.clothing.sizes.length > 0) rows.push({ label: "Size", value: choices.size ?? "Not chosen yet" });
  }

  if (offer.packs.length > 0) {
    const pack = offer.packs.find((p) => p.id === choices.unit);
    const value = choices.unit === SINGLE ? `Single ${one}` : pack ? `Pack of ${pack.cards}` : "Not chosen yet";
    rows.push({ label: "Single or pack", value });
  }

  if (offer.message) {
    const words = choices.messageText.trim();
    const value =
      choices.message === null
        ? "Not chosen yet"
        : choices.message === "Blank inside"
          ? "Blank inside"
          : words
            ? `Printed: “${words}”`
            : "Printed message (not written yet)";
    rows.push({ label: `Inside the ${one}`, value });
  }

  if (offer.personalisation) {
    const filled = offer.personalisation.fields
      .map((field) => ({ label: field.label, value: (choices.personalisation[field.id] ?? "").trim() }))
      .filter((entry) => entry.value !== "")
      .map((entry) => `${entry.label}: ${entry.value}`);
    const value = !isPersonalising(offer, choices) ? "None" : filled.length > 0 ? filled.join(" · ") : "Not filled in yet";
    rows.push({ label: "Personalisation", value });
  }

  return rows;
}

export const QUANTITY_MIN = 1;
export const QUANTITY_MAX = 99;

/**
 * A typed quantity, brought into 1 to 99, and down to `most` when there are
 * fewer than that. A blank, a nought or anything that is not a number counts
 * as one; a fraction is cut to the whole number below. Never below one, even
 * with none left: the page says that itself.
 */
export function clampQuantity(raw: string | number, most: number = QUANTITY_MAX): number {
  const number = typeof raw === "number" ? raw : raw.trim() === "" ? NaN : Number(raw);
  if (!Number.isFinite(number)) return QUANTITY_MIN;
  return Math.max(QUANTITY_MIN, Math.min(QUANTITY_MAX, most, Math.trunc(number)));
}

/**
 * The most a shopper can ask for of what is chosen so far, as the basket
 * would let them have: the stock of the colour in the size chosen - or, until
 * both are, the most of any still possible - shared out by the cards in the
 * pack chosen. `stock` is the piece's own, for anything not clothing (whose
 * stock is in its offer); null is made to order, which never runs out. Never
 * more than the box takes.
 *
 * What is already in the basket is not counted: adding puts in what there is
 * room for, and says so.
 */
export function mostAvailable(offer: Offer, choices: Pick<Choices, "unit" | "colour" | "size">, stock: number | null): number {
  const clothing = offer.clothing;
  const held = !clothing
    ? stock
    : clothing.madeToOrder
      ? null
      : Math.max(
          0,
          ...clothing.stock
            .filter((row) => (choices.colour === null || row.colour === choices.colour) && (choices.size === null || row.size === choices.size))
            .map((row) => row.stock),
        );
  if (held === null) return QUANTITY_MAX;

  const cards = offer.packs.find((pack) => pack.id === choices.unit)?.cards ?? 1;
  return Math.max(0, Math.min(QUANTITY_MAX, Math.floor(held / cards)));
}
