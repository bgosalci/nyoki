import { VAT_RATES, parseQuantityToHundredths, validatePricingInput } from "@/lib/costing/validate";

function form(fields: Record<string, string | string[]>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    for (const entry of Array.isArray(value) ? value : [value]) data.append(key, entry);
  }
  return data;
}

const good = {
  price: "12.99",
  compareAtPrice: "",
  vatRate: "20",
  lineLabel: ["Card & envelope", "Post & packaging"],
  lineUnit: ["0.80", "1.06"],
  lineQuantity: ["1", "1"],
};

describe("parseQuantityToHundredths", () => {
  it("reads whole and half quantities exactly", () => {
    expect(parseQuantityToHundredths("1")).toBe(100);
    expect(parseQuantityToHundredths("6.5")).toBe(650);
    expect(parseQuantityToHundredths("0.25")).toBe(25);
  });

  it("refuses anything finer than a hundredth, or not a quantity at all", () => {
    expect(parseQuantityToHundredths("1.125")).toBeNull();
    expect(parseQuantityToHundredths("two")).toBeNull();
    expect(parseQuantityToHundredths("-1")).toBeNull();
  });
});

describe("validatePricingInput", () => {
  it("takes the price, the VAT and every line of cost", () => {
    expect(validatePricingInput(form(good))).toEqual({
      ok: true,
      data: {
        pricePence: 1299,
        compareAtPence: null,
        vatRate: 20,
        lines: [
          { label: "Card & envelope", unitPence: 80, quantityHundredths: 100 },
          { label: "Post & packaging", unitPence: 106, quantityHundredths: 100 },
        ],
      },
    });
  });

  it("insists on a price, since a piece at nothing is a piece given away", () => {
    for (const price of ["", "0", "0.00"]) {
      const result = validatePricingInput(form({ ...good, price }));
      expect(result.ok === false && result.errors.price).toBeTruthy();
    }
  });

  it("insists a was-price is higher than the price, or there is nothing to strike through", () => {
    const result = validatePricingInput(form({ ...good, compareAtPrice: "10.00" }));

    expect(result.ok === false && result.errors.compareAtPrice).toBeTruthy();
  });

  it("knows only the UK's VAT rates", () => {
    expect(VAT_RATES).toEqual([20, 5, 0]);
    expect(validatePricingInput(form({ ...good, vatRate: "17" })).ok).toBe(false);
  });

  it("drops a spare line left entirely empty", () => {
    const result = validatePricingInput(
      form({ ...good, lineLabel: [...good.lineLabel, ""], lineUnit: [...good.lineUnit, ""], lineQuantity: [...good.lineQuantity, ""] }),
    );

    expect(result.ok === true && result.data.lines).toHaveLength(2);
  });

  it("counts a line as one when no quantity is given", () => {
    const result = validatePricingInput(form({ ...good, lineQuantity: ["", "1"] }));

    expect(result.ok === true && result.data.lines[0].quantityHundredths).toBe(100);
  });

  it("asks for a name on any line that has a cost", () => {
    const result = validatePricingInput(form({ ...good, lineLabel: ["", "Post & packaging"] }));

    expect(result.ok === false && result.errors.lines).toMatch(/line 1/i);
  });

  it("says which line has a cost it cannot read", () => {
    const result = validatePricingInput(form({ ...good, lineUnit: ["0.80", "one pound"] }));

    expect(result.ok === false && result.errors.lines).toMatch(/line 2/i);
  });

  it("allows a piece with no costs yet, priced before it has been costed", () => {
    const result = validatePricingInput(form({ price: "8.50", vatRate: "20" }));

    expect(result.ok === true && result.data.lines).toEqual([]);
  });
});
