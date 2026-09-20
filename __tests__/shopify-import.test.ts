import { categoryFor, htmlToText, parseShopifyExport } from "@/lib/import/shopify";

const HEADER = [
  "Handle", "Title", "Body (HTML)", "Vendor", "Standardized Product Type", "Custom Product Type", "Tags", "Published",
  "Option1 Name", "Option1 Value", "Option2 Name", "Option2 Value", "Option3 Name", "Option3 Value",
  "Variant SKU", "Variant Grams", "Variant Inventory Tracker", "Variant Inventory Qty", "Variant Inventory Policy",
  "Variant Fulfillment Service", "Variant Price", "Variant Compare At Price", "Variant Requires Shipping", "Variant Taxable",
  "Variant Barcode", "Image Src", "Image Position", "Image Alt Text", "Gift Card", "SEO Title", "SEO Description", "Status",
];

type Row = Partial<Record<(typeof HEADER)[number], string>>;

function csv(rows: Row[]): string {
  const quote = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const line = (r: Row) => HEADER.map((h) => quote(r[h] ?? "")).join(",");
  return [HEADER.join(","), ...rows.map(line)].join("\n") + "\n";
}

const simple: Row[] = [
  {
    Handle: "cheers-dad-card", Title: "Cheers Dad Card", "Body (HTML)": "<p>Hello <b>Dad</b> &amp; all</p><p>Second line</p>",
    "Custom Product Type": "Father's Day Cards", Tags: "handmade cards, dad", Published: "true", Status: "active",
    "Option1 Name": "Title", "Option1 Value": "Default Title", "Variant SKU": "NYK-1", "Variant Grams": "20",
    "Variant Inventory Qty": "4", "Variant Price": "3.50", "Variant Compare At Price": "4.00",
    "Image Src": "https://cdn.example/front.jpg", "Image Position": "1", "Image Alt Text": "Front",
  },
  { Handle: "cheers-dad-card", "Image Src": "https://cdn.example/inside.jpg", "Image Position": "2" },
];

const vest: Row[] = [
  {
    Handle: "cotton-vest", Title: "Cotton Vest", "Body (HTML)": "<p>Soft.</p>", "Custom Product Type": "Girls Vest",
    Published: "true", Status: "active", "Option1 Name": "Size", "Option1 Value": "S", "Variant SKU": "V-S",
    "Variant Grams": "0.0", "Variant Inventory Qty": "1", "Variant Price": "55.00", "Variant Compare At Price": "60.00",
    "Image Src": "https://cdn.example/vest-2.jpg", "Image Position": "2",
  },
  {
    Handle: "cotton-vest", "Option1 Name": "Size", "Option1 Value": "M", "Variant SKU": "V-M", "Variant Grams": "0.0",
    "Variant Inventory Qty": "0", "Variant Price": "58.00", "Image Src": "https://cdn.example/vest-1.jpg", "Image Position": "1",
  },
];

describe("parseShopifyExport", () => {
  it("groups rows by handle into one product with its images in position order", () => {
    const { products } = parseShopifyExport(csv(simple));

    expect(products).toHaveLength(1);
    expect(products[0]).toMatchObject({
      slug: "cheers-dad-card",
      name: "Cheers Dad Card",
      status: "ACTIVE",
      pricePence: 350,
      compareAtPence: 400,
      sku: "NYK-1",
      stock: 4,
      weightGrams: 20,
      variants: [],
      category: { name: "Father's Day Cards", parent: "Cards" },
    });
    expect(products[0].images).toEqual([
      { url: "https://cdn.example/front.jpg", alt: "Front", position: 0 },
      { url: "https://cdn.example/inside.jpg", alt: null, position: 1 },
    ]);
  });

  it("turns the HTML description into plain paragraphs", () => {
    const { products } = parseShopifyExport(csv(simple));

    expect(products[0].description).toBe("Hello Dad & all\n\nSecond line");
  });

  it("builds variants from option rows, with the lowest price as the base", () => {
    const { products } = parseShopifyExport(csv(vest));
    const product = products[0];

    expect(product.pricePence).toBe(5500);
    expect(product.stock).toBe(0);
    expect(product.variants).toEqual([
      { name: "S", options: { Size: "S" }, sku: "V-S", pricePence: null, stock: 1, position: 0 },
      { name: "M", options: { Size: "M" }, sku: "V-M", pricePence: 5800, stock: 0, position: 1 },
    ]);
  });

  it("orders images by their position column, not by row order", () => {
    const { products } = parseShopifyExport(csv(vest));

    expect(products[0].images.map((i) => i.url)).toEqual([
      "https://cdn.example/vest-1.jpg",
      "https://cdn.example/vest-2.jpg",
    ]);
  });

  it("treats grams of 0.0 as unknown weight", () => {
    const { products } = parseShopifyExport(csv(vest));

    expect(products[0].weightGrams).toBeNull();
  });

  it("drops a was-price that is not above the price", () => {
    const rows = [{ ...simple[0], "Variant Compare At Price": "3.50" }];
    const { products } = parseShopifyExport(csv(rows));

    expect(products[0].compareAtPence).toBeNull();
  });

  it("imports a draft as a draft, and an unpublished active product as a draft too", () => {
    const rows = [
      { ...simple[0], Handle: "a", Status: "draft" },
      { ...simple[0], Handle: "b", Status: "active", Published: "false" },
    ];
    const { products } = parseShopifyExport(csv(rows));

    expect(products.map((p) => [p.slug, p.status])).toEqual([["a", "DRAFT"], ["b", "DRAFT"]]);
  });

  it("skips gift cards and says why", () => {
    // Shopify gift cards are redeemed by Shopify. Ours would sell a code we
    // cannot honour.
    const rows = [{ ...simple[0], Handle: "gift-card", Title: "Gift Card", "Gift Card": "true" }];
    const { products, skipped } = parseShopifyExport(csv(rows));

    expect(products).toHaveLength(0);
    expect(skipped).toEqual([{ handle: "gift-card", reason: expect.stringMatching(/gift card/i) }]);
  });

  it("leaves a product with no type uncategorised", () => {
    const rows = [{ ...simple[0], "Custom Product Type": "", "Standardized Product Type": "" }];
    const { products } = parseShopifyExport(csv(rows));

    expect(products[0].category).toBeNull();
  });

  it("copes with a quoted field containing commas and newlines", () => {
    const rows = [{ ...simple[0], "Body (HTML)": "<p>One, two</p>\n<p>Three \"four\"</p>" }];
    const { products } = parseShopifyExport(csv(rows));

    expect(products[0].description).toBe('One, two\n\nThree "four"');
  });
});

describe("htmlToText", () => {
  it("strips tags, decodes entities and keeps paragraph breaks", () => {
    expect(htmlToText('<p><meta charset="utf-8"><span data-mce-fragment="1">Tea &amp; cake</span></p><p>Bye</p>')).toBe(
      "Tea & cake\n\nBye",
    );
  });

  it("treats line breaks as single newlines", () => {
    expect(htmlToText("<p>a<br>b<br/>c</p>")).toBe("a\nb\nc");
  });

  it("collapses runs of whitespace", () => {
    expect(htmlToText("<p>a   \n   b</p>")).toBe("a b");
  });

  it("returns null for nothing", () => {
    expect(htmlToText("")).toBeNull();
    expect(htmlToText("<p></p>")).toBeNull();
  });
});

describe("categoryFor", () => {
  it.each([
    ["Christmas Cards", "Cards"],
    ["Birthday Card", "Cards"],
    ["New Baby Boy", "Cards"],
    ["Brooch", "Accessories"],
    ["Hair Clip", "Accessories"],
    ["Hairband", "Accessories"],
    ["Baby Girl Hat and Booties", "Clothes"],
    ["Girls Vest", "Clothes"],
    ["Girls Coat", "Clothes"],
    ["Baby Boys Jacket", "Clothes"],
    ["Cardigan and Skirt", "Clothes"],
    ["Dresses", "Clothes"],
    ["Collar", "Accessories"],
    // a cardigan is not a card
    ["Boys Cardigan", "Clothes"],
    ["Baby Boys Dungarees", "Clothes"],
    ["Boys Shorts", "Clothes"],
  ])("puts %s under %s", (type, parent) => {
    expect(categoryFor(type)).toEqual({ name: type, parent });
  });

  it("keeps an unrecognised type as its own top-level category", () => {
    expect(categoryFor("Widget")).toEqual({ name: "Widget", parent: null });
  });

  it("returns null for a blank type", () => {
    expect(categoryFor("")).toBeNull();
    expect(categoryFor("   ")).toBeNull();
  });
});
