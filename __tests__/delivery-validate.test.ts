/**
 * @jest-environment node
 */
import { deliveryDays, priceRange, validateDeliveryRate, validateDeliverySettings } from "@/lib/delivery/validate";

function form(entries: Record<string, string | string[]>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) for (const one of [value].flat()) data.append(key, one);
  return data;
}

const tracked48 = { name: " Royal Mail Tracked 48 ", price: "3.95", freeOver: "40", minDays: "2", maxDays: "3", active: "on" };

describe("validateDeliveryRate", () => {
  it("reads an option, with its money in pence", () => {
    expect(validateDeliveryRate(form(tracked48))).toEqual({
      ok: true,
      data: { name: "Royal Mail Tracked 48", pricePence: 395, byWeight: false, freeOverPence: 4000, minDays: 2, maxDays: 3, active: true },
    });
  });

  it("leaves out what is left blank: never free, no days said, and switched off when unticked", () => {
    const result = validateDeliveryRate(form({ name: "Collect from the studio", price: "0", freeOver: "", minDays: "", maxDays: "" }));

    expect(result).toEqual({
      ok: true,
      data: { name: "Collect from the studio", pricePence: 0, byWeight: false, freeOverPence: null, minDays: null, maxDays: null, active: false },
    });
  });

  it("names everything wrong", () => {
    const result = validateDeliveryRate(form({ name: " ", price: "3.999", freeOver: "lots", minDays: "two", maxDays: "1.5" }));

    expect(result).toEqual({
      ok: false,
      errors: {
        name: "Give it a name shoppers will recognise, like Royal Mail Tracked 48.",
        price: "Write the price as pounds and pence, like 3.95.",
        freeOver: "Write the amount as pounds and pence, like 40.00, or leave it blank.",
        minDays: "Write a whole number of days, or leave it blank.",
        maxDays: "Write a whole number of days, or leave it blank.",
      },
    });
  });

  it("will not take a longest wait shorter than the shortest", () => {
    const result = validateDeliveryRate(form({ ...tracked48, minDays: "3", maxDays: "2" }));

    expect(result).toEqual({ ok: false, errors: { maxDays: "The longest has to be at least the shortest." } });
  });
});

describe("validateDeliveryRate, priced by size and weight", () => {
  const byWeight = {
    ...tracked48,
    priced: "weight",
    bandSize: ["SMALL_PARCEL", "LARGE_LETTER", ""],
    bandUpTo: ["2000", "1000", ""],
    bandPrice: ["3.75", "2.90", ""],
  };

  it("reads the price list, smallest size first, and skips a row left empty", () => {
    const result = validateDeliveryRate(form(byWeight));

    expect(result).toEqual({
      ok: true,
      data: {
        name: "Royal Mail Tracked 48",
        pricePence: 395,
        byWeight: true,
        bands: [
          { size: "LARGE_LETTER", upToGrams: 1000, pricePence: 290 },
          { size: "SMALL_PARCEL", upToGrams: 2000, pricePence: 375 },
        ],
        freeOverPence: 4000,
        minDays: 2,
        maxDays: 3,
        active: true,
      },
    });
  });

  it("does not need the one price, which is kept as it was when it can be read and nothing otherwise", () => {
    const result = validateDeliveryRate(form({ ...byWeight, price: "" }));
    expect(result.ok && result.data.pricePence).toBe(0);
  });

  it("needs at least one band", () => {
    const result = validateDeliveryRate(form({ ...byWeight, bandSize: [""], bandUpTo: [""], bandPrice: [""] }));
    expect(result).toEqual({ ok: false, errors: { bands: "Add a price for at least one size, or fill in Royal Mail's prices." } });
  });

  it("names the row that is wrong, and what is wrong with it", () => {
    expect(validateDeliveryRate(form({ ...byWeight, bandUpTo: ["2 kg", "1000", ""] }))).toEqual({
      ok: false,
      errors: { bands: "Row 1: write the weight it goes up to in whole grams, like 2000." },
    });
    expect(validateDeliveryRate(form({ ...byWeight, bandPrice: ["3.75", "", ""] }))).toEqual({
      ok: false,
      errors: { bands: "Row 2: write the price as pounds and pence, like 2.90." },
    });
    expect(validateDeliveryRate(form({ ...byWeight, bandSize: ["SMALL_PARCEL", "", ""] }))).toEqual({
      ok: false,
      errors: { bands: "Row 2: choose a size." },
    });
    expect(validateDeliveryRate(form({ ...byWeight, bandUpTo: ["0", "1000", ""] }))).toEqual({
      ok: false,
      errors: { bands: "Row 1: write the weight it goes up to in whole grams, like 2000." },
    });
  });

  it("will not take the same size and weight twice", () => {
    const result = validateDeliveryRate(form({ ...byWeight, bandSize: ["LARGE_LETTER", "LARGE_LETTER"], bandUpTo: ["1000", "1000"], bandPrice: ["2.90", "3.00"] }));
    expect(result).toEqual({ ok: false, errors: { bands: "Two rows are for a Large Letter up to 1000 g. Remove one." } });
  });

  it("leaves the price list alone when the option is priced at one price", () => {
    const result = validateDeliveryRate(form({ ...byWeight, priced: "one", bandUpTo: ["nonsense", "", ""] }));
    expect(result.ok && result.data).toEqual({ name: "Royal Mail Tracked 48", pricePence: 395, byWeight: false, freeOverPence: 4000, minDays: 2, maxDays: 3, active: true });
  });
});

describe("priceRange", () => {
  it("says what an option charges", () => {
    expect(priceRange({ byWeight: false, pricePence: 395, bands: [] })).toBe("£3.95");
    expect(priceRange({ byWeight: false, pricePence: 0, bands: [] })).toBe("Free");
    expect(
      priceRange({
        byWeight: true,
        pricePence: 395,
        bands: [
          { size: "SMALL_PARCEL", upToGrams: 2000, pricePence: 375 },
          { size: "LARGE_LETTER", upToGrams: 1000, pricePence: 290 },
          { size: "MEDIUM_PARCEL", upToGrams: 20000, pricePence: 1225 },
        ],
      }),
    ).toBe("By size and weight · £2.90 to £12.25");
    expect(priceRange({ byWeight: true, pricePence: 0, bands: [{ size: "SMALL_PARCEL", upToGrams: 2000, pricePence: 375 }] })).toBe("By size and weight · £3.75");
    expect(priceRange({ byWeight: true, pricePence: 0, bands: [] })).toBe("By size and weight · no prices yet");
  });
});

describe("validateDeliverySettings", () => {
  const settings = {
    "LETTER.grams": "10",
    "LETTER.mm": "1",
    "LARGE_LETTER.grams": "45",
    "LARGE_LETTER.mm": "2",
    "SMALL_PARCEL.grams": "120",
    "MEDIUM_PARCEL.grams": "300",
    unweighedGrams: "500",
    unweighedSize: "SMALL_PARCEL",
  };

  it("reads the packing for each size and what a piece not weighed counts as", () => {
    expect(validateDeliverySettings(form(settings))).toEqual({
      ok: true,
      data: {
        unweighedGrams: 500,
        unweighedSize: "SMALL_PARCEL",
        packing: {
          LETTER: { grams: 10, mm: 1 },
          LARGE_LETTER: { grams: 45, mm: 2 },
          SMALL_PARCEL: { grams: 120, mm: 0 },
          MEDIUM_PARCEL: { grams: 300, mm: 0 },
        },
      },
    });
  });

  it("names each box that is wrong", () => {
    expect(validateDeliverySettings(form({ ...settings, "LARGE_LETTER.mm": "two", "SMALL_PARCEL.grams": "", unweighedGrams: "0", unweighedSize: "BOX" }))).toEqual({
      ok: false,
      errors: {
        "LARGE_LETTER.mm": "Whole millimetres, like 2.",
        "SMALL_PARCEL.grams": "Whole grams, like 110.",
        unweighedGrams: "Write a weight in whole grams, like 500.",
        unweighedSize: "Choose a size.",
      },
    });
  });
});

describe("deliveryDays", () => {
  it("says how long it takes, in working days", () => {
    expect(deliveryDays({ minDays: 2, maxDays: 3 })).toBe("2 to 3 working days");
    expect(deliveryDays({ minDays: 1, maxDays: 1 })).toBe("1 working day");
    expect(deliveryDays({ minDays: null, maxDays: 5 })).toBe("Up to 5 working days");
    expect(deliveryDays({ minDays: 2, maxDays: null })).toBe("2 working days or more");
    expect(deliveryDays({ minDays: null, maxDays: null })).toBeNull();
  });
});
