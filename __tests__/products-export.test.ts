import { EXPORT_FORMATS, exportFilename, exportProducts, type ExportProduct } from "@/lib/export/products";
import { parseXml } from "@/lib/import/xml";

const christening: ExportProduct = {
  name: "Christening Card & Tag",
  slug: "christening-card",
  sku: null,
  status: "ACTIVE",
  categories: ["Cards", "Christening Cards"],
  pricePence: 1299,
  compareAtPence: null,
  vatRate: 20,
  stock: 4,
  madeToOrder: false,
  description: "A card for a christening.\nHand made.",
  materials: null,
  dimensions: "15cm square",
  careInstructions: null,
  weightGrams: 40,
  featured: true,
  oneOfAKind: false,
  leadTimeDays: null,
  photos: ["/uploads/christening-1.jpg"],
  lines: [
    { label: "Card & envelope", unitPence: 80, quantityHundredths: 100 },
    { label: "Bamboo yarn", unitPence: 450, quantityHundredths: 250 },
  ],
};

const OPTIONS = { origin: "http://localhost:3000", exportedAt: new Date("2026-09-24T09:30:00Z") };

describe("exportProducts, JSON", () => {
  const file = JSON.parse(exportProducts("json", [christening], OPTIONS));

  it("says whose products they are and when they were exported", () => {
    expect(file).toMatchObject({ shop: "Nyoki", exported: "2026-09-24T09:30:00.000Z" });
  });

  it("writes each product's fields, lists as lists and nothing as null", () => {
    expect(file.products[0]).toMatchObject({
      name: "Christening Card & Tag",
      productCode: null,
      status: "Active",
      categories: ["Cards", "Christening Cards"],
      vatRate: 20,
      stock: 4,
      madeToOrder: false,
      costLines: [
        { what: "Card & envelope", costEach: "0.80", howMany: 1 },
        { what: "Bamboo yarn", costEach: "4.50", howMany: 2.5 },
      ],
      webAddress: "christening-card",
      description: "A card for a christening.\nHand made.",
      materials: null,
      weightGrams: 40,
      featured: true,
      photos: ["http://localhost:3000/uploads/christening-1.jpg"],
    });
  });

  it("writes money as text, never as a decimal number that could come back a penny out", () => {
    expect(file.products[0]).toMatchObject({ price: "12.99", wasPrice: null });
  });

  it("keeps the worked-out figures apart, as figures to read rather than fields to import", () => {
    expect(file.products[0].workedOut).toEqual({
      vat: "2.17",
      afterVat: "10.82",
      cost: "12.05",
      profit: "-1.23",
      marginPercent: -11.4,
      timesCost: 0.9,
      nothsFee: "3.90",
      nothsProfit: "-5.13",
    });
  });
});

describe("exportProducts, XML", () => {
  const text = exportProducts("xml", [christening], OPTIONS);
  const root = parseXml(text);
  const product = root.children[0];
  const field = (name: string) => product.children.find((child) => child.name === name)!;

  it("is well-formed XML, declared as UTF-8, one element per product", () => {
    expect(text.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(root.name).toBe("products");
    expect(root.attributes).toEqual({ shop: "Nyoki", exported: "2026-09-24T09:30:00.000Z" });
    expect(root.children.map((child) => child.name)).toEqual(["product"]);
  });

  it("escapes what XML would misread, and writes nothing as an empty element", () => {
    expect(text).toContain("<name>Christening Card &amp; Tag</name>");
    expect(field("name").text).toBe("Christening Card & Tag");
    expect(text).toContain("<productCode/>");
    expect(field("featured").text).toBe("true");
  });

  it("writes lists as elements of their own", () => {
    expect(field("categories").children.map((child) => child.text)).toEqual(["Cards", "Christening Cards"]);
    const [line] = field("costLines").children;
    expect(line.children.map((part) => [part.name, part.text])).toEqual([
      ["what", "Card & envelope"],
      ["costEach", "0.80"],
      ["howMany", "1"],
    ]);
  });

  it("leaves out characters XML cannot hold at all, rather than write a file nothing can read", () => {
    const odd = exportProducts("xml", [{ ...christening, description: "Tab\there, bell\u0007 gone" }], OPTIONS);

    expect(parseXml(odd).children[0].children.find((child) => child.name === "description")!.text).toBe("Tab\there, bell gone");
  });
});

describe("EXPORT_FORMATS and exportFilename", () => {
  it("serves each format as what it is", () => {
    expect(EXPORT_FORMATS.csv.contentType).toBe("text/csv; charset=utf-8");
    expect(EXPORT_FORMATS.json.contentType).toBe("application/json; charset=utf-8");
    expect(EXPORT_FORMATS.xml.contentType).toBe("application/xml; charset=utf-8");
  });

  it("names the file for the shop, the day and the format", () => {
    expect(exportFilename(new Date("2026-09-24T09:30:00Z"), "json")).toBe("nyoki-products-2026-09-24.json");
    expect(exportFilename(new Date("2026-09-24T09:30:00Z"), "xml")).toBe("nyoki-products-2026-09-24.xml");
    expect(exportFilename(new Date("2026-09-24T09:30:00Z"))).toBe("nyoki-products-2026-09-24.csv");
  });
});
