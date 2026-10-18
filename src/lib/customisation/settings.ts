import type { CustomisationRow } from "@/lib/customisation/offer";
import { parsePoundsToPence } from "@/lib/money";

/**
 * The Customise tab's form, read and checked.
 *
 * A section switched off comes back null and is not checked at all: its
 * settings are hidden, so they must not be able to stop a save, and the save
 * leaves what is stored for it alone - switching the message back on finds
 * its cost where it was. Packs have no switch: no rows is no packs.
 *
 * Rows are posted as parallel lists (`fieldLabel`, `packCards`...), as the
 * cost lines are, and a spare row left empty is skipped.
 */

export const DEFAULT_MESSAGE_MAX_LENGTH = 300;
export const MESSAGE_LENGTH_LIMIT = 1000;
export const DEFAULT_TEXT_MAX_LENGTH = 30;
export const TEXT_LENGTH_LIMIT = 200;
export const PACK_MIN = 2;
export const PACK_MAX = 100;

export type FieldKind = "TEXT" | "CHOICE";

export interface FieldSettings {
  label: string;
  kind: FieldKind;
  maxLength: number | null;
  choices: string[];
}

export interface CustomisationSettings {
  message: { pricePence: number; maxLength: number } | null;
  personalisation: { pricePence: number; required: boolean; fields: FieldSettings[] } | null;
  packs: { cards: number; pricePence: number }[];
}

export type CustomisationErrors = Partial<
  Record<"messagePrice" | "messageMaxLength" | "personalisationPrice" | "fields" | "packs", string>
>;

export type CustomisationValidation =
  | { ok: true; data: CustomisationSettings }
  | { ok: false; errors: CustomisationErrors };

const text = (form: FormData, key: string) => {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
};

const all = (form: FormData, key: string) => form.getAll(key).map((value) => (typeof value === "string" ? value : ""));

const switchedOn = (form: FormData, key: string) => form.get(key) !== null;

function wholeNumber(raw: string, min: number, max: number): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const number = Number(raw);
  return number >= min && number <= max ? number : null;
}

/** An extra's cost; blank is free. */
const extraCost = (raw: string) => (raw === "" ? 0 : parsePoundsToPence(raw));

function parseFields(form: FormData): { ok: true; fields: FieldSettings[] } | { ok: false; error: string } {
  const labels = all(form, "fieldLabel");
  const kinds = all(form, "fieldKind");
  const maxLengths = all(form, "fieldMaxLength");
  const choiceLists = all(form, "fieldChoices");

  const fields: FieldSettings[] = [];
  for (let i = 0; i < labels.length; i += 1) {
    const label = labels[i].trim();
    const max = (maxLengths[i] ?? "").trim();
    const choiceText = choiceLists[i] ?? "";

    if (label === "" && max === "" && choiceText.trim() === "") continue;

    const where = `Thing ${i + 1}`;
    if (label === "") return { ok: false, error: `${where} has no name. Say what is personalised, like Name or Initial.` };

    const earlier = fields.find((field) => field.label.toLowerCase() === label.toLowerCase());
    if (earlier) return { ok: false, error: `${where} repeats ${earlier.label}.` };

    const named = `${where} (${label})`;
    const kind = kinds[i];

    if (kind === "TEXT") {
      const maxLength = max === "" ? DEFAULT_TEXT_MAX_LENGTH : wholeNumber(max, 1, TEXT_LENGTH_LIMIT);
      if (maxLength === null) {
        return { ok: false, error: `${named}: give the most characters as a whole number from 1 to ${TEXT_LENGTH_LIMIT}.` };
      }
      fields.push({ label, kind, maxLength, choices: [] });
    } else if (kind === "CHOICE") {
      const choices = choiceText
        .split(/\r?\n/)
        .map((choice) => choice.trim())
        .filter((choice) => choice !== "");
      const repeated = choices.find((choice, index) => choices.indexOf(choice) !== index);
      if (repeated !== undefined) return { ok: false, error: `${named} lists ${repeated} twice.` };
      if (choices.length < 2) return { ok: false, error: `${named}: give at least two choices, one per line.` };
      fields.push({ label, kind, maxLength: null, choices });
    } else {
      return { ok: false, error: `${named}: choose what kind it is.` };
    }
  }

  return { ok: true, fields };
}

function parsePacks(form: FormData): { ok: true; packs: CustomisationSettings["packs"] } | { ok: false; error: string } {
  const sizes = all(form, "packCards");
  const prices = all(form, "packPrice");

  const packs: CustomisationSettings["packs"] = [];
  for (let i = 0; i < sizes.length; i += 1) {
    const size = sizes[i].trim();
    const price = (prices[i] ?? "").trim();
    if (size === "" && price === "") continue;

    const where = `Pack ${i + 1}`;
    const cards = wholeNumber(size, PACK_MIN, PACK_MAX);
    if (cards === null) {
      return { ok: false, error: `${where}: give the number in it as a whole number from ${PACK_MIN} to ${PACK_MAX}.` };
    }

    const pricePence = parsePoundsToPence(price);
    // A pack of nothing would be given away.
    if (pricePence === null || pricePence === 0) {
      return { ok: false, error: `${where} (${cards}): write its price as pounds and pence, like 18.00.` };
    }

    if (packs.some((pack) => pack.cards === cards)) return { ok: false, error: `${where} repeats a pack of ${cards}.` };

    packs.push({ cards, pricePence });
  }

  return { ok: true, packs };
}

export function parseCustomisation(form: FormData): CustomisationValidation {
  const errors: CustomisationErrors = {};

  let message: CustomisationSettings["message"] = null;
  if (switchedOn(form, "message")) {
    const pricePence = extraCost(text(form, "messagePrice"));
    if (pricePence === null) errors.messagePrice = "Write the cost as pounds and pence, like 0.80.";

    const rawLength = text(form, "messageMaxLength");
    const maxLength = rawLength === "" ? DEFAULT_MESSAGE_MAX_LENGTH : wholeNumber(rawLength, 1, MESSAGE_LENGTH_LIMIT);
    if (maxLength === null) {
      errors.messageMaxLength = "Give the longest message as a whole number of characters, from 1 to 1,000.";
    }

    if (pricePence !== null && maxLength !== null) message = { pricePence, maxLength };
  }

  let personalisation: CustomisationSettings["personalisation"] = null;
  if (switchedOn(form, "personalisation")) {
    const pricePence = extraCost(text(form, "personalisationPrice"));
    if (pricePence === null) errors.personalisationPrice = "Write the cost as pounds and pence, like 1.50.";

    const fields = parseFields(form);
    if (!fields.ok) errors.fields = fields.error;
    else if (fields.fields.length === 0) errors.fields = "Say what can be personalised: add at least one thing.";

    if (pricePence !== null && fields.ok) {
      personalisation = { pricePence, required: switchedOn(form, "personalisationRequired"), fields: fields.fields };
    }
  }

  const packs = parsePacks(form);
  if (!packs.ok) errors.packs = packs.error;

  if (Object.keys(errors).length > 0 || !packs.ok) return { ok: false, errors };
  return { ok: true, data: { message, personalisation, packs: packs.packs } };
}

// --- The form's values: text as typed, until they are saved -------------

export interface FieldRow {
  /** Only for React to tell rows apart; never posted. */
  key: number;
  label: string;
  kind: FieldKind;
  maxLength: string;
  /** One per line. */
  choices: string;
}

export interface PackRow {
  key: number;
  cards: string;
  price: string;
}

export interface CustomiseValues {
  message: boolean;
  messagePrice: string;
  messageMaxLength: string;
  personalisation: boolean;
  personalisationPrice: string;
  personalisationRequired: boolean;
  fields: FieldRow[];
  packs: PackRow[];
}

let nextKey = 0;

export const blankFieldRow = (): FieldRow => ({
  key: nextKey++,
  label: "",
  kind: "TEXT",
  maxLength: String(DEFAULT_TEXT_MAX_LENGTH),
  choices: "",
});

export const blankPackRow = (): PackRow => ({ key: nextKey++, cards: "", price: "" });

/** 80 reads "0.80": integer arithmetic, so no float can land a penny out. */
export const poundsText = (pence: number) => `${Math.floor(pence / 100)}.${String(pence % 100).padStart(2, "0")}`;

/** A cost of nothing shows as an empty box, which is how "free" is typed. */
const costText = (pence: number) => (pence > 0 ? poundsText(pence) : "");

/** The form as a piece's stored customisation fills it; nothing stored is nothing offered. */
export function customiseValues(
  row: CustomisationRow | null,
  fields: readonly FieldSettings[],
  packs: readonly { cards: number; pricePence: number }[],
): CustomiseValues {
  return {
    message: row?.message ?? false,
    messagePrice: costText(row?.messagePricePence ?? 0),
    messageMaxLength: String(row?.messageMaxLength ?? DEFAULT_MESSAGE_MAX_LENGTH),
    personalisation: row?.personalisation ?? false,
    personalisationPrice: costText(row?.personalisationPricePence ?? 0),
    personalisationRequired: row?.personalisationRequired ?? false,
    fields: fields.map((field) => ({
      key: nextKey++,
      label: field.label,
      kind: field.kind,
      maxLength: field.maxLength === null ? "" : String(field.maxLength),
      choices: field.choices.join("\n"),
    })),
    packs: packs.map((pack) => ({ key: nextKey++, cards: String(pack.cards), price: poundsText(pack.pricePence) })),
  };
}
