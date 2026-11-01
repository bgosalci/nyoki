import {
  EMPTY_CHOICES,
  SINGLE,
  clampQuantity,
  extraNote,
  initialChoices,
  isPersonalising,
  missingChoices,
  mostAvailable,
  packSavingPence,
  barHint,
  readyHint,
  summarise,
  totalPence,
  unitPricePence,
  type Choices,
} from "@/lib/customisation/choices";
import type { Offer } from "@/lib/customisation/offer";
import { TEXT_LENGTH_LIMIT } from "@/lib/customisation/settings";
import { toClothingOffer } from "@/lib/clothes/stock";

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
  clothing: null,
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
    expect(EMPTY_CHOICES).toEqual({
      unit: null,
      message: null,
      messageText: "",
      personalise: false,
      personalisation: {},
      colour: null,
      size: null,
      quantity: 1,
    });
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

  it("brings it down to the most there is, but never below one", () => {
    expect(clampQuantity("5", 3)).toBe(3);
    expect(clampQuantity(2, 3)).toBe(2);
    expect(clampQuantity("5", 0)).toBe(1);
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
      { key: "unit", message: "Please choose a single card or a pack.", short: "Choose single or pack" },
      { key: "message", message: "Please choose a message option.", short: "Choose a message option" },
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
      { key: "messageText", message: "Please type the message you want printed.", short: "Type your message" },
    ]);
  });

  it("asks for nothing to print when the card is left blank inside", () => {
    expect(keys(offer, { ...complete, message: "Blank inside", messageText: "" })).toEqual([]);
  });

  it("asks for each thing to personalise once personalising, in order", () => {
    expect(missingChoices(offer, { ...complete, personalisation: {} })).toEqual([
      { key: "field:f1", message: "Please fill in “Name”.", short: "Fill in “Name”" },
      { key: "field:f2", message: "Please choose one for “Zodiac sign”.", short: "Choose one for “Zodiac sign”" },
    ]);
  });

  it("names a thing to personalise as the shop wrote it, so a label that is a sentence still reads", () => {
    // Lowercased into "Fill in the ...", a real label read "Fill in the type your character".
    const asked = (label: string, kind: "TEXT" | "CHOICE" = "TEXT") => {
      const field = { ...name, label, kind, choices: kind === "CHOICE" ? ["A"] : [] };
      const card = { ...offer, personalisation: { ...offer.personalisation!, fields: [field] } };
      return missingChoices(card, { ...complete, personalisation: {} })[0];
    };

    expect(asked("Type your character")).toMatchObject({ message: "Please fill in “Type your character”.", short: "Fill in “Type your character”" });
    expect(asked("Choose your initial", "CHOICE")).toMatchObject({ message: "Please choose one for “Choose your initial”." });
    // A colon or full stop of its own is left out; a question keeps its mark and needs no other.
    expect(asked("  Their name:  ").message).toBe("Please fill in “Their name”.");
    expect(asked("Who is it for?").message).toBe("Please fill in “Who is it for?”");
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

  it("refuses a printed message longer than the card takes, as the basket must when the page is bypassed", () => {
    // The box stops at its limit; a request made without the page does not.
    expect(missingChoices(offer, { ...complete, messageText: "x".repeat(301) })).toEqual([
      { key: "messageText", message: "Please keep the message to 300 characters.", short: "Shorten your message" },
    ]);
    expect(missingChoices(offer, { ...complete, messageText: "x".repeat(300) })).toEqual([]);
  });

  it("refuses anything typed to personalise that is longer than its limit", () => {
    expect(missingChoices(offer, { ...complete, personalisation: { f1: "x".repeat(21), f2: "♌ Leo" } })).toEqual([
      { key: "field:f1", message: "Please keep “Name” to 20 characters.", short: "Shorten “Name”" },
    ]);
    expect(keys(offer, { ...complete, personalisation: { f1: "x".repeat(20), f2: "♌ Leo" } })).toEqual([]);
  });

  it("counts what is kept, not the spaces around it, and says a limit of one plainly", () => {
    const initial = { ...name, label: "Initial", maxLength: 1 };
    const card = { ...offer, message: { pricePence: 80, maxLength: 1000 }, personalisation: { ...offer.personalisation!, fields: [initial] } };

    expect(keys(card, { ...complete, personalisation: { f1: "  A  " } })).toEqual([]);
    expect(missingChoices(card, { ...complete, personalisation: { f1: "AB" } })[0].message).toBe("Please keep “Initial” to 1 character.");
    expect(missingChoices(card, { ...complete, messageText: "x".repeat(1001), personalisation: { f1: "A" } })[0].message).toBe(
      "Please keep the message to 1,000 characters.",
    );
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

describe("barHint", () => {
  const missing = (o: Offer, choices: Choices) => barHint(missingChoices(o, choices));

  it("says the one thing still to choose, short enough for a line of the bar", () => {
    expect(missing(offer, { ...complete, messageText: "" })).toBe("Type your message");
    expect(missing(dress, { ...EMPTY_CHOICES, colour: "Lupin" })).toBe("Choose a size");
  });

  it("asks for a colour and size together, and counts anything else", () => {
    expect(missing(dress, EMPTY_CHOICES)).toBe("Choose a colour and size");
    expect(missing(offer, EMPTY_CHOICES)).toBe("2 choices still needed");
  });

  it("says plainly that ordering opens soon once everything is chosen", () => {
    expect(missing(offer, complete)).toBe("Online ordering opens soon");
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

/** A dress in two colours and two sizes: Lupin in S, Gypsum in S, nothing in M. */
const dress: Offer = {
  ...plain,
  noun: { one: "piece", many: "pieces" },
  clothing: toClothingOffer({
    colours: ["Lupin", "Gypsum"],
    sizes: ["S", "M"],
    madeToOrder: false,
    madeOnOrder: false,
    variants: [
      { colour: "Lupin", size: "S", stock: 2 },
      { colour: "Lupin", size: "M", stock: 0 },
      { colour: "Gypsum", size: "S", stock: 1 },
    ],
  }),
};

describe("mostAvailable", () => {
  it("is the piece's own stock, for anything not clothing", () => {
    expect(mostAvailable(plain, EMPTY_CHOICES, 4)).toBe(4);
    expect(mostAvailable(plain, EMPTY_CHOICES, 0)).toBe(0);
  });

  it("is as many as the box takes for a piece made to order, which never runs out", () => {
    expect(mostAvailable(plain, EMPTY_CHOICES, null)).toBe(99);
    expect(mostAvailable(plain, EMPTY_CHOICES, 500)).toBe(99);
  });

  it("counts every card in the pack chosen - a pack of three takes three", () => {
    expect(mostAvailable(offer, { ...EMPTY_CHOICES, unit: "p3" }, 10)).toBe(3);
    expect(mostAvailable(offer, { ...EMPTY_CHOICES, unit: "p6" }, 5)).toBe(0);
    expect(mostAvailable(offer, { ...EMPTY_CHOICES, unit: SINGLE }, 10)).toBe(10);
    // Until one is chosen, as many as there are single cards.
    expect(mostAvailable(offer, EMPTY_CHOICES, 10)).toBe(10);
  });

  it("is the stock of the colour in the size chosen", () => {
    expect(mostAvailable(dress, { ...EMPTY_CHOICES, colour: "Lupin", size: "S" }, 3)).toBe(2);
    expect(mostAvailable(dress, { ...EMPTY_CHOICES, colour: "Gypsum", size: "S" }, 3)).toBe(1);
  });

  it("is the most of any still possible until both are chosen", () => {
    expect(mostAvailable(dress, EMPTY_CHOICES, 3)).toBe(2);
    expect(mostAvailable(dress, { ...EMPTY_CHOICES, colour: "Gypsum" }, 3)).toBe(1);
    expect(mostAvailable(dress, { ...EMPTY_CHOICES, size: "M" }, 3)).toBe(0);
  });

  it("goes by clothing's own colours and sizes, unless it is made to order", () => {
    const madeToOrder: Offer = { ...dress, clothing: { ...dress.clothing!, unlimited: true } };
    expect(mostAvailable(madeToOrder, { ...EMPTY_CHOICES, colour: "Gypsum", size: "M" }, 0)).toBe(99);
  });
});

describe("clothes", () => {
  it("asks for a colour, then a size", () => {
    expect(missingChoices(dress, EMPTY_CHOICES)).toEqual([
      { key: "colour", message: "Please choose a colour.", short: "Choose a colour" },
      { key: "size", message: "Please choose a size.", short: "Choose a size" },
    ]);
  });

  it("asks for nothing more once a colour and a size in stock are chosen", () => {
    expect(missingChoices(dress, { ...EMPTY_CHOICES, colour: "Gypsum", size: "S" })).toEqual([]);
  });

  it("will not take a colour in a size that is out of stock, should one be chosen", () => {
    expect(missingChoices(dress, { ...EMPTY_CHOICES, colour: "Lupin", size: "M" })).toEqual([
      { key: "size", message: "Sorry, that size is out of stock in that colour. Please choose another.", short: "Out of stock in that colour" },
    ]);
  });

  it("will not take a colour or a size the piece does not have", () => {
    expect(missingChoices(dress, { ...EMPTY_CHOICES, colour: "Teal", size: "XL" }).map((entry) => entry.key)).toEqual(["colour", "size"]);
  });

  it("asks only for what the piece has", () => {
    const sized: Offer = { ...dress, clothing: { ...dress.clothing!, colours: [], stock: [{ colour: null, size: "S", stock: 1 }] } };

    expect(missingChoices(sized, EMPTY_CHOICES).map((entry) => entry.key)).toEqual(["size"]);
  });

  it("sells every colour and size at the piece's own price", () => {
    expect(unitPricePence(dress, { ...EMPTY_CHOICES, colour: "Lupin", size: "S" })).toBe(550);
  });

  it("summarises the colour and the size", () => {
    expect(summarise(dress, EMPTY_CHOICES)).toEqual([
      { label: "Colour", value: "Not chosen yet" },
      { label: "Size", value: "Not chosen yet" },
    ]);
    expect(summarise(dress, { ...EMPTY_CHOICES, colour: "Lupin", size: "S" })).toEqual([
      { label: "Colour", value: "Lupin" },
      { label: "Size", value: "S" },
    ]);
  });
});

describe("initialChoices", () => {
  it("chooses nothing, for a piece with more than one of each", () => {
    expect(initialChoices(dress)).toEqual(EMPTY_CHOICES);
    expect(initialChoices(offer)).toEqual(EMPTY_CHOICES);
  });

  it("starts with the only colour, or the only size, there is - while it is in stock", () => {
    const tuberose: Offer = {
      ...dress,
      clothing: toClothingOffer({
        colours: ["Tuberose"],
        sizes: ["S", "M"],
        madeToOrder: false,
        madeOnOrder: false,
        variants: [{ colour: "Tuberose", size: "S", stock: 1 }],
      }),
    };
    expect(initialChoices(tuberose)).toEqual({ ...EMPTY_CHOICES, colour: "Tuberose" });

    const soldOut: Offer = { ...tuberose, clothing: { ...tuberose.clothing!, stock: [] } };
    expect(initialChoices(soldOut)).toEqual(EMPTY_CHOICES);
  });
});

describe("readyHint", () => {
  it("says in a few words what was chosen, for the bar once nothing is missing", () => {
    expect(readyHint(offer, complete)).toBe("Pack of 3 · Printed message · Personalised");
    expect(readyHint(offer, { ...complete, unit: SINGLE, message: "Blank inside", personalise: false })).toBe("Single card · Blank inside");
  });

  it("names clothing's colour and size", () => {
    expect(readyHint(dress, { ...EMPTY_CHOICES, colour: "Lupin", size: "S" })).toBe("Lupin · S");
  });

  it("says it is ready when there was nothing to choose", () => {
    expect(readyHint(plain, EMPTY_CHOICES)).toBe("Ready to add");
  });
});

describe("missingChoices for a text field with no limit of its own", () => {
  // The column is nullable, and a field saved before the Customise tab
  // insisted on a limit, or written some other way, had none - so the server
  // took text of any length for it. It is held to the most the tab allows.
  const unlimited = { ...name, maxLength: null };
  const card: Offer = { ...offer, personalisation: { ...offer.personalisation!, fields: [unlimited] } };

  it("refuses text longer than the most a field may be given", () => {
    const missing = missingChoices(card, { ...complete, personalisation: { f1: "x".repeat(TEXT_LENGTH_LIMIT + 1) } });

    expect(missing).toEqual([
      { key: "field:f1", message: `Please keep “Name” to ${TEXT_LENGTH_LIMIT} characters.`, short: "Shorten “Name”" },
    ]);
  });

  it("takes text up to it", () => {
    expect(missingChoices(card, { ...complete, personalisation: { f1: "x".repeat(TEXT_LENGTH_LIMIT) } })).toEqual([]);
  });
});
