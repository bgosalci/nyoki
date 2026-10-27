/**
 * @jest-environment node
 */
import { postageStatus, readPostage, readWeighSheet } from "@/lib/delivery/postage-input";

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.append(key, value);
  return data;
}

const NAMES = { grams: "weightGrams", size: "parcelSize", mm: "thicknessMm" } as const;

describe("readPostage", () => {
  it("reads a weight, a size and a thickness", () => {
    expect(readPostage(form({ weightGrams: " 62 ", parcelSize: "LARGE_LETTER", thicknessMm: "8" }), NAMES)).toEqual({
      facts: { grams: 62, size: "LARGE_LETTER", mm: 8 },
      errors: {},
    });
  });

  it("leaves each part blank to come from the usual", () => {
    expect(readPostage(form({ weightGrams: "", parcelSize: "", thicknessMm: "" }), NAMES)).toEqual({
      facts: { grams: null, size: null, mm: null },
      errors: {},
    });
    expect(readPostage(form({}), NAMES).facts).toEqual({ grams: null, size: null, mm: null });
  });

  it("says what is wrong with each part, by the field's own name", () => {
    expect(readPostage(form({ weightGrams: "45.5", parcelSize: "BOX", thicknessMm: "thin" }), NAMES).errors).toEqual({
      weightGrams: "Weight has to be a whole number of grams.",
      parcelSize: "Choose how it goes in the post.",
      thicknessMm: "Thickness has to be a whole number of millimetres.",
    });
  });

  it("reads fields named for a row, as the weighing sheet posts them", () => {
    const names = { grams: "w.abc", size: "s.abc", mm: "t.abc" };
    expect(readPostage(form({ "w.abc": "100", "s.abc": "SMALL_PARCEL", "t.abc": "" }), names)).toEqual({
      facts: { grams: 100, size: "SMALL_PARCEL", mm: null },
      errors: {},
    });
  });
});

describe("postageStatus", () => {
  it("is weighed with a weight of its own, using a usual with its category's, and not weighed with neither", () => {
    expect(postageStatus({ grams: 62, size: null, mm: null }, { grams: 40, size: "LARGE_LETTER", mm: 5 })).toBe("weighed");
    expect(postageStatus({ grams: null, size: "LARGE_LETTER", mm: null }, { grams: 40, size: "LARGE_LETTER", mm: 5 })).toBe("usual");
    expect(postageStatus({ grams: null, size: null, mm: null }, { grams: null, size: "SMALL_PARCEL", mm: null })).toBe("unweighed");
    expect(postageStatus({ grams: null, size: null, mm: null }, null)).toBe("unweighed");
  });
});

describe("readWeighSheet", () => {
  function sheet(entries: [string, string][]): FormData {
    const data = new FormData();
    for (const [key, value] of entries) data.append(key, value);
    return data;
  }

  it("reads each row the sheet posts, by its piece", () => {
    const form = sheet([
      ["id", "a"],
      ["w.a", "62"],
      ["s.a", ""],
      ["t.a", "8"],
      ["id", "b"],
      ["w.b", ""],
      ["s.b", "SMALL_PARCEL"],
      ["t.b", ""],
    ]);

    expect(readWeighSheet(form)).toEqual({
      rows: [
        { id: "a", facts: { grams: 62, size: null, mm: 8 } },
        { id: "b", facts: { grams: null, size: "SMALL_PARCEL", mm: null } },
      ],
      errors: {},
    });
  });

  it("names every wrong box by its row's own name, and reads each piece once", () => {
    const form = sheet([
      ["id", "a"],
      ["id", "a"],
      ["w.a", "heavy"],
      ["id", "b"],
      ["t.b", "1.5"],
    ]);

    const result = readWeighSheet(form);
    expect(result.rows.map((row) => row.id)).toEqual(["a", "b"]);
    expect(result.errors).toEqual({
      "w.a": "Weight has to be a whole number of grams.",
      "t.b": "Thickness has to be a whole number of millimetres.",
    });
  });
});
