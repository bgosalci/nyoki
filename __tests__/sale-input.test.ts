import { validateSaleInput } from "@/lib/sales/validate";

function form(overrides: Record<string, string | string[]> = {}): FormData {
  const data = new FormData();
  const base: Record<string, string | string[]> = {
    name: "Spring sale",
    type: "PERCENTAGE",
    value: "20",
    startsAt: "2026-06-01T09:00",
    active: "on",
    productIds: ["prod_a", "prod_b"],
    ...overrides,
  };

  for (const [key, value] of Object.entries(base)) {
    if (Array.isArray(value)) value.forEach((v) => data.append(key, v));
    else if (value !== "") data.set(key, value);
  }

  return data;
}

describe("validateSaleInput", () => {
  it("accepts a percentage sale across several products", () => {
    const result = validateSaleInput(form());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toMatchObject({
      name: "Spring sale",
      type: "PERCENTAGE",
      value: 20,
      active: true,
      productIds: ["prod_a", "prod_b"],
      endsAt: null,
    });
    expect(result.data.startsAt).toBeInstanceOf(Date);
  });

  it("stores a fixed-amount value in pence", () => {
    const result = validateSaleInput(form({ type: "FIXED_AMOUNT", value: "5.00" }));

    expect(result.ok && result.data.value).toBe(500);
  });

  it("requires a name", () => {
    const result = validateSaleInput(form({ name: "" }));

    expect(!result.ok && result.errors.name).toMatch(/name/i);
  });

  it("rejects an unknown type", () => {
    const result = validateSaleInput(form({ type: "BOGOF" }));

    expect(!result.ok && result.errors.type).toBeTruthy();
  });

  it("keeps a percentage between 1 and 100", () => {
    expect(validateSaleInput(form({ value: "0" })).ok).toBe(false);
    expect(validateSaleInput(form({ value: "101" })).ok).toBe(false);
    expect(validateSaleInput(form({ value: "100" })).ok).toBe(true);
    expect(validateSaleInput(form({ value: "1" })).ok).toBe(true);
  });

  it("rejects a fractional percentage", () => {
    // 12.5% off produces sub-penny discounts on most prices; whole percents
    // keep every discounted price exactly representable.
    const result = validateSaleInput(form({ value: "12.5" }));

    expect(!result.ok && result.errors.value).toMatch(/whole/i);
  });

  it("rejects a fixed amount of nothing", () => {
    const result = validateSaleInput(form({ type: "FIXED_AMOUNT", value: "0.00" }));

    expect(!result.ok && result.errors.value).toBeTruthy();
  });

  it("rejects an unparseable fixed amount", () => {
    const result = validateSaleInput(form({ type: "FIXED_AMOUNT", value: "a fiver" }));

    expect(!result.ok && result.errors.value).toBeTruthy();
  });

  it("requires a start date", () => {
    const result = validateSaleInput(form({ startsAt: "" }));

    expect(!result.ok && result.errors.startsAt).toMatch(/start/i);
  });

  it("rejects an unreadable start date", () => {
    const result = validateSaleInput(form({ startsAt: "next tuesday" }));

    expect(!result.ok && result.errors.startsAt).toBeTruthy();
  });

  it("accepts an end date after the start", () => {
    const result = validateSaleInput(form({ endsAt: "2026-06-30T18:00" }));

    expect(result.ok && result.data.endsAt).toBeInstanceOf(Date);
  });

  it("rejects an end date at or before the start", () => {
    const same = validateSaleInput(form({ endsAt: "2026-06-01T09:00" }));
    const before = validateSaleInput(form({ endsAt: "2026-05-01T09:00" }));

    expect(!same.ok && same.errors.endsAt).toMatch(/after/i);
    expect(!before.ok && before.errors.endsAt).toMatch(/after/i);
  });

  it("requires at least one product", () => {
    const result = validateSaleInput(form({ productIds: [] }));

    expect(!result.ok && result.errors.productIds).toMatch(/product/i);
  });

  it("drops duplicate product ids", () => {
    const result = validateSaleInput(form({ productIds: ["prod_a", "prod_a", "prod_b"] }));

    expect(result.ok && result.data.productIds).toEqual(["prod_a", "prod_b"]);
  });

  it("treats a missing active checkbox as switched off", () => {
    const result = validateSaleInput(form({ active: "" }));

    expect(result.ok && result.data.active).toBe(false);
  });

  it("reports every problem at once", () => {
    const result = validateSaleInput(
      form({ name: "", value: "0", startsAt: "", productIds: [] }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors).sort()).toEqual(["name", "productIds", "startsAt", "value"]);
  });
});
