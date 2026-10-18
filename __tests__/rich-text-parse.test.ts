import { parseRichText, summaryOf } from "@/lib/rich-text/parse";

const plain = (text: string) => ({ text, bold: false, italic: false });
const bold = (text: string) => ({ text, bold: true, italic: false });
const italic = (text: string) => ({ text, bold: false, italic: true });
const both = (text: string) => ({ text, bold: true, italic: true });

describe("parseRichText", () => {
  describe("blocks", () => {
    it("reads plain text as paragraphs, split at blank lines", () => {
      expect(parseRichText("First.\r\n\r\nSecond.")).toEqual([
        { type: "paragraph", lines: [[plain("First.")]] },
        { type: "paragraph", lines: [[plain("Second.")]] },
      ]);
    });

    it("keeps a single line break as a new line of the same paragraph", () => {
      expect(parseRichText("Card\nEnvelope")).toEqual([
        { type: "paragraph", lines: [[plain("Card")], [plain("Envelope")]] },
      ]);
    });

    it("reads lines starting with a dash as a bulleted list", () => {
      expect(parseRichText("- Card\n- Envelope")).toEqual([
        { type: "list", items: [[[plain("Card")]], [[plain("Envelope")]]] },
      ]);
    });

    it("also takes * and • as bullets, as people type them", () => {
      expect(parseRichText("* Card\n• Envelope")).toEqual([
        { type: "list", items: [[[plain("Card")]], [[plain("Envelope")]]] },
      ]);
    });

    it("starts a list straight after a line of text, with no blank line between", () => {
      expect(parseRichText("Includes:\n- Card\n- Envelope")).toEqual([
        { type: "paragraph", lines: [[plain("Includes:")]] },
        { type: "list", items: [[[plain("Card")]], [[plain("Envelope")]]] },
      ]);
    });

    it("ends a list at a line that is not a bullet", () => {
      expect(parseRichText("- Card\nHandmade in the UK.")).toEqual([
        { type: "list", items: [[[plain("Card")]]] },
        { type: "paragraph", lines: [[plain("Handmade in the UK.")]] },
      ]);
    });

    it("carries an indented line on as part of the bullet above", () => {
      expect(parseRichText("- Card\n  with envelope")).toEqual([
        { type: "list", items: [[[plain("Card")], [plain("with envelope")]]] },
      ]);
    });

    it("needs a space after the dash for a bullet", () => {
      expect(parseRichText("-5°C is too cold")).toEqual([
        { type: "paragraph", lines: [[plain("-5°C is too cold")]] },
      ]);
    });

    it("skips an empty bullet", () => {
      expect(parseRichText("- \n- Card")).toEqual([{ type: "list", items: [[[plain("Card")]]] }]);
    });

    it("has nothing in blank text", () => {
      expect(parseRichText("  \r\n ")).toEqual([]);
    });
  });

  describe("formatting", () => {
    const line = (text: string) => {
      const [block] = parseRichText(text);
      return block.type === "paragraph" ? block.lines[0] : null;
    };

    it("reads **bold** and *italic*", () => {
      expect(line("A **bold** and *quiet* card")).toEqual([
        plain("A "),
        bold("bold"),
        plain(" and "),
        italic("quiet"),
        plain(" card"),
      ]);
    });

    it("reads ***both*** at once", () => {
      expect(line("***both***")).toEqual([both("both")]);
    });

    it("reads italic inside bold", () => {
      expect(line("**a *b* c**")).toEqual([bold("a "), both("b"), bold(" c")]);
    });

    it("reads bold that ends in italic, as the editor writes it", () => {
      expect(line("**a*b***")).toEqual([bold("a"), both("b")]);
    });

    it("reads italic that ends in bold", () => {
      expect(line("*a**b***")).toEqual([italic("a"), both("b")]);
    });

    it("leaves an asterisk with a space either side alone", () => {
      expect(line("5 * 3 * 2")).toEqual([plain("5 * 3 * 2")]);
    });

    it("leaves a marker that is never closed as it is", () => {
      expect(line("**not closed")).toEqual([plain("**not closed")]);
    });

    it("shows an escaped asterisk as an asterisk", () => {
      expect(line("\\*not italic\\*")).toEqual([plain("*not italic*")]);
    });

    it("shows an escaped dash as text, not a bullet", () => {
      expect(line("\\- not a bullet")).toEqual([plain("- not a bullet")]);
    });

    it("formats inside a bullet", () => {
      expect(parseRichText("- **Recycled** card")).toEqual([
        { type: "list", items: [[[bold("Recycled"), plain(" card")]]] },
      ]);
    });
  });
});

describe("summaryOf", () => {
  it("is the first paragraph, without its formatting marks", () => {
    expect(summaryOf("Send **heavenly** wishes.\n\nA keepsake.")).toBe("Send heavenly wishes.");
  });

  it("runs the lines of the paragraph together", () => {
    expect(summaryOf("Line one\nLine two")).toBe("Line one Line two");
  });

  it("lists a list's bullets", () => {
    expect(summaryOf("- Card\n- Envelope")).toBe("Card, Envelope");
  });

  it("is nothing for blank text", () => {
    expect(summaryOf("  ")).toBeUndefined();
  });
});
