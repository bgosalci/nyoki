import {
  parsePercentToTenths,
  repriceProduct,
  repricedPence,
  validateRepriceInput,
  type Reprice,
} from "@/lib/products/repricing";

const increaseBy = (value: number, rounding: Reprice["rounding"] = "EXACT"): Reprice => ({
  mode: "INCREASE",
  unit: "PERCENT",
  value,
  rounding,
});

describe("parsePercentToTenths", () => {
  it("reads a whole percentage as tenths", () => {
    expect(parsePercentToTenths("10")).toBe(100);
    expect(parsePercentToTenths("100")).toBe(1000);
    expect(parsePercentToTenths("0")).toBe(0);
  });

  it("allows one decimal place, which is exact in tenths", () => {
    expect(parsePercentToTenths("12.5")).toBe(125);
    expect(parsePercentToTenths("0.5")).toBe(5);
  });

  it("tolerates a typed percent sign and surrounding space", () => {
    expect(parsePercentToTenths(" 7% ")).toBe(70);
  });

  it("refuses anything finer than a tenth, rather than rounding it away", () => {
    expect(parsePercentToTenths("1.25")).toBeNull();
  });

  it("reads a percentage larger than a hundred, which is a real thing to type", () => {
    expect(parsePercentToTenths("1010")).toBe(10100);
  });

  it("refuses what is not a percentage at all", () => {
    expect(parsePercentToTenths("")).toBeNull();
    expect(parsePercentToTenths("ten")).toBeNull();
    expect(parsePercentToTenths("-5")).toBeNull();
    expect(parsePercentToTenths("1e3")).toBeNull();
  });
});

describe("repricedPence", () => {
  it("sets a price outright, whatever it was", () => {
    const set: Reprice = { mode: "SET", unit: "AMOUNT", value: 1250, rounding: "EXACT" };

    expect(repricedPence(815, set)).toBe(1250);
    expect(repricedPence(9900, set)).toBe(1250);
  });

  it("adds and subtracts an amount in pence", () => {
    expect(repricedPence(815, { mode: "INCREASE", unit: "AMOUNT", value: 100, rounding: "EXACT" })).toBe(915);
    expect(repricedPence(815, { mode: "DECREASE", unit: "AMOUNT", value: 100, rounding: "EXACT" })).toBe(715);
  });

  it("applies a percentage in integer arithmetic and lands on a whole penny", () => {
    // 815 x 1.1 = 896.5, and half a penny rounds up.
    expect(repricedPence(815, increaseBy(100))).toBe(897);
    expect(repricedPence(815, { mode: "DECREASE", unit: "PERCENT", value: 100, rounding: "EXACT" })).toBe(734);
  });

  it("handles a fractional percentage, which is exact here because the result is stored", () => {
    expect(repricedPence(1000, increaseBy(25))).toBe(1025);
    expect(repricedPence(1999, increaseBy(25))).toBe(2049);
  });

  it("never returns anything but a whole number of pence", () => {
    for (const price of [1, 7, 99, 333, 815, 12345]) {
      for (const tenths of [5, 25, 100, 175, 333]) {
        expect(Number.isInteger(repricedPence(price, increaseBy(tenths)))).toBe(true);
      }
    }
  });

  it("rounds to a tidy figure after the change, not before", () => {
    // 815 + 10% = 897, which then rounds up to 900 rather than 815 -> 800 -> 880.
    expect(repricedPence(815, increaseBy(100, "TEN_PENCE"))).toBe(900);
    expect(repricedPence(815, increaseBy(100, "FIFTY_PENCE"))).toBe(900);
    expect(repricedPence(1249, { mode: "INCREASE", unit: "AMOUNT", value: 0, rounding: "POUND" })).toBe(1200);
  });

  it("never rounds a product down to nothing", () => {
    expect(repricedPence(40, { mode: "INCREASE", unit: "AMOUNT", value: 0, rounding: "POUND" })).toBe(100);
  });

  it("stops at a penny rather than making anything free or negative", () => {
    expect(repricedPence(815, { mode: "DECREASE", unit: "AMOUNT", value: 5000, rounding: "EXACT" })).toBe(1);
    expect(repricedPence(815, { mode: "DECREASE", unit: "PERCENT", value: 1000, rounding: "EXACT" })).toBe(1);
  });
});

describe("repriceProduct", () => {
  it("carries a was-price through when it still sits above the new price", () => {
    const result = repriceProduct({ pricePence: 1000, compareAtPence: 1500 }, increaseBy(100));

    expect(result).toEqual({ pricePence: 1100, compareAtPence: 1500, changed: true });
  });

  it("clears a was-price the new price has caught up with", () => {
    // Left alone it would show "£20.00" struck through beside £20.00, and the
    // product form would reject the row on the next edit.
    const result = repriceProduct({ pricePence: 1800, compareAtPence: 2000 }, increaseBy(200));

    expect(result).toEqual({ pricePence: 2160, compareAtPence: null, changed: true });
  });

  it("reports a change that leaves the price where it was", () => {
    const result = repriceProduct({ pricePence: 1000, compareAtPence: null }, increaseBy(0));

    expect(result.changed).toBe(false);
  });
});

describe("validateRepriceInput", () => {
  const fields = { mode: "INCREASE", unit: "PERCENT", value: "10", rounding: "EXACT" };

  it("accepts a percentage change and returns it in tenths", () => {
    expect(validateRepriceInput(fields)).toEqual({
      ok: true,
      data: { mode: "INCREASE", unit: "PERCENT", value: 100, rounding: "EXACT" },
    });
  });

  it("accepts an amount and returns it in pence", () => {
    expect(validateRepriceInput({ ...fields, unit: "AMOUNT", value: "2.50" })).toEqual({
      ok: true,
      data: { mode: "INCREASE", unit: "AMOUNT", value: 250, rounding: "EXACT" },
    });
  });

  it("asks for a figure when none was given", () => {
    const result = validateRepriceInput({ ...fields, value: "" });

    expect(result).toMatchObject({ ok: false });
    expect(result.ok === false && result.errors.value).toMatch(/how much/i);
  });

  it("explains how to write an amount", () => {
    const result = validateRepriceInput({ ...fields, unit: "AMOUNT", value: "two pounds" });

    expect(result.ok === false && result.errors.value).toMatch(/pounds and pence/i);
  });

  it("explains how to write a percentage", () => {
    const result = validateRepriceInput({ ...fields, value: "a lot" });

    expect(result.ok === false && result.errors.value).toMatch(/percentage/i);
  });

  it("refuses a change of nothing", () => {
    const result = validateRepriceInput({ ...fields, value: "0" });

    expect(result.ok === false && result.errors.value).toMatch(/would not change/i);
  });

  it("refuses to take more than the whole price off", () => {
    const result = validateRepriceInput({ ...fields, mode: "DECREASE", value: "150" });

    expect(result.ok === false && result.errors.value).toMatch(/more than 100/i);
  });

  it("refuses a price set to nothing", () => {
    const result = validateRepriceInput({ ...fields, mode: "SET", unit: "AMOUNT", value: "0" });

    expect(result).toMatchObject({ ok: false });
  });

  it("refuses to set a price to a percentage, which means nothing", () => {
    const result = validateRepriceInput({ ...fields, mode: "SET", unit: "PERCENT", value: "10" });

    expect(result.ok === false && result.errors.unit).toBeTruthy();
  });

  it("allows a tenfold rise, and refuses figures past it as a slip of the keyboard", () => {
    expect(validateRepriceInput({ ...fields, value: "1000" })).toMatchObject({ ok: true });

    const result = validateRepriceInput({ ...fields, value: "1010" });
    expect(result.ok === false && result.errors.value).toMatch(/1,?000/);
  });

  it("refuses a mode, unit or rounding it does not know", () => {
    expect(validateRepriceInput({ ...fields, mode: "TRIPLE" })).toMatchObject({ ok: false });
    expect(validateRepriceInput({ ...fields, unit: "EUROS" })).toMatchObject({ ok: false });
    expect(validateRepriceInput({ ...fields, rounding: "NEAREST_FIVER" })).toMatchObject({ ok: false });
  });
});
