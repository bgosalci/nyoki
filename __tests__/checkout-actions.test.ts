/**
 * @jest-environment node
 */
import type { PricedLine } from "@/lib/basket/review";

const orderingOpen = jest.fn();
const findBasketId = jest.fn();
const reviewAndSave = jest.fn();
const currentCustomer = jest.fn();
const ratesFor = jest.fn();
const addressFindFirst = jest.fn();
const addressCreate = jest.fn();
const addressDeleteMany = jest.fn();
const codeFindUnique = jest.fn();
const customerUpsert = jest.fn();
const orderFindFirst = jest.fn();
const orderCreate = jest.fn();
const orderUpdate = jest.fn();
const itemDeleteMany = jest.fn();
const refresh = jest.fn();
const redirect = jest.fn((path: string) => {
  throw new Error(`NEXT_REDIRECT ${path}`);
});

jest.mock("server-only", () => ({}));
// jest.mock() does not go through the @/ alias, so these are relative.
jest.mock("../src/lib/db", () => {
  // The transaction hands its work the same tables, so what is written inside it is seen.
  const tx = {
    address: { findFirst: (a: unknown) => addressFindFirst(a), create: (a: unknown) => addressCreate(a), deleteMany: (a: unknown) => addressDeleteMany(a) },
    customer: { upsert: (a: unknown) => customerUpsert(a) },
    order: { findFirst: (a: unknown) => orderFindFirst(a), create: (a: unknown) => orderCreate(a), update: (a: unknown) => orderUpdate(a) },
    orderItem: { deleteMany: (a: unknown) => itemDeleteMany(a) },
  };
  return {
    db: {
      ...tx,
      discountCode: { findUnique: (a: unknown) => codeFindUnique(a) },
      $transaction: (work: (client: typeof tx) => Promise<unknown>) => work(tx),
    },
  };
});
jest.mock("next/cache", () => ({ refresh: () => refresh() }));
jest.mock("next/navigation", () => ({ redirect: (path: string) => redirect(path) }));
jest.mock("../src/lib/ordering", () => ({ orderingOpen: () => orderingOpen() }));
jest.mock("../src/lib/account/dal", () => ({ currentCustomer: () => currentCustomer() }));
jest.mock("../src/lib/basket/store", () => ({
  findBasketId: () => findBasketId(),
  reviewAndSave: (...args: unknown[]) => reviewAndSave(...args),
  ratesFor: (...args: unknown[]) => ratesFor(...args),
}));

const attempt = jest.fn();
const forget = jest.fn();
jest.mock("../src/lib/rate-limit", () => ({
  ...jest.requireActual("../src/lib/rate-limit"),
  attempt: (...args: unknown[]) => attempt(...args),
  requestAddress: async () => "address-hash",
}));

import { applyCode, continueToPayment } from "@/app/(checkout)/checkout/actions";
import { CODE_MISSES_PER_ADDRESS, WAIT_A_WHILE } from "@/lib/rate-limit";

const line = (overrides: Partial<PricedLine>): PricedLine => ({
  id: "l1",
  productId: "card",
  slug: "snowflake-card",
  name: "Silver Snowflake Card",
  image: "/uploads/snowflake.jpg",
  sku: "SNOW-1",
  variantId: null,
  variantName: null,
  stored: { variantId: null, packId: "p3", message: "Printed message", messageText: "Merry Christmas", personalise: false, personalisation: {} },
  quantity: 1,
  maxQuantity: 3,
  unitPence: 2190,
  wasUnitPence: null,
  saleName: null,
  totalPence: 2190,
  vatRate: 20,
  details: [{ label: "Single or pack", value: "Pack of 3" }],
  madeToOrder: false,
  leadTimeDays: null,
  postage: { grams: 40, size: "LARGE_LETTER", mm: 5 },
  units: 1,
  ...overrides,
});

const lines = [line({}), line({ id: "l2", productId: "hat", name: "Merino Hat", variantId: "v1", variantName: "Seascape / 2-3 years", unitPence: 4500, totalPence: 4500, vatRate: 0, details: [] }), line({ id: "l3", productId: "reindeer", name: "Reindeer Card", unitPence: 400, quantity: 2, totalPence: 800, details: [] })];
const review = { lines, changes: [], updates: [], pieces: 4, subtotalPence: 7490 };

// Tracked 48 as checkout prices it for this basket's parcel.
const tracked48 = { id: "t48", name: "Royal Mail Tracked 48", pricePence: 375, freeOverPence: 4000, minDays: 2, maxDays: 3, parcel: { size: "SMALL_PARCEL", grams: 352, mm: null } };
const winter10 = { id: "code1", code: "WINTER10", type: "PERCENTAGE", value: 10, minSpendPence: null, usageLimit: null, usedCount: 0, startsAt: new Date("2026-10-01"), endsAt: null, active: true };

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.append(key, value);
  return data;
}

const gift = {
  email: "ella.morgan@example.com",
  phone: "",
  recipient: "gift",
  giftNote: "Happy Christmas, Mum!",
  hidePrices: "on",
  address: "new",
  name: "Margaret Morgan",
  line1: "12 Orchard Lane",
  line2: "",
  city: "Ilkley",
  county: "West Yorkshire",
  postcode: "ls29 9aa",
  rate: "t48",
  code: "WINTER10",
};

beforeEach(() => {
  jest.clearAllMocks();
  orderingOpen.mockReturnValue(true);
  findBasketId.mockResolvedValue("b1");
  reviewAndSave.mockResolvedValue(review);
  currentCustomer.mockResolvedValue(null);
  ratesFor.mockResolvedValue([tracked48]);
  codeFindUnique.mockResolvedValue(winter10);
  customerUpsert.mockResolvedValue({ id: "guest1" });
  addressCreate.mockResolvedValue({ id: "addr-new" });
  orderFindFirst.mockResolvedValue(null);
  orderCreate.mockResolvedValue({ id: "o1" });
  attempt.mockResolvedValue({ over: false, forget });
});

describe("continueToPayment", () => {
  it("saves a guest's gift as an order waiting to be paid, every line copied, and goes on to pay", async () => {
    await expect(continueToPayment({ errors: {} }, form(gift))).rejects.toThrow("NEXT_REDIRECT /checkout/pay");

    // A guest is a customer with no password, found by email; one already there is never changed.
    expect(customerUpsert).toHaveBeenCalledWith({ where: { email: "ella.morgan@example.com" }, create: { email: "ella.morgan@example.com", phone: null }, update: {} });
    // The address the order goes to belongs to no account, so editing a saved one later cannot move it.
    expect(addressCreate).toHaveBeenCalledWith({
      data: { customerId: null, name: "Margaret Morgan", line1: "12 Orchard Lane", line2: null, city: "Ilkley", county: "West Yorkshire", postcode: "LS29 9AA", country: "GB", phone: null },
    });
    expect(orderCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: "PENDING",
        basketId: "b1",
        customerId: "guest1",
        email: "ella.morgan@example.com",
        // Joined to the guest row by email, but not placed signed in: it is
        // never listed in an account that claims that email later.
        signedIn: false,
        subtotalPence: 7490,
        discountPence: 749,
        shippingPence: 0,
        taxPence: 449,
        totalPence: 6741,
        discountCodeId: "code1",
        shippingAddressId: "addr-new",
        shippingMethod: "Royal Mail Tracked 48",
        parcelSize: "SMALL_PARCEL",
        parcelGrams: 352,
        parcelMm: null,
        gift: true,
        giftNote: "Happy Christmas, Mum!",
        hidePrices: true,
        items: {
          create: expect.arrayContaining([
            expect.objectContaining({ productName: "Silver Snowflake Card", unitPricePence: 2190, quantity: 1, vatRate: 20, details: [{ label: "Single or pack", value: "Pack of 3" }] }),
            expect.objectContaining({ productName: "Merino Hat", variantName: "Seascape / 2-3 years", vatRate: 0 }),
          ]),
        },
      }),
    });
  });

  it("updates the order already waiting for this basket, rather than making a second", async () => {
    orderFindFirst.mockResolvedValue({ id: "o1", shippingAddressId: "addr-old" });

    await expect(continueToPayment({ errors: {} }, form(gift))).rejects.toThrow("NEXT_REDIRECT /checkout/pay");

    expect(orderFindFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { basketId: "b1", status: "PENDING" } }));
    expect(orderCreate).not.toHaveBeenCalled();
    expect(itemDeleteMany).toHaveBeenCalledWith({ where: { orderId: "o1" } });
    expect(orderUpdate).toHaveBeenCalledWith({ where: { id: "o1" }, data: expect.objectContaining({ totalPence: 6741, shippingAddressId: "addr-new" }) });
    expect(addressDeleteMany).toHaveBeenCalledWith({ where: { id: "addr-old", customerId: null } });
  });

  it("uses a signed-in shopper's own account and email, and a saved address of theirs", async () => {
    currentCustomer.mockResolvedValue({ id: "c1", email: "ella@example.com", name: "Ella Morgan" });
    addressFindFirst.mockResolvedValue({ name: "Ella Morgan", line1: "3 Mill Yard", line2: null, city: "Leeds", county: null, postcode: "LS1 4AB", phone: null });

    await expect(continueToPayment({ errors: {} }, form({ recipient: "me", address: "saved1", rate: "t48" }))).rejects.toThrow("NEXT_REDIRECT");

    expect(addressFindFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "saved1", customerId: "c1" } }));
    expect(customerUpsert).not.toHaveBeenCalled();
    expect(orderCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ customerId: "c1", email: "ella@example.com", signedIn: true, gift: false, giftNote: null }) });
    expect(addressCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ customerId: null, line1: "3 Mill Yard" }) });
  });

  it("refuses an address that is not the shopper's", async () => {
    currentCustomer.mockResolvedValue({ id: "c1", email: "ella@example.com", name: "Ella" });
    addressFindFirst.mockResolvedValue(null);

    const result = await continueToPayment({ errors: {} }, form({ recipient: "me", address: "someone-elses", rate: "t48" }));

    expect(result).toEqual({ errors: { address: "Choose where it should go." } });
    expect(orderCreate).not.toHaveBeenCalled();
  });

  it("saves a new address to the account when asked, beside the order's own copy", async () => {
    currentCustomer.mockResolvedValue({ id: "c1", email: "ella@example.com", name: "Ella" });

    await expect(continueToPayment({ errors: {} }, form({ ...gift, saveAddress: "on" }))).rejects.toThrow("NEXT_REDIRECT");

    expect(addressCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ customerId: "c1", postcode: "LS29 9AA" }) });
    expect(addressCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ customerId: null, postcode: "LS29 9AA" }) });
  });

  it("says what is wrong with the form, and saves nothing", async () => {
    const result = await continueToPayment({ errors: {} }, form({ ...gift, postcode: "nowhere" }));

    expect(result).toEqual({ errors: { postcode: "Enter a UK postcode, like LS29 9AA." } });
    expect(orderCreate).not.toHaveBeenCalled();
  });

  it("refuses a delivery option no longer offered, or not offered for this parcel", async () => {
    ratesFor.mockResolvedValue([{ ...tracked48, id: "t24" }]);

    const result = await continueToPayment({ errors: {} }, form(gift));

    expect(ratesFor).toHaveBeenCalledWith(lines);
    expect(result).toEqual({ errors: { rate: "That way of sending it is no longer offered. Please choose another." } });
    expect(orderCreate).not.toHaveBeenCalled();
  });

  it("charges delivery at the price worked out for the basket's parcel", async () => {
    ratesFor.mockResolvedValue([{ ...tracked48, freeOverPence: null }]);

    await expect(continueToPayment({ errors: {} }, form(gift))).rejects.toThrow("NEXT_REDIRECT");

    // £74.90 less 10% is £67.41, and the Small Parcel's £3.75 on top.
    expect(orderCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ shippingPence: 375, totalPence: 7116 }) });
  });

  it("refuses a code that cannot be used, in the same words for every reason", async () => {
    codeFindUnique.mockResolvedValue({ ...winter10, endsAt: new Date("2026-10-02") });

    const result = await continueToPayment({ errors: {} }, form(gift));

    expect(result).toEqual({ errors: { code: "That code is not available." } });
    expect(orderCreate).not.toHaveBeenCalled();
  });

  it("stops when the basket changed on the way, and says what changed", async () => {
    reviewAndSave.mockResolvedValue({ ...review, changes: ["Reindeer Card is now £5.00 each. It was £4.00 when you added it."] });

    const result = await continueToPayment({ errors: {} }, form(gift));

    expect(result).toEqual({ errors: {}, notice: "Your basket has changed. Reindeer Card is now £5.00 each. It was £4.00 when you added it." });
    expect(orderCreate).not.toHaveBeenCalled();
    expect(refresh).toHaveBeenCalled();
  });

  it("does nothing with an empty basket, or while ordering is closed", async () => {
    reviewAndSave.mockResolvedValue({ ...review, lines: [] });
    expect(await continueToPayment({ errors: {} }, form(gift))).toEqual({ errors: {}, notice: "Your basket is empty." });

    orderingOpen.mockReturnValue(false);
    expect(await continueToPayment({ errors: {} }, form(gift))).toEqual({ errors: {}, notice: "Online ordering opens soon." });
    expect(orderCreate).not.toHaveBeenCalled();
  });
});

describe("applyCode", () => {
  it("says what a code takes off this basket", async () => {
    expect(await applyCode(" winter10 ")).toEqual({ ok: true, code: "WINTER10", discountPence: 749, label: "10% off" });
    expect(codeFindUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { code: "WINTER10" } }));
  });

  it("says the same of every code it will not take, so guessing learns nothing", async () => {
    codeFindUnique.mockResolvedValue(null);
    expect(await applyCode("NOPE")).toEqual({ ok: false, message: "That code is not available." });

    codeFindUnique.mockResolvedValue({ ...winter10, active: false });
    expect(await applyCode("WINTER10")).toEqual({ ok: false, message: "That code is not available." });
  });

  it("says plainly what a minimum spend needs", async () => {
    codeFindUnique.mockResolvedValue({ ...winter10, minSpendPence: 10000 });

    expect(await applyCode("WINTER10")).toEqual({ ok: false, message: "That code needs a basket of £100.00 or more." });
  });

  it("asks for a code when none was typed", async () => {
    expect(await applyCode("  ")).toEqual({ ok: false, message: "Type a code first." });
    expect(codeFindUnique).not.toHaveBeenCalled();
  });
});

describe("guessing at promo codes", () => {
  // Codes are words a shop chooses - XMAS10, WINTER20 - and words can be
  // guessed. Every miss reads the same; past ten from one address in a
  // quarter of an hour, the shop stops looking.
  it("counts a code it will not take against the address it came from", async () => {
    codeFindUnique.mockResolvedValue(null);

    await applyCode("NOPE");

    expect(attempt).toHaveBeenCalledWith(CODE_MISSES_PER_ADDRESS, "address-hash");
    expect(forget).not.toHaveBeenCalled();
  });

  it("takes a code that works back off the count", async () => {
    await applyCode("WINTER10");

    expect(forget).toHaveBeenCalled();
  });

  // Its message already says the code exists, and trying it again as the
  // basket grows is shopping, not guessing.
  it("takes a code refused only for its minimum spend back off the count", async () => {
    codeFindUnique.mockResolvedValue({ ...winter10, minSpendPence: 10000 });

    await applyCode("WINTER10");

    expect(forget).toHaveBeenCalled();
  });

  it("stops looking codes up for an address that has missed too often", async () => {
    attempt.mockResolvedValue({ over: true, forget });

    expect(await applyCode("WINTER10")).toEqual({ ok: false, message: WAIT_A_WHILE });
    expect(codeFindUnique).not.toHaveBeenCalled();
  });

  it("holds continuing to payment with a code to the same limit", async () => {
    attempt.mockResolvedValue({ over: true, forget });

    expect(await continueToPayment({ errors: {} }, form({ ...gift, code: "WINTER10" }))).toEqual({ errors: { code: WAIT_A_WHILE } });
    expect(codeFindUnique).not.toHaveBeenCalled();
    expect(orderCreate).not.toHaveBeenCalled();
  });

  it("counts a code continuing to payment would not take, and not one it would", async () => {
    codeFindUnique.mockResolvedValue(null);
    await continueToPayment({ errors: {} }, form({ ...gift, code: "NOPE" }));
    expect(attempt).toHaveBeenCalledWith(CODE_MISSES_PER_ADDRESS, "address-hash");
    expect(forget).not.toHaveBeenCalled();

    codeFindUnique.mockResolvedValue(winter10);
    await expect(continueToPayment({ errors: {} }, form({ ...gift, code: "WINTER10" }))).rejects.toThrow("NEXT_REDIRECT");
    expect(forget).toHaveBeenCalled();
  });
});
