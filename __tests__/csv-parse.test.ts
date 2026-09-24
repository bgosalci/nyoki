import { CsvError, parseCsv } from "@/lib/import/csv";

describe("parseCsv", () => {
  it("reads cells split by commas and rows by line breaks of either kind", () => {
    expect(parseCsv("Name,Price\r\nSnowflake Card,6.00\nBud Vase,18.00")).toEqual([
      ["Name", "Price"],
      ["Snowflake Card", "6.00"],
      ["Bud Vase", "18.00"],
    ]);
  });

  it("drops the byte-order mark Excel writes, so the first heading reads as itself", () => {
    expect(parseCsv("\uFEFFName,Price\r\n")[0][0]).toBe("Name");
  });

  it("reads a quoted cell holding commas, doubled quotes and line breaks", () => {
    expect(parseCsv('Name,Description\r\n"Stars, ribbed","The ""big"" one\r\nHand wash."\r\n')).toEqual([
      ["Name", "Description"],
      ["Stars, ribbed", 'The "big" one\r\nHand wash.'],
    ]);
  });

  it("keeps empty cells, and a trailing empty one", () => {
    expect(parseCsv("a,,c,\r\n")).toEqual([["a", "", "c", ""]]);
  });

  it("skips rows with nothing in them - spreadsheets leave them at the end", () => {
    expect(parseCsv("Name\r\nMug\r\n,\r\n\r\n")).toEqual([["Name"], ["Mug"]]);
  });

  it("says where a quote is never closed, rather than swallowing the rest of the file", () => {
    expect(() => parseCsv('Name\r\n"Mug\r\nVase\r\n')).toThrow(CsvError);
    expect(() => parseCsv('Name\r\n"Mug\r\nVase\r\n')).toThrow("A quote opened in row 2 is never closed.");
  });
});
