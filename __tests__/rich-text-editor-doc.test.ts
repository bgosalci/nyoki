import { fromEditorDoc, toEditorDoc, type EditorNode } from "@/lib/rich-text/editor-doc";

const doc = (...content: EditorNode[]): EditorNode => ({ type: "doc", content });
const p = (...content: EditorNode[]): EditorNode => (content.length ? { type: "paragraph", content } : { type: "paragraph" });
const t = (text: string, ...marks: string[]): EditorNode =>
  marks.length ? { type: "text", text, marks: marks.map((type) => ({ type })) } : { type: "text", text };
const br: EditorNode = { type: "hardBreak" };
const ul = (...items: EditorNode[]): EditorNode => ({
  type: "bulletList",
  content: items.map((item) => ({ type: "listItem", content: [item] })),
});

describe("toEditorDoc", () => {
  it("opens plain text as paragraphs", () => {
    expect(toEditorDoc("First.\n\nSecond.")).toEqual(doc(p(t("First.")), p(t("Second."))));
  });

  it("opens a line break as a hard break", () => {
    expect(toEditorDoc("Card\nEnvelope")).toEqual(doc(p(t("Card"), br, t("Envelope"))));
  });

  it("opens bold and italic as marks", () => {
    expect(toEditorDoc("A **bold** *quiet* card")).toEqual(
      doc(p(t("A "), t("bold", "bold"), t(" "), t("quiet", "italic"), t(" card"))),
    );
  });

  it("opens both marks together", () => {
    expect(toEditorDoc("***both***")).toEqual(doc(p(t("both", "bold", "italic"))));
  });

  it("opens bullets as a list", () => {
    expect(toEditorDoc("- Card\n- Envelope")).toEqual(doc(ul(p(t("Card")), p(t("Envelope")))));
  });

  it("opens blank text as one empty paragraph, ready to type in", () => {
    expect(toEditorDoc("")).toEqual(doc(p()));
  });
});

describe("fromEditorDoc", () => {
  it("writes paragraphs with a blank line between", () => {
    expect(fromEditorDoc(doc(p(t("First.")), p(t("Second."))))).toBe("First.\n\nSecond.");
  });

  it("writes a hard break as a line break", () => {
    expect(fromEditorDoc(doc(p(t("Card"), br, t("Envelope"))))).toBe("Card\nEnvelope");
  });

  it("writes bold and italic", () => {
    expect(fromEditorDoc(doc(p(t("A "), t("bold", "bold"), t(" and "), t("quiet", "italic"))))).toBe(
      "A **bold** and *quiet*",
    );
  });

  it("keeps spaces outside the markers, where they still read as markers", () => {
    expect(fromEditorDoc(doc(p(t("bold ", "bold"), t("text"))))).toBe("**bold** text");
    expect(fromEditorDoc(doc(p(t("plain"), t(" italic", "italic"))))).toBe("plain *italic*");
  });

  it("writes marks that overlap so they read back the same", () => {
    expect(fromEditorDoc(doc(p(t("a", "bold"), t("b", "bold", "italic"))))).toBe("**a*b***");
  });

  it("escapes asterisks and backslashes typed as text", () => {
    expect(fromEditorDoc(doc(p(t("5 * 3 \\ 2"))))).toBe("5 \\* 3 \\\\ 2");
  });

  it("escapes a line that would otherwise read as a bullet", () => {
    expect(fromEditorDoc(doc(p(t("- not a bullet"))))).toBe("\\- not a bullet");
    expect(fromEditorDoc(doc(p(t("• nor this"))))).toBe("\\• nor this");
  });

  it("writes a list as dash bullets", () => {
    expect(fromEditorDoc(doc(ul(p(t("Card")), p(t("Envelope")))))).toBe("- Card\n- Envelope");
  });

  it("indents a line break inside a bullet, so it stays in that bullet", () => {
    expect(fromEditorDoc(doc(ul(p(t("Card"), br, t("with envelope")))))).toBe("- Card\n  with envelope");
  });

  it("separates a list from the paragraphs around it", () => {
    expect(fromEditorDoc(doc(p(t("Includes:")), ul(p(t("Card"))), p(t("Thanks"))))).toBe(
      "Includes:\n\n- Card\n\nThanks",
    );
  });

  it("drops empty paragraphs and bullets", () => {
    expect(fromEditorDoc(doc(p(t("A")), p(), p(t("B")), ul(p())))).toBe("A\n\nB");
  });

  it("writes an empty editor as nothing", () => {
    expect(fromEditorDoc(doc(p()))).toBe("");
  });
});

describe("opening and saving", () => {
  it.each([
    "First.\n\nSecond.",
    "Card\nEnvelope",
    "A **bold** and *quiet* card",
    "**a *b* c**",
    "**a*b***",
    "*a**b***",
    "***both***",
    "5 \\* 3",
    "\\- not a bullet",
    "Includes:\n\n- **Recycled** card\n- Envelope\n  with a seal\n\nThanks",
  ])("gives back %j exactly as it was", (text) => {
    expect(fromEditorDoc(toEditorDoc(text))).toBe(text);
  });
});
