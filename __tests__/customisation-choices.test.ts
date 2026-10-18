import {
  EMPTY_CHOICES,
  SINGLE,
  clampQuantity,
  extraNote,
  isPersonalising,
  missingChoices,
  packSavingPence,
  statusLine,
  summarise,
  totalPence,
  unitPricePence,
  type Choices,
} from "@/lib/customisation/choices";
import type { Offer } from "@/lib/customisation/offer";

const name = { id: "f1", label: "Name", kind: "TEXT" as const, maxLength: 20, choices: [] };
const sign = { id: "f2", label: "Zodiac sign", kind: "CHOICE" as const, maxLength: null, choices: ["♈ Aries", "♌ Leo"] };

/** A card with everything: packs, a message and optional personalisation. */
const offer: Offer = {
  noun: { one: "card", many: "cards" },
  single: { pricePence: 550, wasPence: null },
  packs: [
    { id: "p3", cards: 3, pricePence: 1500, wasPence: null },
    { id: "p6", cards: 6, pricePence: 3300, wasPence: null },
  ],
  message: { pricePence: 80, maxLength: 300 },
  personalisation: { pricePence: 150, required: false, fields: [name, sign] },
};

/** A card with nothing but the card itself. */
const plain: Offer = { ...offer, packs: [], message: null, personalisation: null };

const required: Offer = { ...offer, personalisation: { ...offer.personalisation!, required: true } };

const complete: Choices = {
  ...EMPTY_CHOICES,
  unit: "p3",
  message: "Printed message",
  messageText: "Happy birthday",
  personalise: true,
  personalisation: { f1: "Ada", f2: "♌ Leo" },
};

describe("to begin with", () => {
  it("nothing is chosen, personalising is off and one is wanted", () => {
    expect(EMPTY_CHOICES).toEqual({ unit: null, message: null, messageText: "", personalise: false, personalisation: {}, quantity: 1 });
  });
});

describe("pricing", () => {
  it("is the single card's price for a card with nothing to choose", () => {
    expect(unitPricePence(plain, EMPTY_CHOICES)).toBe(550);
  });

  it("is the chosen pack's price", () => {
    expect(unitPricePence(offer, { ...EMPTY_CHOICES, unit: "p6" })).toBe(3300);
    expect(unitPricePence(offer, { ...EMPTY_CHOICES, unit: SINGLE })).toBe(550);
  });

  it("has no price until single or pack is chosen, where there is a choice", () => {
    expect(unitPricePence(offer, EMPTY_CHOICES)).toBeNull();
    expect(unitPricePence(offer, { ...EMPTY_CHOICES, unit: "a pack we do not sell" })).toBeNull();
    expect(totalPence(offer, EMPTY_CHOICES)).toBeNull();
  });

  it("adds the printed message for every card", () => {
    const message = { ...EMPTY_CHOICES, message: "Printed message" as const };

    expect(unitPricePence(offer, { ...message, unit: SINGLE })).toBe(550 + 80);
    expect(unitPricePence(offer, { ...message, unit: "p3" })).toBe(1500 + 3 * 80);
  });

  it("adds personalisation for every card, once it is switched on", () => {
    expect(unitPricePence(offer, { ...EMPTY_CHOICES, unit: "p3", personalise: true })).toBe(1500 + 3 * 150);
    expect(unitPricePence(offer, { ...EMPTY_CHOICES, unit: "p3", personalise: false })).toBe(1500);
  });

  it("always adds personalisation that is required", () => {
    expect(unitPricePence(required, { ...EMPTY_CHOICES, unit: SINGLE, personalise: false })).toBe(550 + 150);
  });

  it("adds both together", () => {
    expect(unitPricePence(offer, complete)).toBe(1500 + 3 * 80 + 3 * 150);
  });

  it("ignores a choice of message or personalising the card does not offer", () => {
    expect(unitPricePence(plain, { ...EMPTY_CHOICES, message: "Printed message", personalise: true })).toBe(550);
  });

  it("multiplies by however many are wanted", () => {
    expect(totalPence(offer, { ...complete, quantity: 2 })).toBe(2 * (1500 + 240 + 450));
  });
});

describe("clampQuantity", () => {
  it.each([
    ["0", 1],
    ["", 1],
    ["  ", 1],
    ["-4", 1],
    ["abc", 1],
    ["1000", 99],
    ["2.7", 2],
    ["5", 5],
    [0, 1],
    [100, 99],
  ] as const)("brings %p into the range 1 to 99 as %p", (raw, expected) => {
    expect(clampQuantity(raw)).toBe(expected);
  });
});

describe("packSavingPence", () => {
  it("is what the pack saves against the same cards bought singly", () => {
    expect(packSavingPence(offer, offer.packs[0])).toBe(3 * 550 - 1500);
  });

  it("is nothing when the pack saves nothing", () => {
    expect(packSavingPence(offer, offer.packs[1])).toBeNull();
  });
});

describe("extraNote", () => {
  it("prices an extra per card", () => {
    expect(extraNote(80, offer.noun)).toBe("+80p a card");
    expect(extraNote(150, offer.noun)).toBe("+£1.50 a card");
    expect(extraNote(150, { one: "bookmark", many: "bookmarks" })).toBe("+£1.50 a bookmark");
  });

  it("says when an extra costs nothing", () => {
    expect(extraNote(0, offer.noun)).toBe("No extra charge");
  });
});

describe("isPersonalising", () => {
  it("follows the switch while personalisation is optional", () => {
    expect(isPersonalising(offer, { ...EMPTY_CHOICES, personalise: true })).toBe(true);
    expect(isPersonalising(offer, EMPTY_CHOICES)).toBe(false);
  });

  it("is always so when it is required", () => {
    expect(isPersonalising(required, EMPTY_CHOICES)).toBe(true);
  });

  it("is never so when it is not offered", () => {
    expect(isPersonalising(plain, { ...EMPTY_CHOICES, personalise: true })).toBe(false);
  });
});

describe("missingChoices", () => {
  const keys = (o: Offer, choices: Choices) => missingChoices(o, choices).map((m) => m.key);

  it("asks for nothing on a card with nothing to choose", () => {
    expect(missingChoices(plain, EMPTY_CHOICES)).toEqual([]);
  });

  it("starts by asking for single or pack and a message option, but not personalisation, which is optional", () => {
    expect(missingChoices(offer, EMPTY_CHOICES)).toEqual([
      { key: "unit", message: "Please choose a single card or a pack." },
      { key: "message", message: "Please choose a message option." },
    ]);
  });

  it("names the piece for what it is", () => {
    const bookmark = { ...offer, noun: { one: "bookmark", many: "bookmarks" } };

    expect(missingChoices(bookmark, EMPTY_CHOICES)[0].message).toBe("Please choose a single bookmark or a pack.");
  });

  it("is empty for complete choices", () => {
    expect(missingChoices(offer, complete)).toEqual([]);
  });

  it("asks for the words of a printed message, and counts only spaces as none", () => {
    expect(missingChoices(offer, { ...complete, messageText: "  \n " })).toEqual([
      { key: "messageText", message: "Please type the message you want printed." },
    ]);
  });

  it("asks for nothing to print when the card is left blank inside", () => {
    expect(keys(offer, { ...complete, message: "Blank inside", messageText: "" })).toEqual([]);
  });

  it("asks for each thing to personalise once personalising, in order", () => {
    expect(missingChoices(offer, { ...complete, personalisation: {} })).toEqual([
      { key: "field:f1", message: "Please fill in the name." },
      { key: "field:f2", message: "Please choose the zodiac sign." },
    ]);
  });

  it("does not accept a choice that is not on the list", () => {
    expect(keys(offer, { ...complete, personalisation: { f1: "Ada", f2: "Ophiuchus" } })).toEqual(["field:f2"]);
  });

  it("counts a name of only spaces as none", () => {
    expect(keys(offer, { ...complete, personalisation: { f1: "  ", f2: "♌ Leo" } })).toEqual(["field:f1"]);
  });

  it("asks for nothing to personalise with personalising switched off", () => {
    expect(keys(offer, { ...complete, personalise: false, personalisation: {} })).toEqual([]);
  });

  it("asks for everything to personalise when it is required, switch or not", () => {
    expect(keys(required, { ...complete, personalise: false, personalisation: {} })).toEqual(["field:f1", "field:f2"]);
  });

  it("lists everything missing in page order", () => {
    expect(keys(offer, { ...EMPTY_CHOICES, message: "Printed message", personalise: true })).toEqual([
      "unit",
      "messageText",
      "field:f1",
      "field:f2",
    ]);
  });
});

describe("statusLine", () => {
  it("counts what is still needed", () => {
    expect(statusLine(2)).toBe("2 answers still needed before you can add this to your basket");
    expect(statusLine(1)).toBe("1 answer still needed before you can add this to your basket");
  });

  it("says plainly that ordering opens soon once everything is answered", () => {
    expect(statusLine(0)).toBe("All done. Online ordering opens soon.");
  });
});

describe("summarise", () => {
  it("says nothing about choices the card does not offer", () => {
    expect(summarise(plain, EMPTY_CHOICES)).toEqual([]);
  });

  it("starts with nothing chosen and no personalisation", () => {
    expect(summarise(offer, EMPTY_CHOICES)).toEqual([
      { label: "Single or pack", value: "Not chosen yet" },
      { label: "Inside the card", value: "Not chosen yet" },
      { label: "Personalisation", value: "None" },
    ]);
  });

  it("names the single card or the pack chosen", () => {
    expect(summarise(offer, { ...EMPTY_CHOICES, unit: SINGLE })[0].value).toBe("Single card");
    expect(summarise(offer, { ...EMPTY_CHOICES, unit: "p6" })[0].value).toBe("Pack of 6");
  });

  it.each([
    ["Blank inside", "", "Blank inside"],
    ["Printed message", "", "Printed message (not written yet)"],
    ["Printed message", "  Happy birthday ", "Printed: “Happy birthday”"],
    ["Blank inside", "Happy birthday", "Blank inside"],
  ] as const)("says %p with %p typed as %p", (message, messageText, expected) => {
    expect(summarise(offer, { ...EMPTY_CHOICES, message, messageText })[1].value).toBe(expected);
  });

  it("lists what is personalised as it is filled in", () => {
    expect(summarise(offer, { ...EMPTY_CHOICES, personalise: true })[2].value).toBe("Not filled in yet");
    expect(summarise(offer, { ...EMPTY_CHOICES, personalise: true, personalisation: { f1: " Ada " } })[2].value).toBe("Name: Ada");
    expect(summarise(offer, complete)[2].value).toBe("Name: Ada · Zodiac sign: ♌ Leo");
  });

  it("calls a bookmark a bookmark", () => {
    const bookmark = { ...offer, noun: { one: "bookmark", many: "bookmarks" } };

    expect(summarise(bookmark, { ...EMPTY_CHOICES, unit: SINGLE }).slice(0, 2)).toEqual([
      { label: "Single or pack", value: "Single bookmark" },
      { label: "Inside the bookmark", value: "Not chosen yet" },
    ]);
  });
});
