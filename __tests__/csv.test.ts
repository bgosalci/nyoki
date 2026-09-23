import { num, toCsv } from "@/lib/export/csv";

const BOM = "﻿";

describe("toCsv", () => {
  it("writes cells split by commas and rows by CRLF, marked as UTF-8 so £ and accents survive Excel", () => {
    expect(toCsv([["Name", "Price"], ["Snowflake Card", num("6.00")]])).toBe(`${BOM}Name,Price\r\nSnowflake Card,6.00\r\n`);
  });

  it("quotes a cell holding a comma, a quote or a line break, doubling its quotes", () => {
    expect(toCsv([["Stars, ribbed", 'The "big" one', "two\nlines"]])).toBe(`${BOM}"Stars, ribbed","The ""big"" one","two\nlines"\r\n`);
  });

  it("leaves an empty cell for nothing", () => {
    expect(toCsv([["a", null, "c"]])).toBe(`${BOM}a,,c\r\n`);
  });

  it("stops text a spreadsheet would run as a formula from running", () => {
    // A name is typed in the admin, or came from the Shopify import; either
    // way it is not ours to have a spreadsheet execute.
    expect(toCsv([["=HYPERLINK(\"http://x\")", "+44 7700", "-draft", "@sum"]])).toBe(
      `${BOM}"'=HYPERLINK(""http://x"")",'+44 7700,'-draft,'@sum\r\n`,
    );
  });

  it("leaves numbers as numbers, a loss included", () => {
    expect(toCsv([[num("-0.50"), num("61.2")]])).toBe(`${BOM}-0.50,61.2\r\n`);
  });
});
