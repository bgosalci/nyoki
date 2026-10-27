/**
 * @jest-environment node
 */
import { deliveryDays, validateDeliveryRate } from "@/lib/delivery/validate";

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.append(key, value);
  return data;
}

const tracked48 = { name: " Royal Mail Tracked 48 ", price: "3.95", freeOver: "40", minDays: "2", maxDays: "3", active: "on" };

describe("validateDeliveryRate", () => {
  it("reads an option, with its money in pence", () => {
    expect(validateDeliveryRate(form(tracked48))).toEqual({
      ok: true,
      data: { name: "Royal Mail Tracked 48", pricePence: 395, freeOverPence: 4000, minDays: 2, maxDays: 3, active: true },
    });
  });

  it("leaves out what is left blank: never free, no days said, and switched off when unticked", () => {
    const result = validateDeliveryRate(form({ name: "Collect from the studio", price: "0", freeOver: "", minDays: "", maxDays: "" }));

    expect(result).toEqual({
      ok: true,
      data: { name: "Collect from the studio", pricePence: 0, freeOverPence: null, minDays: null, maxDays: null, active: false },
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

describe("deliveryDays", () => {
  it("says how long it takes, in working days", () => {
    expect(deliveryDays({ minDays: 2, maxDays: 3 })).toBe("2 to 3 working days");
    expect(deliveryDays({ minDays: 1, maxDays: 1 })).toBe("1 working day");
    expect(deliveryDays({ minDays: null, maxDays: 5 })).toBe("Up to 5 working days");
    expect(deliveryDays({ minDays: 2, maxDays: null })).toBe("2 working days or more");
    expect(deliveryDays({ minDays: null, maxDays: null })).toBeNull();
  });
});
