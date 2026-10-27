/**
 * @jest-environment node
 */
import { GIFT_NOTE_MAX, normalisePostcode, parseCheckout } from "@/lib/checkout/validate";

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.append(key, value);
  return data;
}

const address = { name: "Margaret Morgan", line1: "12 Orchard Lane", line2: "", city: "Ilkley", county: "West Yorkshire", postcode: "ls29 9aa" };
const guest = { email: "Ella.Morgan@Example.com ", phone: "", recipient: "gift", giftNote: "Happy Christmas, Mum!", hidePrices: "on", rate: "t48", code: "", address: "new", ...address };

describe("normalisePostcode", () => {
  it("writes a UK postcode the way Royal Mail does, whatever the spacing and case", () => {
    expect(normalisePostcode("ls299aa")).toBe("LS29 9AA");
    expect(normalisePostcode(" sw1a  1aa ")).toBe("SW1A 1AA");
    expect(normalisePostcode("M1 1AE")).toBe("M1 1AE");
  });

  it("is null for anything that is not one", () => {
    expect(normalisePostcode("12345")).toBeNull();
    expect(normalisePostcode("LS29")).toBeNull();
    expect(normalisePostcode("")).toBeNull();
  });
});

describe("parseCheckout", () => {
  it("reads a guest's gift to somebody else", () => {
    const result = parseCheckout(form(guest), { shopperEmail: null });

    expect(result).toEqual({
      ok: true,
      data: {
        email: "ella.morgan@example.com",
        phone: null,
        gift: true,
        giftNote: "Happy Christmas, Mum!",
        hidePrices: true,
        address: { kind: "new", name: "Margaret Morgan", line1: "12 Orchard Lane", line2: null, city: "Ilkley", county: "West Yorkshire", postcode: "LS29 9AA" },
        saveAddress: false,
        rateId: "t48",
        code: null,
      },
    });
  });

  it("keeps no note and no hidden prices for an order that is not a gift", () => {
    const result = parseCheckout(form({ ...guest, recipient: "me" }), { shopperEmail: null });

    expect(result.ok && result.data).toMatchObject({ gift: false, giftNote: null, hidePrices: false });
  });

  it("takes a signed-in shopper's email from their account, not the form", () => {
    const result = parseCheckout(form({ ...guest, email: "someone@else.com" }), { shopperEmail: "ella@example.com" });

    expect(result.ok && result.data.email).toBe("ella@example.com");
  });

  it("uses a saved address by its id, and asks for none of the boxes", () => {
    const result = parseCheckout(form({ email: "a@b.co", recipient: "me", rate: "t48", address: "addr1" }), { shopperEmail: null });

    expect(result.ok && result.data.address).toEqual({ kind: "saved", id: "addr1" });
  });

  it("saves a new address only when asked", () => {
    const result = parseCheckout(form({ ...guest, saveAddress: "on" }), { shopperEmail: "ella@example.com" });

    expect(result.ok && result.data.saveAddress).toBe(true);
  });

  it("names everything missing, in the recipient's words for a gift", () => {
    const result = parseCheckout(form({ email: "nope", recipient: "gift", address: "new", postcode: "12345", phone: "call me" }), { shopperEmail: null });

    expect(result).toEqual({
      ok: false,
      errors: {
        email: "Enter an email address we can reach you at.",
        phone: "Enter a phone number, or leave it blank.",
        name: "Enter their name.",
        line1: "Enter the first line of the address.",
        city: "Enter the town or city.",
        postcode: "Enter a UK postcode, like LS29 9AA.",
        rate: "Choose how it should be sent.",
      },
    });
  });

  it("asks for your name when it is for you", () => {
    const result = parseCheckout(form({ ...guest, recipient: "me", name: "" }), { shopperEmail: null });

    expect(!result.ok && result.errors.name).toBe("Enter your name.");
  });

  it("keeps the note to a length a card can hold", () => {
    const result = parseCheckout(form({ ...guest, giftNote: "x".repeat(GIFT_NOTE_MAX + 1) }), { shopperEmail: null });

    expect(!result.ok && result.errors.giftNote).toBe(`Keep the note to ${GIFT_NOTE_MAX} characters.`);
  });

  it("reads a typed promo code as the shop stores codes", () => {
    const result = parseCheckout(form({ ...guest, code: " winter 10 " }), { shopperEmail: null });

    expect(result.ok && result.data.code).toBe("WINTER10");
  });
});
