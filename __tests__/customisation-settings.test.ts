import { parseCustomisation } from "@/lib/customisation/settings";

type Entries = Record<string, string | string[]>;

function form(entries: Entries): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    for (const item of Array.isArray(value) ? value : [value]) data.append(key, item);
  }
  return data;
}

/** Every section switched on and filled in properly. */
const everything: Entries = {
  message: "on",
  messagePrice: "0.80",
  messageMaxLength: "250",
  personalisation: "on",
  personalisationPrice: "1.50",
  personalisationRequired: "on",
  fieldLabel: ["Name", "Zodiac sign"],
  fieldKind: ["TEXT", "CHOICE"],
  fieldMaxLength: ["20", ""],
  fieldChoices: ["", "♈ Aries\n♉ Taurus\n♊ Gemini"],
  packCards: ["3", "6"],
  packPrice: ["15", "27.00"],
};

const errors = (entries: Entries) => {
  const result = parseCustomisation(form(entries));
  return result.ok ? {} : result.errors;
};

describe("parseCustomisation", () => {
  it("reads every section", () => {
    expect(parseCustomisation(form(everything))).toEqual({
      ok: true,
      data: {
        message: { pricePence: 80, maxLength: 250 },
        personalisation: {
          pricePence: 150,
          required: true,
          fields: [
            { label: "Name", kind: "TEXT", maxLength: 20, choices: [] },
            { label: "Zodiac sign", kind: "CHOICE", maxLength: null, choices: ["♈ Aries", "♉ Taurus", "♊ Gemini"] },
          ],
        },
        packs: [
          { cards: 3, pricePence: 1500 },
          { cards: 6, pricePence: 2700 },
        ],
      },
    });
  });

  it("reads nothing switched on as nothing offered", () => {
    expect(parseCustomisation(form({}))).toEqual({ ok: true, data: { message: null, personalisation: null, packs: [] } });
  });

  describe("a section switched off", () => {
    it("is not checked, so what is hidden cannot stop a save", () => {
      const result = parseCustomisation(
        form({ ...everything, message: [], personalisation: [], messagePrice: "lots", fieldLabel: ["", ""], fieldChoices: ["", ""] }),
      );

      expect(result).toMatchObject({ ok: true, data: { message: null, personalisation: null } });
    });
  });

  describe("the printed message", () => {
    it("is free when no cost is given", () => {
      expect(parseCustomisation(form({ message: "on", messagePrice: "" }))).toMatchObject({
        ok: true,
        data: { message: { pricePence: 0, maxLength: 300 } },
      });
    });

    it.each(["lots", "-1", "0.805"])("refuses %p as a cost", (price) => {
      expect(errors({ ...everything, messagePrice: price })).toEqual({ messagePrice: "Write the cost as pounds and pence, like 0.80." });
    });

    it.each(["0", "1001", "2.5", "many"])("refuses %p as the longest message", (length) => {
      expect(errors({ ...everything, messageMaxLength: length })).toEqual({
        messageMaxLength: "Give the longest message as a whole number of characters, from 1 to 1,000.",
      });
    });
  });

  describe("personalisation", () => {
    it("is optional unless it is marked required", () => {
      const result = parseCustomisation(form({ ...everything, personalisationRequired: [] }));

      expect(result).toMatchObject({ ok: true, data: { personalisation: { required: false } } });
    });

    it("refuses a cost that is not pounds and pence", () => {
      expect(errors({ ...everything, personalisationPrice: "£1.5.0" })).toEqual({
        personalisationPrice: "Write the cost as pounds and pence, like 1.50.",
      });
    });

    it("needs at least one thing to personalise", () => {
      expect(errors({ ...everything, fieldLabel: [], fieldKind: [], fieldMaxLength: [], fieldChoices: [] })).toEqual({
        fields: "Say what can be personalised: add at least one thing.",
      });
    });

    it("skips a spare row left empty", () => {
      const result = parseCustomisation(
        form({ ...everything, fieldLabel: ["Name", ""], fieldKind: ["TEXT", "TEXT"], fieldMaxLength: ["20", ""], fieldChoices: ["", ""] }),
      );

      expect(result.ok && result.data.personalisation?.fields).toEqual([{ label: "Name", kind: "TEXT", maxLength: 20, choices: [] }]);
    });

    it("gives typed text a limit of 30 characters unless told otherwise", () => {
      const result = parseCustomisation(
        form({ ...everything, fieldLabel: ["Name"], fieldKind: ["TEXT"], fieldMaxLength: [""], fieldChoices: [""] }),
      );

      expect(result.ok && result.data.personalisation?.fields[0].maxLength).toBe(30);
    });

    it("needs a name for each thing", () => {
      expect(errors({ ...everything, fieldLabel: ["Name", ""] })).toEqual({
        fields: "Thing 2 has no name. Say what is personalised, like Name or Initial.",
      });
    });

    it("refuses the same thing twice", () => {
      expect(errors({ ...everything, fieldLabel: ["Name", "name "] })).toEqual({ fields: "Thing 2 repeats Name." });
    });

    it.each(["0", "201", "x"])("refuses %p as the most characters to type", (max) => {
      expect(errors({ ...everything, fieldMaxLength: [max, ""] })).toEqual({
        fields: "Thing 1 (Name): give the most characters as a whole number from 1 to 200.",
      });
    });

    it("needs at least two choices to choose from", () => {
      expect(errors({ ...everything, fieldChoices: ["", "♈ Aries\n\n  "] })).toEqual({
        fields: "Thing 2 (Zodiac sign): give at least two choices, one per line.",
      });
    });

    it("refuses the same choice twice", () => {
      expect(errors({ ...everything, fieldChoices: ["", "A\nB\nA"] })).toEqual({
        fields: "Thing 2 (Zodiac sign) lists A twice.",
      });
    });

    it("refuses a kind that is not on the list", () => {
      expect(errors({ ...everything, fieldKind: ["TEXT", "DRAWING"] })).toEqual({ fields: "Thing 2 (Zodiac sign): choose what kind it is." });
    });

    it("trims each choice and drops the empty lines", () => {
      const result = parseCustomisation(form({ ...everything, fieldChoices: ["", "  A \r\n\r\n B\n"] }));

      expect(result.ok && result.data.personalisation?.fields[1].choices).toEqual(["A", "B"]);
    });
  });

  describe("packs", () => {
    it("are read whether or not anything else is offered", () => {
      expect(parseCustomisation(form({ packCards: ["4"], packPrice: ["18"] }))).toEqual({
        ok: true,
        data: { message: null, personalisation: null, packs: [{ cards: 4, pricePence: 1800 }] },
      });
    });

    it("skip a spare row left empty", () => {
      const result = parseCustomisation(form({ packCards: ["4", ""], packPrice: ["18", ""] }));

      expect(result.ok && result.data.packs).toEqual([{ cards: 4, pricePence: 1800 }]);
    });

    it.each(["1", "0", "101", "2.5", "a few"])("refuse %p cards in a pack", (cards) => {
      expect(errors({ packCards: [cards], packPrice: ["18"] })).toEqual({
        packs: "Pack 1: give the number in it as a whole number from 2 to 100.",
      });
    });

    it.each(["", "0", "free", "1.234"])("refuse %p as a pack's price", (price) => {
      expect(errors({ packCards: ["4"], packPrice: [price] })).toEqual({ packs: "Pack 1 (4): write its price as pounds and pence, like 18.00." });
    });

    it("refuse two packs of the same size", () => {
      expect(errors({ packCards: ["4", "4"], packPrice: ["18", "17"] })).toEqual({ packs: "Pack 2 repeats a pack of 4." });
    });
  });

  it("reports a problem in every section at once", () => {
    expect(Object.keys(errors({ ...everything, messagePrice: "x", personalisationPrice: "x", packCards: ["1", "6"] })).sort()).toEqual([
      "messagePrice",
      "packs",
      "personalisationPrice",
    ]);
  });
});
