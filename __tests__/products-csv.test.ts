import { exportFilename, productsCsv, type ExportProduct } from "@/lib/export/products";

// Christening card: her sheet has it at £12.99 costing £4.20.
const christening: ExportProduct = {
  name: "Christening Card",
  sku: "CARD-CHR-01",
  status: "ACTIVE",
  categories: ["Cards", "Christening Cards"],
  pricePence: 1299,
  compareAtPence: 1499,
  vatRate: 20,
  stock: 4,
  madeToOrder: false,
  lines: [
    { label: "Card & envelope", unitPence: 80, quantityHundredths: 100 },
    { label: "Bag", unitPence: 9, quantityHundredths: 100 },
    { label: "Ink", unitPence: 25, quantityHundredths: 100 },
    { label: "Post & packaging", unitPence: 106, quantityHundredths: 100 },
    { label: "Making cost", unitPence: 200, quantityHundredths: 100 },
  ],
};

/** The file as rows of cells. None of these cells needs quoting. */
function table(csv: string): Record<string, string>[] {
  const [header, ...rows] = csv.replace(/^﻿/, "").trimEnd().split("\r\n").map((row) => row.split(","));
  return rows.map((row) => Object.fromEntries(header.map((name, i) => [name, row[i] ?? ""])));
}

describe("productsCsv", () => {
  it("names every column", () => {
    const [header] = productsCsv([]).replace(/^﻿/, "").split("\r\n");
    expect(header.split(",")).toEqual([
      "Name",
      "Product code",
      "Status",
      "Categories",
      "Price",
      "Was price",
      "VAT %",
      "VAT",
      "After VAT",
      "Cost",
      "Profit",
      "Margin %",
      "Times cost",
      "NOTHS fee",
      "NOTHS profit",
      "Stock",
      "Cost lines",
    ]);
  });

  it("works out a costed piece's figures as the Price tab does", () => {
    const [row] = table(productsCsv([christening]));

    expect(row).toEqual({
      Name: "Christening Card",
      "Product code": "CARD-CHR-01",
      Status: "Active",
      Categories: "Cards; Christening Cards",
      Price: "12.99",
      "Was price": "14.99",
      "VAT %": "20",
      VAT: "2.17",
      "After VAT": "10.82",
      Cost: "4.20",
      Profit: "6.62",
      "Margin %": "61.2",
      "Times cost": "2.58",
      "NOTHS fee": "3.90",
      "NOTHS profit": "2.72",
      Stock: "4",
      "Cost lines": "Card & envelope 0.80 × 1; Bag 0.09 × 1; Ink 0.25 × 1; Post & packaging 1.06 × 1; Making cost 2.00 × 1",
    });
  });

  it("leaves profit blank for a piece not costed, rather than calling its whole price profit", () => {
    const [row] = table(productsCsv([{ ...christening, lines: [] }]));

    expect(row).toMatchObject({ Price: "12.99", VAT: "2.17", Cost: "", Profit: "", "Margin %": "", "Times cost": "", "NOTHS profit": "", "Cost lines": "" });
  });

  it("leaves the price's figures blank for a piece not priced yet", () => {
    const [row] = table(productsCsv([{ ...christening, pricePence: 0, compareAtPence: null }]));

    expect(row).toMatchObject({ Price: "", "Was price": "", VAT: "", "After VAT": "", Cost: "4.20", Profit: "", "NOTHS fee": "" });
  });

  it("shows a loss as a negative number", () => {
    const [row] = table(productsCsv([{ ...christening, pricePence: 300, compareAtPence: null }]));

    expect(row.Profit).toBe("-1.70");
  });

  it("says a made-to-order piece is made to order, and keeps part quantities", () => {
    const [row] = table(
      productsCsv([
        { ...christening, madeToOrder: true, lines: [{ label: "Bamboo yarn", unitPence: 450, quantityHundredths: 250 }] },
      ]),
    );

    expect(row.Stock).toBe("made to order");
    expect(row["Cost lines"]).toBe("Bamboo yarn 4.50 × 2.5");
  });
});

describe("exportFilename", () => {
  it("names the file for the shop and the day", () => {
    expect(exportFilename(new Date("2026-09-24T09:30:00Z"))).toBe("nyoki-products-2026-09-24.csv");
  });
});
