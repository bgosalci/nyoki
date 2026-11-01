import { normaliseEmail } from "@/lib/auth/authenticate";
import { normaliseCode } from "@/lib/discounts/validate";
import { looksLikeEmail } from "@/lib/email";

/**
 * What a shopper fills in at checkout: who they are, who it is for, where it
 * goes and how it is sent.
 *
 * UK delivery only for now, so the country is not asked and the postcode is
 * checked as a UK one. A gift is sent straight to the recipient, with an
 * optional note for the parcel and, if asked, no prices on the delivery note.
 */

export const GIFT_NOTE_MAX = 300;

/**
 * The browser's boxes set no limit, and whatever is posted is kept on the
 * order and printed on its label. A hundred is room for any real name or
 * line of an address.
 */
export const ADDRESS_LINE_MAX = 100;
export const PHONE_MAX = 30;

// The outward code (one or two letters, a digit, then a letter or digit) and
// the inward code (a digit and two letters), as Royal Mail writes them.
const POSTCODE = /^([A-Z]{1,2}[0-9][A-Z0-9]?)([0-9][A-Z]{2})$/;

/** A UK postcode as Royal Mail writes it - "LS29 9AA" - or null for anything that is not one. */
export function normalisePostcode(raw: string): string | null {
  const match = POSTCODE.exec(raw.replace(/\s+/g, "").toUpperCase());
  return match ? `${match[1]} ${match[2]}` : null;
}

export type CheckoutAddress =
  | { kind: "saved"; id: string }
  | { kind: "new"; name: string; line1: string; line2: string | null; city: string; county: string | null; postcode: string };

export interface CheckoutInput {
  email: string;
  phone: string | null;
  gift: boolean;
  giftNote: string | null;
  hidePrices: boolean;
  address: CheckoutAddress;
  /** Save a new address to the account. */
  saveAddress: boolean;
  rateId: string;
  code: string | null;
}

export type CheckoutField = "email" | "phone" | "giftNote" | "name" | "line1" | "line2" | "city" | "county" | "postcode" | "address" | "rate" | "code";
export type CheckoutErrors = Partial<Record<CheckoutField, string>>;

export type CheckoutValidation = { ok: true; data: CheckoutInput } | { ok: false; errors: CheckoutErrors };

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

const orNull = (value: string) => (value === "" ? null : value);

/**
 * A signed-in shopper's email is their account's: the form shows it but does
 * not send it, and anything sent in its place is ignored.
 */
export function parseCheckout(form: FormData, { shopperEmail }: { shopperEmail: string | null }): CheckoutValidation {
  const errors: CheckoutErrors = {};

  const email = shopperEmail ?? normaliseEmail(text(form, "email"));
  if (!looksLikeEmail(email)) errors.email = "Enter an email address we can reach you at.";

  const phone = orNull(text(form, "phone"));
  if (phone !== null && (phone.length > PHONE_MAX || !/^[0-9+()\-\s]+$/.test(phone) || phone.replace(/\D/g, "").length < 7)) {
    errors.phone = "Enter a phone number, or leave it blank.";
  }

  const gift = text(form, "recipient") === "gift";
  const giftNote = gift ? orNull(text(form, "giftNote")) : null;
  if (giftNote !== null && giftNote.length > GIFT_NOTE_MAX) errors.giftNote = `Keep the note to ${GIFT_NOTE_MAX} characters.`;

  const chosen = text(form, "address");
  let address: CheckoutAddress;
  if (chosen !== "" && chosen !== "new") {
    address = { kind: "saved", id: chosen };
  } else {
    const name = text(form, "name");
    const line1 = text(form, "line1");
    const line2 = orNull(text(form, "line2"));
    const city = text(form, "city");
    const county = orNull(text(form, "county"));
    const postcode = normalisePostcode(text(form, "postcode"));
    const tooLong = (value: string | null) => value !== null && value.length > ADDRESS_LINE_MAX;
    if (name === "") errors.name = gift ? "Enter their name." : "Enter your name.";
    else if (tooLong(name)) errors.name = `Keep the name to ${ADDRESS_LINE_MAX} characters.`;
    if (line1 === "") errors.line1 = "Enter the first line of the address.";
    else if (tooLong(line1)) errors.line1 = `Keep this line to ${ADDRESS_LINE_MAX} characters.`;
    if (tooLong(line2)) errors.line2 = `Keep this line to ${ADDRESS_LINE_MAX} characters.`;
    if (city === "") errors.city = "Enter the town or city.";
    else if (tooLong(city)) errors.city = `Keep the town or city to ${ADDRESS_LINE_MAX} characters.`;
    if (tooLong(county)) errors.county = `Keep the county to ${ADDRESS_LINE_MAX} characters.`;
    if (postcode === null) errors.postcode = "Enter a UK postcode, like LS29 9AA.";
    address = { kind: "new", name, line1, line2, city, county, postcode: postcode ?? "" };
  }

  const rateId = text(form, "rate");
  if (rateId === "") errors.rate = "Choose how it should be sent.";

  const code = normaliseCode(text(form, "code"));

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      email,
      phone,
      gift,
      giftNote,
      hidePrices: gift && form.get("hidePrices") !== null,
      address,
      saveAddress: address.kind === "new" && form.get("saveAddress") !== null,
      rateId,
      code: orNull(code),
    },
  };
}
