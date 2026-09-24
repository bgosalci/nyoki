import { parseXml, XmlError } from "@/lib/import/xml";

describe("parseXml", () => {
  it("reads nested elements and their text", () => {
    const root = parseXml('<?xml version="1.0" encoding="UTF-8"?>\n<products><product><name>Snowflake Card</name><price>6.00</price></product></products>');

    expect(root.name).toBe("products");
    const [product] = root.children;
    expect(product.children.map((child) => [child.name, child.text])).toEqual([
      ["name", "Snowflake Card"],
      ["price", "6.00"],
    ]);
  });

  it("reads an empty element as present but empty, and keeps attributes", () => {
    const root = parseXml('<products shop="Nyoki"><product><wasPrice/><sku></sku></product></products>');

    expect(root.attributes).toEqual({ shop: "Nyoki" });
    expect(root.children[0].children.map((child) => [child.name, child.text])).toEqual([
      ["wasPrice", ""],
      ["sku", ""],
    ]);
  });

  it("turns entities and character references back into what they stand for", () => {
    const root = parseXml("<name>Card &amp; envelope &lt;big&gt; &quot;new&quot; it&apos;s &#163;5 &#x2014; done</name>");

    expect(root.text).toBe(`Card & envelope <big> "new" it's £5 — done`);
  });

  it("keeps line breaks in text, and reads CDATA as it stands", () => {
    const root = parseXml("<d>Soft, warm.\r\nHand wash. <![CDATA[<b>not a tag</b> & not an entity]]></d>");

    expect(root.text).toBe("Soft, warm.\nHand wash. <b>not a tag</b> & not an entity");
  });

  it("skips comments and the gaps between elements", () => {
    const root = parseXml("<products>\n  <!-- exported -->\n  <product><name>A</name></product>\n</products>");

    expect(root.children.map((child) => child.name)).toEqual(["product"]);
  });

  it("refuses a DOCTYPE, which could expand into gigabytes or read other files", () => {
    const attack = '<?xml version="1.0"?><!DOCTYPE lolz [<!ENTITY lol "lol"><!ENTITY lol2 "&lol;&lol;">]><name>&lol2;</name>';

    expect(() => parseXml(attack)).toThrow(XmlError);
    expect(() => parseXml(attack)).toThrow("The file declares a DOCTYPE, which is not read, for safety.");
  });

  it("says where the file is broken, by line", () => {
    expect(() => parseXml("<products>\n<product>\n<name>A</nam>\n</product></products>")).toThrow(
      "Line 3: </nam> closes <name>, which is still open.",
    );
    expect(() => parseXml("<products><product>")).toThrow("The file ends before <product> is closed.");
    expect(() => parseXml("<a>&nbsp;</a>")).toThrow("Line 1: &nbsp; is not an entity XML knows.");
    expect(() => parseXml("just text")).toThrow("The file has no XML element in it.");
    expect(() => parseXml("<a></a><b></b>")).toThrow("Line 1: there is more after the end of <a>.");
  });
});
