import { isEmptyTemplate, toEntry, type SheetRow } from "@/lib/costing/import";

const row = (overrides: Partial<SheetRow> = {}): SheetRow => ({
  file: "CARDS",
  sheet: "Christening",
  row: 5,
  vat: 0.2,
  qty: 1,
  price: 12.99,
  note: "",
  photo: "CARDS-012.jpg",
  phash: "ff00ff00ff00ff00",
  filename: "christening_card.jpg",
  lines: [
    { label: "card & envelope", amount: 0.8, quantity: 1 },
    { label: "Making  Cost ", amount: 2, quantity: 1 },
  ],
  ...overrides,
});

describe("toEntry", () => {
  it("says where the row came from in words a person can find it by", () => {
    // The spreadsheet shows row 6 where the file counts from nought.
    expect(toEntry(row()).entry.source).toBe("Cards / Christening / row 6");
  });

  it("brings pounds in as pence and the VAT as a whole percent", () => {
    const { entry } = toEntry(row());

    expect(entry.pricePence).toBe(1299);
    expect(entry.vatRate).toBe(20);
    expect(entry.lines[0]).toEqual({ label: "Card & envelope", unitPence: 80, quantityHundredths: 100 });
  });

  it("reads through the spreadsheet's float noise to the penny that was meant", () => {
    // Numbers stores 5p as 0.049999999999999996.
    const { entry, warnings } = toEntry(row({ lines: [{ label: "bag", amount: 0.049999999999999996, quantity: 1 }] }));

    expect(entry.lines[0].unitPence).toBe(5);
    expect(warnings).toEqual([]);
  });

  it("rounds a cost of less than a penny up, and says so", () => {
    // Father's Day: a flower at £0.005. A cost is never understated.
    const { entry, warnings } = toEntry(row({ lines: [{ label: "Flower", amount: 0.005, quantity: 1 }] }));

    expect(entry.lines[0].unitPence).toBe(1);
    expect(warnings.join(" ")).toMatch(/flower/i);
  });

  it("keeps half skeins of yarn exact", () => {
    const { entry } = toEntry(row({ lines: [{ label: "Yarn - bamboo", amount: 1.76, quantity: 6.5 }] }));

    expect(entry.lines[0]).toMatchObject({ unitPence: 176, quantityHundredths: 650 });
  });

  it("carries a pack size into every line, as the sheet's sum does, and says so", () => {
    // Hairclips: SUM(C:J) x QTY - postage and making included.
    const { entry, warnings } = toEntry(
      row({ qty: 3, lines: [{ label: "Post & Packaging", amount: 1.55, quantity: 1 }] }),
    );

    expect(entry.lines[0].quantityHundredths).toBe(300);
    expect(warnings.join(" ")).toMatch(/pack of 3/i);
  });

  it("tidies a label without changing what it says", () => {
    expect(toEntry(row()).entry.lines[1].label).toBe("Making cost");
  });

  it("keeps a note written in the photo column, which is all the naming the sheet has", () => {
    expect(toEntry(row({ note: "  Definition of Teacher " })).entry.note).toBe("Definition of Teacher");
    expect(toEntry(row({ note: "" })).entry.note).toBeNull();
  });

  it("brings zero-rated clothes in at no VAT", () => {
    expect(toEntry(row({ vat: 0 })).entry.vatRate).toBe(0);
  });
});

describe("isEmptyTemplate", () => {
  it("skips a row with neither a photo nor a price, which is a blank the sheet was copied from", () => {
    expect(isEmptyTemplate(row({ photo: null, price: 0 }))).toBe(true);
  });

  it("keeps a photographed row that was never priced, since its costs are real", () => {
    expect(isEmptyTemplate(row({ price: 0 }))).toBe(false);
  });

  it("keeps a priced row with no photo, which can still be matched by eye", () => {
    expect(isEmptyTemplate(row({ photo: null }))).toBe(false);
  });
});
