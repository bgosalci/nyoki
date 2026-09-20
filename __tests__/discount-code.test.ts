import {
  codeRedeemability,
  normaliseCode,
  validateDiscountCodeInput,
} from "@/lib/discounts/validate";

const NOW = new Date("2026-06-15T12:00:00Z");

function form(overrides: Record<string, string> = {}): FormData {
  const data = new FormData();
  const base: Record<string, string> = {
    code: "SPRING20",
    type: "PERCENTAGE",
    value: "20",
    startsAt: "2026-06-01T09:00",
    active: "on",
    ...overrides,
  };
  for (const [k, v] of Object.entries(base)) if (v !== "") data.set(k, v);
  return data;
}

describe("normaliseCode", () => {
  it("upper-cases and trims, so shoppers can type it however they like", () => {
    expect(normaliseCode("  spring20 ")).toBe("SPRING20");
  });

  it("strips inner spaces, which people add when reading a code aloud", () => {
    expect(normaliseCode("spring 20")).toBe("SPRING20");
  });
});

describe("validateDiscountCodeInput", () => {
  it("accepts a percentage code", () => {
    const result = validateDiscountCodeInput(form());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toMatchObject({ code: "SPRING20", type: "PERCENTAGE", value: 20, active: true, endsAt: null, minSpendPence: null, usageLimit: null });
  });

  it("stores a fixed amount in pence", () => {
    expect(validateDiscountCodeInput(form({ type: "FIXED_AMOUNT", value: "5.00" })))
      .toMatchObject({ ok: true, data: { value: 500 } });
  });

  it("requires a code", () => {
    expect(validateDiscountCodeInput(form({ code: "" })).ok).toBe(false);
  });

  it("rejects a code with punctuation a shopper would fumble", () => {
    const result = validateDiscountCodeInput(form({ code: "SPRING!20" }));
    expect(!result.ok && result.errors.code).toMatch(/letters, numbers/i);
  });

  it("rejects a code too short to be worth having", () => {
    expect(validateDiscountCodeInput(form({ code: "AB" })).ok).toBe(false);
  });

  it("keeps a percentage between 1 and 100, in whole numbers", () => {
    expect(validateDiscountCodeInput(form({ value: "0" })).ok).toBe(false);
    expect(validateDiscountCodeInput(form({ value: "101" })).ok).toBe(false);
    expect(validateDiscountCodeInput(form({ value: "12.5" })).ok).toBe(false);
    expect(validateDiscountCodeInput(form({ value: "100" })).ok).toBe(true);
  });

  it("takes an optional minimum spend and usage limit", () => {
    expect(validateDiscountCodeInput(form({ minSpend: "25.00", usageLimit: "50" })))
      .toMatchObject({ ok: true, data: { minSpendPence: 2500, usageLimit: 50 } });
  });

  it("rejects a usage limit of nothing, which would make the code dead on arrival", () => {
    const result = validateDiscountCodeInput(form({ usageLimit: "0" }));
    expect(!result.ok && result.errors.usageLimit).toBeTruthy();
  });

  it("requires a start, and an end after it", () => {
    expect(validateDiscountCodeInput(form({ startsAt: "" })).ok).toBe(false);
    const result = validateDiscountCodeInput(form({ endsAt: "2026-05-01T09:00" }));
    expect(!result.ok && result.errors.endsAt).toMatch(/after/i);
  });

  it("reports every problem at once", () => {
    const result = validateDiscountCodeInput(form({ code: "", value: "0", startsAt: "" }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors).sort()).toEqual(["code", "startsAt", "value"]);
  });
});

describe("codeRedeemability", () => {
  const code = {
    type: "PERCENTAGE" as const,
    value: 20,
    minSpendPence: null as number | null,
    usageLimit: null as number | null,
    usedCount: 0,
    startsAt: new Date("2026-06-01T00:00:00Z"),
    endsAt: null as Date | null,
    active: true,
  };

  it("accepts a live code and says what it takes off", () => {
    expect(codeRedeemability(code, { now: NOW, subtotalPence: 5000 })).toEqual({ ok: true, discountPence: 1000 });
  });

  it("turns down a code that has been switched off", () => {
    const result = codeRedeemability({ ...code, active: false }, { now: NOW, subtotalPence: 5000 });
    expect(result).toEqual({ ok: false, reason: "That code is not available." });
  });

  it("turns down a code outside its dates, without saying which end", () => {
    // "Not yet started" tells someone a code exists and is worth guessing at later.
    const early = codeRedeemability({ ...code, startsAt: new Date("2026-07-01T00:00:00Z") }, { now: NOW, subtotalPence: 5000 });
    const late = codeRedeemability({ ...code, endsAt: new Date("2026-06-02T00:00:00Z") }, { now: NOW, subtotalPence: 5000 });

    expect(early).toEqual({ ok: false, reason: "That code is not available." });
    expect(late).toEqual({ ok: false, reason: "That code is not available." });
  });

  it("turns down a code that has been used up", () => {
    const result = codeRedeemability({ ...code, usageLimit: 5, usedCount: 5 }, { now: NOW, subtotalPence: 5000 });
    expect(result).toEqual({ ok: false, reason: "That code is not available." });
  });

  it("says plainly when the basket is too small, which the shopper can act on", () => {
    const result = codeRedeemability({ ...code, minSpendPence: 6000 }, { now: NOW, subtotalPence: 5000 });
    expect(result).toEqual({ ok: false, reason: "That code needs a basket of £60.00 or more." });
  });

  it("never discounts more than the basket", () => {
    const result = codeRedeemability({ ...code, type: "FIXED_AMOUNT", value: 9999 }, { now: NOW, subtotalPence: 5000 });
    expect(result).toEqual({ ok: true, discountPence: 5000 });
  });

  it("rounds a percentage to the nearest penny", () => {
    expect(codeRedeemability(code, { now: NOW, subtotalPence: 999 })).toEqual({ ok: true, discountPence: 200 });
  });
});
