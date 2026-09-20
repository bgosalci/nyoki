import { formatPence, parsePoundsToPence } from "@/lib/money";

describe("parsePoundsToPence", () => {
  it("parses pounds and pence", () => {
    expect(parsePoundsToPence("12.50")).toBe(1250);
  });

  it("parses a whole number of pounds", () => {
    expect(parsePoundsToPence("12")).toBe(1200);
  });

  it("treats a single decimal place as tenths, not hundredths", () => {
    // "12.5" is twelve pounds fifty, not twelve pounds five pence.
    expect(parsePoundsToPence("12.5")).toBe(1250);
  });

  it("accepts zero", () => {
    expect(parsePoundsToPence("0")).toBe(0);
  });

  it("ignores a leading pound sign", () => {
    expect(parsePoundsToPence("£12.50")).toBe(1250);
  });

  it("ignores thousands separators", () => {
    expect(parsePoundsToPence("1,234.56")).toBe(123456);
  });

  it("ignores surrounding whitespace", () => {
    expect(parsePoundsToPence("  12.50  ")).toBe(1250);
  });

  it("rejects more than two decimal places rather than rounding", () => {
    // Rounding here would silently change a price the shopkeeper typed.
    expect(parsePoundsToPence("12.555")).toBeNull();
  });

  it("rejects a negative amount", () => {
    expect(parsePoundsToPence("-5.00")).toBeNull();
  });

  it("rejects text", () => {
    expect(parsePoundsToPence("abc")).toBeNull();
  });

  it("rejects an empty string", () => {
    expect(parsePoundsToPence("")).toBeNull();
  });

  it("rejects a bare decimal point", () => {
    expect(parsePoundsToPence(".")).toBeNull();
  });

  it("does not lose a penny to floating point", () => {
    // 0.1 + 0.2 territory: naive `Math.round(parseFloat(x) * 100)` is wrong
    // for a surprising number of ordinary prices.
    expect(parsePoundsToPence("1.15")).toBe(115);
    expect(parsePoundsToPence("8.15")).toBe(815);
    expect(parsePoundsToPence("1.005")).toBeNull();
    expect(parsePoundsToPence("1234567.89")).toBe(123456789);
  });
});

describe("formatPence", () => {
  it("formats pounds and pence", () => {
    expect(formatPence(1250)).toBe("£12.50");
  });

  it("always shows two decimal places", () => {
    expect(formatPence(1200)).toBe("£12.00");
    expect(formatPence(1205)).toBe("£12.05");
  });

  it("formats zero", () => {
    expect(formatPence(0)).toBe("£0.00");
  });

  it("groups thousands", () => {
    expect(formatPence(123456)).toBe("£1,234.56");
  });

  it("round-trips with the parser", () => {
    for (const pence of [0, 1, 99, 100, 115, 815, 1250, 123456789]) {
      expect(parsePoundsToPence(formatPence(pence))).toBe(pence);
    }
  });
});
