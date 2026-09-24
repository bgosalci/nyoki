import { productsCsv } from "@/lib/export/products";
import { planImport, planSignature, toPreview, type ExistingProduct } from "@/lib/import/products";

const categories = [
  { id: "cards", name: "Cards" },
  { id: "christmas", name: "Christmas Cards" },
  { id: "clothes", name: "Clothes" },
];

const snowflake: ExistingProduct = {
  id: "p1",
  slug: "snowflake-card",
  name: "Snowflake Card",
  sku: "CARD-01",
  status: "ACTIVE",
  pricePence: 600,
  compareAtPence: null,
  vatRate: 20,
  stock: 3,
  madeToOrder: false,
  description: "A card, with a snowflake.\nHand made.",
  materials: null,
  dimensions: "15cm square",
  careInstructions: null,
  weightGrams: 40,
  featured: true,
  oneOfAKind: false,
  leadTimeDays: null,
  categoryIds: ["christmas", "cards"],
  lines: [
    { label: "Card & envelope", unitPence: 22, quantityHundredths: 100 },
    { label: "Post & packaging", unitPence: 106, quantityHundredths: 100 },
  ],
};

const cardigan: ExistingProduct = {
  ...snowflake,
  id: "p2",
  slug: "bamboo-cardigan",
  name: "=Bamboo Cardigan",
  sku: null,
  status: "DRAFT",
  pricePence: 0,
  vatRate: 0,
  stock: 0,
  madeToOrder: true,
  leadTimeDays: 14,
  featured: false,
  categoryIds: ["clothes"],
  lines: [{ label: "Bamboo yarn", unitPence: 450, quantityHundredths: 250 }],
};

const existing = [snowflake, cardigan];

/** A file as a spreadsheet would save it. */
const csv = (rows: string[][]) =>
  rows.map((row) => row.map((cell) => (/[",\r\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell)).join(",")).join("\r\n");

const plan = (rows: string[][], products = existing) => planImport(csv(rows), products, categories);

/** The plan for the one row a file holds. */
const only = (rows: string[][], products = existing) => {
  const result = plan(rows, products);
  expect(result.error).toBeNull();
  expect(result.rows).toHaveLength(1);
  return result.rows[0];
};

describe("planImport, reading back our own export", () => {
  it("changes nothing when the export is imported untouched", () => {
    const exported = productsCsv(
      existing.map((product) => ({
        ...product,
        categories: product.categoryIds.map((id) => categories.find((category) => category.id === id)!.name),
        photos: ["/uploads/a.jpg"],
      })),
      { origin: "http://localhost:3000" },
    );

    const result = planImport(exported, existing, categories);

    expect(result.error).toBeNull();
    expect(result.rows.flatMap((row) => row.problems)).toEqual([]);
    expect(result.rows.map((row) => row.kind)).toEqual(["unchanged", "unchanged"]);
    expect(result.counts).toEqual({ added: 0, changed: 0, unchanged: 2, withProblems: 0 });
  });

  it("names the columns it works out rather than imports, and the photos it leaves alone", () => {
    const result = plan([["Web address", "Price", "Profit", "Margin %", "Photos", "Colour"], ["snowflake-card", "6.00", "3.00", "50.0", "", "Blue"]]);

    expect(result.columns.used).toEqual(["Web address", "Price"]);
    expect(result.columns.workedOut).toEqual(["Profit", "Margin %"]);
    expect(result.columns.notImported).toEqual(["Photos"]);
    expect(result.columns.unknown).toEqual(["Colour"]);
  });
});

describe("planImport, changing products", () => {
  it("changes only what the file's columns say, and says what changed", () => {
    const row = only([["Web address", "Price"], ["snowflake-card", "£6.50"]]);

    expect(row).toMatchObject({ kind: "update", productId: "p1", name: "Snowflake Card", row: 2 });
    expect(row.changes).toEqual([{ label: "Price", from: "£6.00", to: "£6.50" }]);
    expect(row.values).toMatchObject({ pricePence: 650, description: snowflake.description, stock: 3 });
  });

  it("matches a web address exactly as stored, even one the shop would not build today", () => {
    // Found on the real catalogue: "ice-lolly-brooch-_-yellow" came in from
    // Shopify with an underscore our web addresses never get. Tidied before
    // matching, it matched nothing, and an untouched export would have
    // added a second Ice Lolly Brooch.
    const brooch = { ...snowflake, id: "p3", slug: "ice-lolly-brooch-_-yellow", sku: null, name: "Ice Lolly Brooch _ Yellow" };

    expect(only([["Web address", "Price"], ["ice-lolly-brooch-_-yellow", "6.00"]], [...existing, brooch])).toMatchObject({
      kind: "unchanged",
      productId: "p3",
    });
  });

  it("matches a web address however it is written", () => {
    expect(only([["Web address", "Stock"], [" Snowflake-Card ", "5"]])).toMatchObject({ kind: "update", productId: "p1" });
  });

  it("sees no change in a price written differently", () => {
    expect(only([["Web address", "Price"], ["snowflake-card", "6"]]).kind).toBe("unchanged");
  });

  it("reads categories by name, in any case", () => {
    const row = only([["Web address", "Categories"], ["snowflake-card", "cards; CLOTHES"]]);

    expect(row.values.categoryIds).toEqual(["cards", "clothes"]);
    expect(row.changes).toEqual([{ label: "Categories", from: "Cards; Christmas Cards", to: "Cards; Clothes" }]);
  });

  it("reads cost lines as the export writes them, part quantities included", () => {
    const row = only([["Web address", "Cost lines"], ["snowflake-card", "Card & envelope 0.22 × 1; Yarn £4.50 x 2.5"]]);

    expect(row.values.lines).toEqual([
      { label: "Card & envelope", unitPence: 22, quantityHundredths: 100 },
      { label: "Yarn", unitPence: 450, quantityHundredths: 250 },
    ]);
    expect(row.changes).toEqual([{ label: "Costs", from: "2 lines, £1.28", to: "2 lines, £11.47" }]);
  });

  it("reads yes and no however they are written", () => {
    const row = only([["Web address", "Featured", "One of a kind"], ["snowflake-card", "no", "YES"]]);

    expect(row.values).toMatchObject({ featured: false, oneOfAKind: true, stock: 1 });
  });

  it("takes back the apostrophe the export puts before text a spreadsheet would run", () => {
    expect(only([["Web address", "Name"], ["bamboo-cardigan", "'=Bamboo Cardigan"]]).kind).toBe("unchanged");
  });

  it("leaves the status alone when its cell is blank", () => {
    expect(only([["Web address", "Status"], ["snowflake-card", ""]]).values.status).toBe("ACTIVE");
  });
});

describe("planImport, adding products", () => {
  it("adds a row whose web address is new, as a draft with no price unless it is given one", () => {
    const row = only([["Name", "Web address", "Description"], ["Bud Vase", "bud-vase", "Small."]]);

    expect(row).toMatchObject({ kind: "new", productId: null, slug: "bud-vase", name: "Bud Vase" });
    expect(row.values).toMatchObject({ status: "DRAFT", pricePence: 0, vatRate: 20, description: "Small.", categoryIds: [], lines: [] });
    expect(row.changes).toEqual([{ label: "Description", from: "(none)", to: "Small." }]);
  });

  it("builds a new product's web address from its name when the file has none", () => {
    expect(only([["Name", "Price"], ["Bud Vase", "18.00"]])).toMatchObject({ kind: "new", slug: "bud-vase" });
  });

  it("will not add a second product under a name that is already taken", () => {
    const row = only([["Name", "Price"], ["Snowflake Card", "7.00"]]);

    expect(row.problems).toEqual([
      "There is already a product at the web address snowflake-card. To change it, give its Web address; to add another, name this one differently.",
    ]);
  });

  it("cannot add a product with no name", () => {
    expect(only([["Web address", "Price"], ["bud-vase", "18.00"]]).problems).toEqual([
      "No product has the web address bud-vase, and without a Name one cannot be added.",
    ]);
  });
});

describe("planImport, problems", () => {
  const problem = (header: string, value: string) => only([["Web address", header], ["snowflake-card", value]]).problems;

  it("says what is wrong with each cell, in words", () => {
    expect(problem("Price", "six pounds")).toEqual(["Price: write it as pounds and pence, like 8.50."]);
    expect(problem("Was price", "5.00")).toEqual(["The was-price has to be higher than the price, or there is nothing to strike through."]);
    expect(problem("Status", "Sold")).toEqual(["Status: say Active, Draft or Archived."]);
    expect(problem("VAT %", "17.5")).toEqual(["VAT %: use 20, 5 or 0."]);
    expect(problem("Stock", "3.5")).toEqual(["Stock: write a whole number, zero or more."]);
    expect(problem("Featured", "maybe")).toEqual(["Featured: say Yes or No."]);
    expect(problem("Categories", "Cards; Mugs")).toEqual(['Categories: there is no category called "Mugs".']);
    expect(problem("Cost lines", "Card and envelope")).toEqual([
      'Cost lines: write each as what, cost and how many - like "Bag 0.05 × 1" - separated by semicolons.',
    ]);
  });

  it("will not put a piece on the shop with no price", () => {
    expect(only([["Web address", "Status"], ["bamboo-cardigan", "Active"]]).problems).toEqual([
      "It has no price, so it cannot be made active.",
    ]);
  });

  it("will not leave a made-to-order piece without a lead time", () => {
    expect(problem("Made to order", "Yes")).toEqual(["Made to order needs a lead time in days."]);
  });

  it("will not give two products the same code", () => {
    expect(only([["Web address", "Product code"], ["bamboo-cardigan", "CARD-01"]]).problems).toEqual([
      "Product code CARD-01 is already used by Snowflake Card.",
    ]);
  });

  it("will not take the same product twice", () => {
    const result = plan([["Web address", "Price"], ["snowflake-card", "6.50"], ["snowflake-card", "7.00"]]);

    expect(result.rows[1].problems).toEqual(["Row 2 is already snowflake-card."]);
    expect(result.counts.withProblems).toBe(1);
  });
});

describe("planImport, files it cannot use", () => {
  it("says so plainly", () => {
    expect(planImport("", existing, categories).error).toBe("The file is empty.");
    expect(plan([["Name", "Price"]]).error).toBe("The file has headings but no rows beneath them.");
    expect(plan([["Colour"], ["Blue"]]).error).toBe("The file needs a Name or a Web address column, to know which products it is about.");
    expect(planImport('Name\r\n"Mug', existing, categories).error).toBe("A quote opened in row 2 is never closed.");
  });
});

describe("planSignature", () => {
  it("is the same for the same plan, and different once the products have changed", () => {
    const rows = [["Web address", "Price"], ["snowflake-card", "6.50"]];

    expect(planSignature(plan(rows))).toBe(planSignature(plan(rows)));
    expect(planSignature(plan(rows))).not.toBe(planSignature(plan(rows, [{ ...snowflake, pricePence: 650 }, cardigan])));
  });
});

describe("toPreview", () => {
  it("sends the screen the rows that change or need fixing, not the ones that match already", () => {
    const result = plan([["Web address", "Price"], ["snowflake-card", "6.50"], ["bamboo-cardigan", ""], ["missing", "1.00"]]);

    const preview = toPreview(result, "sig");

    expect(preview.rows.map((row) => [row.row, row.kind])).toEqual([[2, "update"], [4, "new"]]);
    expect(preview.rows[1].problems).toHaveLength(1);
    expect(preview.counts).toEqual(result.counts);
    expect(preview.signature).toBe("sig");
    expect(preview.rows[0]).not.toHaveProperty("values");
  });
});
