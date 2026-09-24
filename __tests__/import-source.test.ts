import { detectFormat, readProducts } from "@/lib/import/source";

const fields = (record: Map<string, string>) => Object.fromEntries(record);

describe("readProducts, telling the format apart", () => {
  it("reads by what the file holds, not what it is called", () => {
    expect(detectFormat('[{"name":"A"}]')).toBe("json");
    expect(detectFormat('  {"products":[]}')).toBe("json");
    expect(detectFormat("\uFEFF<?xml version=\"1.0\"?><products/>")).toBe("xml");
    expect(detectFormat("Name,Price\r\nA,1.00")).toBe("csv");
  });
});

describe("readProducts, CSV", () => {
  it("gives one record per row, by heading, numbered as a spreadsheet numbers them", () => {
    const source = readProducts("Name,Price\r\nSnowflake Card,6.00\r\nBud Vase,");

    expect(source).toMatchObject({ format: "csv", names: ["Name", "Price"], first: 2, unit: "Row" });
    expect(source.records.map(fields)).toEqual([
      { Name: "Snowflake Card", Price: "6.00" },
      { Name: "Bud Vase", Price: "" },
    ]);
  });

  it("takes back the apostrophe the CSV export puts before text a spreadsheet would run", () => {
    expect(fields(readProducts("Name\r\n'=Bamboo Cardigan").records[0])).toEqual({ Name: "=Bamboo Cardigan" });
  });

  it("refuses a heading given twice", () => {
    expect(() => readProducts("Name,Price,Name\r\nA,1,B")).toThrow("The column Name appears twice.");
  });
});

describe("readProducts, JSON", () => {
  const json = JSON.stringify({
    shop: "Nyoki",
    products: [
      {
        name: "Snowflake Card",
        productCode: null,
        price: "6.00",
        vatRate: 20,
        featured: true,
        madeToOrder: false,
        categories: ["Christmas Cards", "Cards"],
        costLines: [
          { what: "Card & envelope", costEach: "0.22", howMany: 1 },
          { what: "Yarn", costEach: "4.50", howMany: 2.5 },
        ],
        photos: ["http://x/a.jpg"],
        workedOut: { profit: "3.00" },
      },
      { webAddress: "bud-vase", stock: 4 },
    ],
  });

  it("gives each product its own fields, as text the rules read the same way as a spreadsheet's", () => {
    const source = readProducts(json);

    expect(source).toMatchObject({ format: "json", first: 1, unit: "Product" });
    expect(fields(source.records[0])).toEqual({
      name: "Snowflake Card",
      productCode: "",
      price: "6.00",
      vatRate: "20",
      featured: "Yes",
      madeToOrder: "No",
      categories: "Christmas Cards; Cards",
      costLines: "Card & envelope 0.22 × 1; Yarn 4.50 × 2.5",
      photos: "http://x/a.jpg",
      workedOut: "",
    });
  });

  it("leaves out of a product the fields it does not mention, so they stay as they are", () => {
    expect(fields(readProducts(json).records[1])).toEqual({ webAddress: "bud-vase", stock: "4" });
  });

  it("lists every field the file uses, first seen first", () => {
    expect(readProducts(json).names).toEqual([
      "name", "productCode", "price", "vatRate", "featured", "madeToOrder", "categories", "costLines", "photos", "workedOut", "webAddress", "stock",
    ]);
  });

  it("takes a bare list of products too", () => {
    expect(readProducts('[{"name":"A"}]').records.map(fields)).toEqual([{ name: "A" }]);
  });

  it("says what is wrong with a file it cannot use", () => {
    expect(() => readProducts('{"name": }')).toThrow(/^The file is not valid JSON/);
    expect(() => readProducts('{"items":[]}')).toThrow('The JSON has no list of products: give a list, or an object with a "products" list.');
    expect(() => readProducts('[{"name":"A"}, "B"]')).toThrow("Product 2 in the file is not a set of fields.");
  });
});

describe("readProducts, XML", () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<products shop="Nyoki">
  <product>
    <name>Card &amp; envelope set</name>
    <productCode/>
    <price>6.00</price>
    <featured>true</featured>
    <categories><category>Christmas Cards</category><category>Cards</category></categories>
    <costLines>
      <line><what>Card &amp; envelope</what><costEach>0.22</costEach><howMany>1</howMany></line>
      <line><what>Yarn</what><costEach>4.50</costEach><howMany>2.5</howMany></line>
    </costLines>
    <description>Soft, warm.
Hand wash.</description>
    <workedOut><profit>3.00</profit></workedOut>
  </product>
  <product><webAddress>bud-vase</webAddress><stock>4</stock></product>
</products>`;

  it("gives each product element its fields, lists and all", () => {
    const source = readProducts(xml);

    expect(source).toMatchObject({ format: "xml", first: 1, unit: "Product" });
    expect(fields(source.records[0])).toEqual({
      name: "Card & envelope set",
      productCode: "",
      price: "6.00",
      featured: "true",
      categories: "Christmas Cards; Cards",
      costLines: "Card & envelope 0.22 × 1; Yarn 4.50 × 2.5",
      description: "Soft, warm.\nHand wash.",
      workedOut: "",
    });
    expect(fields(source.records[1])).toEqual({ webAddress: "bud-vase", stock: "4" });
  });

  it("says what is wrong with a file it cannot use", () => {
    expect(() => readProducts("<products>")).toThrow("The file ends before <products> is closed.");
    expect(() => readProducts("<products/>")).toThrow("The file has no products in it.");
    // Kept quietly, one of the two would be ignored - and a price edited by
    // adding a second <price> would import as no change at all.
    expect(() => readProducts("<products><product><name>A</name></product><product><price>6.00</price><price>9.99</price></product></products>")).toThrow(
      "Product 2 gives price twice. Keep the one you mean.",
    );
    expect(() => readProducts("[]")).toThrow("The file has no products in it.");
  });
});
