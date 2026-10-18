import { paragraphs } from "@/lib/storefront/paragraphs";

describe("paragraphs", () => {
  it("splits on a blank line", () => {
    expect(paragraphs("First.\n\nSecond.")).toEqual(["First.", "Second."]);
  });

  it("splits on a blank line typed in the CMS, which the browser sends as CRLF", () => {
    // A textarea's value is submitted with \r\n line breaks, so this is how
    // every description Njomza saves arrives in the database.
    expect(paragraphs("First.\r\n\r\nSecond.")).toEqual(["First.", "Second."]);
  });

  it("treats a line of nothing but spaces as blank", () => {
    expect(paragraphs("First.\n   \nSecond.")).toEqual(["First.", "Second."]);
  });

  it("treats several blank lines as one break", () => {
    expect(paragraphs("First.\n\n\n\nSecond.")).toEqual(["First.", "Second."]);
  });

  it("keeps a single line break inside its paragraph", () => {
    expect(paragraphs("Line one\r\nLine two")).toEqual(["Line one\nLine two"]);
  });

  it("trims each paragraph and drops empty ends", () => {
    expect(paragraphs("\n\n  First.  \n\n")).toEqual(["First."]);
  });

  it("has no paragraphs in blank text", () => {
    expect(paragraphs("  \r\n ")).toEqual([]);
  });
});
