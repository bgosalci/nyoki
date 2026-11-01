import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CustomiserBar, CustomiserPanels, CustomiserProvider } from "@/components/shop/customiser";
import type { Offer } from "@/lib/customisation/offer";
import { toClothingOffer } from "@/lib/clothes/stock";

const name = { id: "f1", label: "Name", kind: "TEXT" as const, maxLength: 12, choices: [] };
const sign = { id: "f2", label: "Zodiac sign", kind: "CHOICE" as const, maxLength: null, choices: ["♈ Aries", "♌ Leo"] };

/** A card offering everything, personalisation optional. */
const everything: Offer = {
  noun: { one: "card", many: "cards" },
  single: { pricePence: 550, wasPence: null },
  packs: [{ id: "p3", cards: 3, pricePence: 1500, wasPence: null }],
  message: { pricePence: 80, maxLength: 200 },
  personalisation: { pricePence: 150, required: false, fields: [name, sign] },
  clothing: null,
};

function setup(offer: Offer = everything) {
  const user = userEvent.setup();
  render(
    <CustomiserProvider offer={offer}>
      <CustomiserPanels />
      <CustomiserBar />
    </CustomiserProvider>,
  );
  return { user };
}

const panel = (title: RegExp) => screen.getByRole("region", { name: title });
const total = () => screen.getByTestId("customiser-total");
const status = () => screen.getByTestId("customiser-status");
const bar = () => screen.getByTestId("customiser-bar");
const addButton = () => screen.getByRole("button", { name: "Add to basket" });
const summaryValue = (label: string) => {
  const row = within(screen.getByTestId("customiser-summary")).getByText(label).closest("div")!;
  return within(row).getByRole("definition").textContent;
};

async function chooseEverything(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("radio", { name: /^pack of 3/i }));
  await user.click(screen.getByRole("radio", { name: /add a printed message/i }));
  await user.type(screen.getByLabelText("Your message"), "Happy birthday");
  await user.click(screen.getByRole("switch", { name: /personalise it/i }));
  await user.type(screen.getByLabelText("Name"), "Ada");
  await user.selectOptions(screen.getByLabelText("Zodiac sign"), "♌ Leo");
}

describe("the customiser", () => {
  describe("shows only what the piece offers", () => {
    it("everything, for a card offering everything", () => {
      setup();

      expect(panel(/single or pack/i)).toBeInTheDocument();
      expect(panel(/message inside/i)).toBeInTheDocument();
      expect(panel(/personalisation/i)).toBeInTheDocument();
    });

    it("no single-or-pack choice for a card sold only singly", () => {
      setup({ ...everything, packs: [] });

      expect(screen.queryByRole("region", { name: /single or pack/i })).not.toBeInTheDocument();
    });

    it("no message for a card without one", () => {
      setup({ ...everything, message: null });

      expect(screen.queryByRole("region", { name: /message inside/i })).not.toBeInTheDocument();
    });

    it("no personalisation for a card without it", () => {
      setup({ ...everything, personalisation: null });

      expect(screen.queryByRole("region", { name: /personalisation/i })).not.toBeInTheDocument();
    });
  });

  describe("single or pack", () => {
    it("offers the single card and each pack, with what each costs and what the pack saves", () => {
      setup();

      // "Pack of 3" says how many; a "3 cards" line beneath only made the
      // tile taller.
      expect(screen.getByRole("radio", { name: "Single £5.50" })).not.toBeChecked();
      expect(screen.getByRole("radio", { name: "Pack of 3 £15.00 Save £1.50" })).not.toBeChecked();
    });

    it("draws each choice as a small card, a few to a row", () => {
      setup();

      const tile = screen.getByRole("radio", { name: /^single/i }).closest("label")!;
      expect(tile).toHaveClass("rounded-lg", "py-2", "text-sm");
      expect(tile).not.toHaveClass("min-h-14");
      expect(tile.parentElement).toHaveClass("grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))]");
    });

    it("keeps a pack's price and its saving on one line", () => {
      // The cards are at least wide enough for both, and the line never
      // breaks: wrapped, the saving sat alone beneath the price.
      setup();

      const line = screen.getByText("£15.00").parentElement!;
      expect(line).toContainElement(screen.getByText("Save £1.50"));
      expect(line).toHaveClass("flex-nowrap", "whitespace-nowrap");
      expect(line).not.toHaveClass("flex-wrap");
    });

    it("draws the saving as a sage outline, light beside the price", () => {
      // A sage fill under ink read as a heavy grey blob next to the price.
      setup();

      const saving = screen.getByText("Save £1.50");
      expect(saving).toHaveClass("border", "border-nyoki-sage", "text-nyoki-sage-deep", "rounded-full");
      expect(saving.className).not.toMatch(/\bbg-/);
    });

    it("shows what each was, during a sale", () => {
      setup({
        ...everything,
        single: { pricePence: 440, wasPence: 550 },
        packs: [{ id: "p3", cards: 3, pricePence: 1200, wasPence: 1500 }],
      });

      expect(screen.getByText("£5.50").tagName).toBe("S");
      expect(screen.getByText("£15.00").tagName).toBe("S");
    });

    it("is marked required", () => {
      setup();

      expect(within(panel(/single or pack/i)).getByText("Required")).toBeInTheDocument();
    });
  });

  describe("the message inside", () => {
    it("says what a printed message costs a card", () => {
      setup();

      expect(screen.getByRole("radio", { name: "Add a printed message +80p a card" })).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: "Leave it blank You'll write your own" })).toBeInTheDocument();
    });

    it("opens a box for the words, as long as the card allows, with a counter", async () => {
      const { user } = setup();

      await user.click(screen.getByRole("radio", { name: /add a printed message/i }));

      expect(screen.getByLabelText("Your message")).toHaveAttribute("maxLength", "200");
      await user.type(screen.getByLabelText("Your message"), "Hi");
      expect(screen.getByText("2 / 200")).toBeInTheDocument();
    });

    it("closes the box when the card is to be left blank", async () => {
      const { user } = setup();

      await user.click(screen.getByRole("radio", { name: /add a printed message/i }));
      await user.click(screen.getByRole("radio", { name: /leave it blank/i }));

      expect(screen.queryByLabelText("Your message")).not.toBeInTheDocument();
    });

    it("says, with the box, that the words are printed as typed and the card cannot then be returned", async () => {
      // The law asks for this before the order: a personalised piece has no
      // right to cancel, and the shopper must be told so.
      const { user } = setup();

      expect(within(panel(/message inside/i)).queryByText(/made just for you/i)).not.toBeInTheDocument();
      await user.click(screen.getByRole("radio", { name: /add a printed message/i }));

      const note = within(panel(/message inside/i)).getByText(/we print exactly what you type/i);
      expect(note).toHaveTextContent(/made just for you, so it can't be returned unless something is wrong with it/i);
      expect(within(note).getByRole("link", { name: "returns policy" })).toHaveAttribute("href", "/policies/returns#personalised");
    });
  });

  describe("optional personalisation", () => {
    it("is switched off to begin with, says what it costs, and is marked optional", () => {
      setup();

      expect(screen.getByRole("switch", { name: /personalise it/i })).not.toBeChecked();
      expect(within(panel(/personalisation/i)).getByText("+£1.50 a card")).toBeInTheDocument();
      expect(within(panel(/personalisation/i)).getByText("Optional")).toBeInTheDocument();
      expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
    });

    it("asks for each thing once switched on: typed, or chosen from its list", async () => {
      const { user } = setup();

      await user.click(screen.getByRole("switch", { name: /personalise it/i }));

      expect(screen.getByLabelText("Name")).toHaveAttribute("maxLength", "12");
      const signs = within(screen.getByLabelText("Zodiac sign")).getAllByRole("option").map((option) => option.textContent);
      expect(signs).toEqual(["Choose…", "♈ Aries", "♌ Leo"]);
    });

    it("says it cannot then be returned only once switched on", async () => {
      const { user } = setup();

      expect(within(panel(/personalisation/i)).queryByText(/made just for you/i)).not.toBeInTheDocument();
      await user.click(screen.getByRole("switch", { name: /personalise it/i }));

      expect(within(panel(/personalisation/i)).getByText(/made just for you/i)).toBeInTheDocument();
    });
  });

  describe("required personalisation", () => {
    const required = { ...everything, personalisation: { ...everything.personalisation!, required: true } };

    it("has no switch: it asks for each thing straight away, and is marked required", () => {
      setup(required);

      expect(screen.queryByRole("switch")).not.toBeInTheDocument();
      expect(screen.getByLabelText("Name")).toBeInTheDocument();
      expect(within(panel(/personalisation/i)).getByText("Required")).toBeInTheDocument();
    });

    it("says straight away that it cannot be returned", () => {
      setup(required);

      expect(within(panel(/personalisation/i)).getByText(/made just for you/i)).toBeInTheDocument();
    });

    it("says what it adds, when it adds anything", () => {
      setup(required);

      expect(within(panel(/personalisation/i)).getByText(/\+£1\.50 a card/)).toBeInTheDocument();
    });
  });

  describe("the total", () => {
    it("shows nothing until single or pack is chosen", () => {
      setup();

      expect(total()).toHaveTextContent("—");
    });

    it("is the single card's price straight away, when there is no pack to choose", () => {
      setup({ ...everything, packs: [] });

      expect(total()).toHaveTextContent("£5.50");
    });

    it("adds the extras for every card in the pack, and multiplies by the quantity", async () => {
      const { user } = setup();
      await chooseEverything(user);

      // £15.00 + 3 × 80p + 3 × £1.50
      expect(total()).toHaveTextContent("£21.90");

      await user.click(screen.getByRole("button", { name: "One more" }));
      expect(total()).toHaveTextContent("£43.80");
    });

    it("tidies a quantity typed out of range when the box is left", async () => {
      const { user } = setup();
      const quantity = screen.getByLabelText("Quantity");

      await user.clear(quantity);
      await user.type(quantity, "500");
      await user.tab();

      expect(quantity).toHaveValue(99);
    });
  });

  describe("the bar", () => {
    it("is one slim row: the total, a line saying what is left, and Add to basket", () => {
      setup();

      expect(within(bar()).getByTestId("customiser-total")).toBeInTheDocument();
      expect(within(bar()).getByTestId("customiser-status")).toBeInTheDocument();
      expect(within(bar()).getByRole("button", { name: "Add to basket" })).toBeInTheDocument();
      expect(within(bar()).getByTestId("customiser-total").closest(".h-16")).not.toBeNull();
    });

    it("keeps quantity with the choices, out of the bar", () => {
      setup();

      const quantity = screen.getByLabelText("Quantity");
      expect(bar()).not.toContainElement(quantity);
      expect(quantity.closest("form")).toBe(document.querySelector("form"));
    });

    it("runs edge to edge on a phone, and floats as a card from a tablet up", () => {
      setup();

      expect(bar()).toHaveClass("-mx-4", "sticky", "bottom-0", "md:rounded-2xl");
    });
  });

  describe("the summary", () => {
    it("follows each choice", async () => {
      const { user } = setup();
      expect(summaryValue("Single or pack")).toBe("Not chosen yet");
      expect(summaryValue("Inside the card")).toBe("Not chosen yet");
      expect(summaryValue("Personalisation")).toBe("None");

      await chooseEverything(user);

      expect(summaryValue("Single or pack")).toBe("Pack of 3");
      expect(summaryValue("Inside the card")).toBe("Printed: “Happy birthday”");
      expect(summaryValue("Personalisation")).toBe("Name: Ada · Zodiac sign: ♌ Leo");
    });

    it("is announced politely as it changes", () => {
      setup();

      expect(screen.getByTestId("customiser-summary")).toHaveAttribute("aria-live", "polite");
    });
  });

  describe("Add to basket, before the basket exists", () => {
    it("is marked unavailable without being faded or switched off", () => {
      setup();

      expect(addButton()).toHaveAttribute("aria-disabled", "true");
      expect(addButton()).toBeEnabled();
      expect(addButton().className).not.toMatch(/opacity/);
    });

    it("says in a short line what is still needed", () => {
      setup();

      expect(status()).toHaveTextContent("2 choices still needed");
      expect(status()).toHaveAttribute("aria-live", "polite");
    });

    it("shows what is missing when pressed too soon, and moves to the first of it", async () => {
      const { user } = setup();
      await user.click(screen.getByRole("radio", { name: /^pack of 3/i }));
      await user.click(screen.getByRole("switch", { name: /personalise it/i }));

      await user.click(addButton());

      expect(screen.getByText("Please choose a message option.")).toBeInTheDocument();
      expect(screen.getByText("Please fill in the name.")).toBeInTheDocument();
      expect(screen.getByText("Please choose the zodiac sign.")).toBeInTheDocument();
      expect(screen.getAllByRole("radio", { name: /leave it blank|add a printed message/i })[0]).toHaveFocus();
    });

    it("shows no errors before it is pressed", () => {
      setup();

      expect(screen.queryByText("Please choose a message option.")).not.toBeInTheDocument();
    });

    it("says ordering opens soon once everything is chosen, and how to order meanwhile when pressed", async () => {
      const { user } = setup();
      await chooseEverything(user);

      expect(status()).toHaveTextContent("Online ordering opens soon");
      expect(screen.queryByTestId("customiser-notice")).not.toBeInTheDocument();

      await user.click(addButton());
      expect(screen.getByTestId("customiser-notice")).toHaveTextContent("Online ordering opens soon. Until then, send us a question to order this one.");
      expect(screen.getByTestId("customiser-notice")).toHaveAttribute("role", "status");
    });
  });

  it("does its own checking, so the browser never pops up its own", () => {
    const { container } = render(
      <CustomiserProvider offer={everything}>
        <CustomiserPanels />
      </CustomiserProvider>,
    );

    expect(container.querySelector("form")).toHaveAttribute("novalidate");
  });

  it("calls a bookmark a bookmark", () => {
    setup({ ...everything, noun: { one: "bookmark", many: "bookmarks" }, message: null });

    expect(screen.getByText("Buy one bookmark, or a pack and save.")).toBeInTheDocument();
  });
});

/**
 * A dress in three colours and two sizes. Lupin is in stock in S only, Gypsum
 * in both, and Pepper in neither.
 */
const dress: Offer = {
  ...everything,
  noun: { one: "piece", many: "pieces" },
  packs: [],
  message: null,
  personalisation: null,
  clothing: toClothingOffer({
    colours: ["Lupin", "Gypsum", "Pepper"],
    sizes: ["S", "M"],
    madeToOrder: false,
    madeOnOrder: false,
    variants: [
      { colour: "Lupin", size: "S", stock: 2 },
      { colour: "Lupin", size: "M", stock: 0 },
      { colour: "Gypsum", size: "S", stock: 1 },
      { colour: "Gypsum", size: "M", stock: 3 },
      { colour: "Pepper", size: "S", stock: 0 },
      { colour: "Pepper", size: "M", stock: 0 },
    ],
  }),
};

const tile = (name: string) => screen.getByRole("radio", { name: new RegExp(`^${name}`) });

describe("colour and size", () => {
  it("says in the bar which of the two is still to choose", async () => {
    const { user } = setup(dress);
    expect(status()).toHaveTextContent("Choose a colour and size");

    await user.click(tile("Gypsum"));
    expect(status()).toHaveTextContent("Choose a size");
  });

  it("asks for a colour and a size, each required", () => {
    setup(dress);

    expect(panel(/^colour/i)).toHaveTextContent(/required/i);
    expect(panel(/^size/i)).toHaveTextContent(/required/i);
    expect(screen.getAllByRole("radio").map((radio) => radio.closest("label")!.textContent)).toEqual([
      "Lupin",
      "Gypsum",
      "Pepper Out of stock",
      "S",
      "M",
    ]);
  });

  it("shows a colour out of stock in every size as out of stock, and will not take it", () => {
    setup(dress);

    expect(tile("Pepper")).toBeDisabled();
    expect(tile("Pepper")).toHaveAccessibleName(/out of stock/i);
  });

  it("shows a size out of stock in the colour chosen, and the colours out of stock in the size chosen", async () => {
    const { user } = setup(dress);

    await user.click(tile("Lupin"));
    expect(tile("M")).toBeDisabled();
    expect(tile("M")).toHaveAccessibleName(/out of stock/i);
    expect(tile("S")).toBeEnabled();

    await user.click(tile("Gypsum"));
    await user.click(tile("M"));
    expect(tile("Lupin")).toBeDisabled();
    expect(tile("Gypsum")).toBeChecked();
  });

  it("says what is missing when Add to basket is pressed too soon, and moves to the colour", async () => {
    const { user } = setup(dress);

    await user.click(addButton());

    expect(panel(/^colour/i)).toHaveTextContent("Please choose a colour.");
    expect(panel(/^size/i)).toHaveTextContent("Please choose a size.");
    expect(tile("Lupin")).toHaveFocus();
  });

  it("is done once a colour and a size in stock are chosen, and shows both in the summary", async () => {
    const { user } = setup(dress);

    await user.click(tile("Gypsum"));
    await user.click(tile("M"));

    expect(status()).toHaveTextContent("Online ordering opens soon");
    expect(summaryValue("Colour")).toBe("Gypsum");
    expect(summaryValue("Size")).toBe("M");
    expect(total()).toHaveTextContent("£5.50");
  });

  it("chooses the only colour there is for the shopper", () => {
    setup({ ...dress, clothing: { ...dress.clothing!, colours: ["Gypsum"], stock: dress.clothing!.stock.filter((row) => row.colour === "Gypsum") } });

    expect(tile("Gypsum")).toBeChecked();
  });

  it("says so when nothing is left in any colour or size", async () => {
    const { user } = setup({ ...dress, clothing: { ...dress.clothing!, stock: [] } });

    expect(status()).toHaveTextContent("Out of stock for now");
    await user.click(addButton());
    expect(status()).toHaveTextContent("Out of stock for now");
    expect(screen.queryByText("Please choose a colour.")).not.toBeInTheDocument();
  });
});

describe("Add to basket, once ordering is open", () => {
  const added = {
    ok: true as const,
    added: { name: "Snowman Card", image: null, quantity: 1, unitPence: 2190, details: [] },
    basket: { pieces: 1, subtotalPence: 2190, freeDelivery: null },
    note: null,
  };

  function setupOpen(offer: Offer = everything, add = jest.fn().mockResolvedValue(added), extra: { stock?: number | null } = {}) {
    const user = userEvent.setup();
    render(
      <CustomiserProvider offer={offer} productId="card-1" add={add} {...extra}>
        <CustomiserPanels />
        <CustomiserBar />
      </CustomiserProvider>,
    );
    return { user, add };
  }

  it("is a working button, no longer marked unavailable", () => {
    setupOpen();

    expect(addButton()).not.toHaveAttribute("aria-disabled");
  });

  it("says what was chosen in the bar, rather than that ordering opens soon", async () => {
    const { user } = setupOpen();
    await chooseEverything(user);

    expect(status()).toHaveTextContent("Pack of 3 · Printed message · Personalised");
  });

  it("puts the piece in with everything chosen, and says so with the way to the basket", async () => {
    const { user, add } = setupOpen();
    await chooseEverything(user);

    await user.click(addButton());

    expect(add).toHaveBeenCalledWith(
      "card-1",
      expect.objectContaining({ unit: "p3", message: "Printed message", messageText: "Happy birthday", personalisation: { f1: "Ada", f2: "♌ Leo" }, quantity: 1 }),
    );
    const notice = screen.getByTestId("customiser-notice");
    expect(notice).toHaveTextContent("Added to your basket.");
    expect(within(notice).getByRole("link", { name: "View basket" })).toHaveAttribute("href", "/basket");
    // A computer has the panel from the header's basket instead.
    expect(notice).toHaveClass("md:hidden");
  });

  it("still shows what is missing when pressed too soon, and sends nothing", async () => {
    const { user, add } = setupOpen();

    await user.click(addButton());

    expect(screen.getByText("Please choose a single card or a pack.")).toBeInTheDocument();
    expect(add).not.toHaveBeenCalled();
  });

  // A browser sends a form from its fields on Enter, to the button tied to
  // it by its form attribute. user-event looks for that button only inside
  // the form, so it never sends this one: what stops a browser is Enter's
  // keydown being cancelled, which is what these check.
  it("never puts the piece in from Enter in a box or on a choice, only from the button", async () => {
    const { user } = setupOpen();
    await chooseEverything(user);
    const sends = (element: HTMLElement) => fireEvent.keyDown(element, { key: "Enter" });

    expect(sends(screen.getByLabelText("Name"))).toBe(false);
    expect(sends(screen.getByRole("radio", { name: /^pack of 3/i }))).toBe(false);
    expect(sends(screen.getByRole("switch", { name: /personalise it/i }))).toBe(false);
    // A message can still run onto a new line.
    expect(sends(screen.getByLabelText("Your message"))).toBe(true);
  });

  it("says why, when the piece could not go in", async () => {
    const { user } = setupOpen(everything, jest.fn().mockResolvedValue({ ok: false, message: "Sorry, this is out of stock." }));
    await chooseEverything(user);

    await user.click(addButton());

    expect(screen.getByTestId("customiser-notice")).toHaveTextContent("Sorry, this is out of stock.");
    expect(within(screen.getByTestId("customiser-notice")).queryByRole("link")).not.toBeInTheDocument();
  });

  it("says when only some could go in, beside the button on a computer too", async () => {
    const short = "Sorry, we only have enough for 2, so we've added 2 rather than 5.";
    const { user } = setupOpen(everything, jest.fn().mockResolvedValue({ ...added, note: short }));
    await chooseEverything(user);

    await user.click(addButton());

    const notice = screen.getByTestId("customiser-notice");
    expect(notice).toHaveTextContent(short);
    expect(within(notice).getByRole("link", { name: "View basket" })).toHaveAttribute("href", "/basket");
    // The panel from the header's basket says it too, but far from where
    // the shopper's eyes are.
    expect(notice).not.toHaveClass("md:hidden");
  });

  it("sends it once, however quickly it is pressed again", async () => {
    let finish: (value: typeof added) => void = () => {};
    const add = jest.fn(() => new Promise<typeof added>((resolve) => (finish = resolve)));
    const { user } = setupOpen(everything, add);
    await chooseEverything(user);

    const button = addButton();
    await user.click(button);
    await user.click(button);
    expect(button).toHaveTextContent("Adding…");
    finish(added);

    expect(add).toHaveBeenCalledTimes(1);
    expect(await screen.findByTestId("customiser-notice")).toHaveTextContent("Added to your basket.");
  });

  it("says a card with none left is out of stock, and sends nothing", async () => {
    const { user, add } = setupOpen(everything, undefined, { stock: 0 });

    expect(status()).toHaveTextContent("Out of stock for now");
    await user.click(addButton());
    expect(add).not.toHaveBeenCalled();
  });
});

describe("a piece with nothing to choose, once ordering is open", () => {
  const plainOffer: Offer = { ...everything, noun: { one: "piece", many: "pieces" }, packs: [], message: null, personalisation: null };
  const added = {
    ok: true as const,
    added: { name: "Tree Card", image: null, quantity: 2, unitPence: 550, details: [] },
    basket: { pieces: 2, subtotalPence: 1100, freeDelivery: null },
    note: null,
  };

  function setupPlain(extra: { oneOfAKind?: boolean; stock?: number | null } = {}) {
    const user = userEvent.setup();
    const add = jest.fn().mockResolvedValue(added);
    render(
      <CustomiserProvider offer={plainOffer} productId="tree" add={add} {...extra}>
        <CustomiserPanels />
        <CustomiserBar />
      </CustomiserProvider>,
    );
    return { user, add };
  }

  it("is bought the same way as any other: a quantity with the details, and Add to basket in the bar", async () => {
    const { user, add } = setupPlain();

    expect(screen.getByLabelText("Quantity")).toBeInTheDocument();
    expect(within(bar()).getByRole("button", { name: "Add to basket" })).toBeInTheDocument();
    expect(status()).toHaveTextContent("Ready to add");

    await user.click(screen.getByRole("button", { name: "One more" }));
    await user.click(addButton());

    expect(add).toHaveBeenCalledWith("tree", expect.objectContaining({ quantity: 2 }));
    expect(total()).toHaveTextContent("£11.00");
  });

  it("takes Enter in the quantity box as done typing, not as Add to basket", async () => {
    const { user } = setupPlain({ stock: 3 });
    const box = screen.getByLabelText("Quantity");

    await user.clear(box);
    await user.type(box, "9");

    expect(fireEvent.keyDown(box, { key: "Enter" })).toBe(false);
    // Tidied to what there is, as leaving the box does.
    expect(box).toHaveValue(3);
    expect(box).toHaveFocus();
    // The steppers still press with Enter.
    expect(fireEvent.keyDown(screen.getByRole("button", { name: "One fewer" }), { key: "Enter" })).toBe(true);
  });

  it("has no summary of choices, since there were none", () => {
    setupPlain();

    expect(screen.queryByRole("region", { name: "Your choices" })).not.toBeInTheDocument();
  });

  it("asks no quantity of a one-of-a-kind piece, and puts in just the one", async () => {
    const { user, add } = setupPlain({ oneOfAKind: true });

    expect(screen.queryByLabelText("Quantity")).not.toBeInTheDocument();
    await user.click(addButton());
    expect(add).toHaveBeenCalledWith("tree", expect.objectContaining({ quantity: 1 }));
  });

  it("says when none are left, and sends nothing", async () => {
    const { user, add } = setupPlain({ stock: 0 });

    expect(status()).toHaveTextContent("Out of stock for now");
    await user.click(addButton());
    expect(add).not.toHaveBeenCalled();
  });
});

describe("quantity, as far as the stock goes", () => {
  const plainOffer: Offer = { ...everything, noun: { one: "piece", many: "pieces" }, packs: [], message: null, personalisation: null };
  const quantity = () => screen.getByLabelText("Quantity");
  const more = () => screen.getByRole("button", { name: "One more" });
  const fewer = () => screen.getByRole("button", { name: "One fewer" });
  const allWeHave = () => screen.queryByText("That's all we have");

  function setupStock(offer: Offer, stock: number | null, add?: jest.Mock) {
    const user = userEvent.setup();
    render(
      <CustomiserProvider offer={offer} productId="tree" add={add} stock={stock}>
        <CustomiserPanels />
        <CustomiserBar />
      </CustomiserProvider>,
    );
    return { user };
  }

  it("goes no higher than there are, and says so, as the basket does", async () => {
    const { user } = setupStock(plainOffer, 3);
    expect(allWeHave()).not.toBeInTheDocument();

    await user.click(more());
    await user.click(more());

    expect(quantity()).toHaveValue(3);
    expect(more()).toBeDisabled();
    expect(allWeHave()).toBeInTheDocument();
  });

  it("goes no lower than one", async () => {
    const { user } = setupStock(plainOffer, 3);
    expect(fewer()).toBeDisabled();

    await user.click(more());
    expect(fewer()).toBeEnabled();
  });

  it("brings a quantity typed past what there is down to it, and sends no more than that", async () => {
    const add = jest.fn().mockResolvedValue({ ok: false, message: "No." });
    const { user } = setupStock(plainOffer, 3, add);

    await user.clear(quantity());
    await user.type(quantity(), "10");
    expect(total()).toHaveTextContent("£16.50");
    await user.click(addButton());

    expect(add).toHaveBeenCalledWith("tree", expect.objectContaining({ quantity: 3 }));
    await user.click(quantity());
    await user.tab();
    expect(quantity()).toHaveValue(3);
  });

  it("goes on to the box's own limit for a piece made to order, which never runs out", async () => {
    const { user } = setupStock(plainOffer, null);

    await user.click(more());
    await user.click(more());

    expect(more()).toBeEnabled();
    expect(allWeHave()).not.toBeInTheDocument();
  });

  it("counts every card in a pack: three packs of three, from ten cards, is too many", async () => {
    const { user } = setupStock(everything, 10);
    await user.click(screen.getByRole("radio", { name: /^pack of 3/i }));

    await user.click(more());
    await user.click(more());

    expect(quantity()).toHaveValue(3);
    expect(more()).toBeDisabled();
  });

  it("goes by the colour in the size chosen, and comes down to a smaller stock when another is chosen", async () => {
    const { user } = setupStock(dress, null);
    await user.click(tile("Gypsum"));
    await user.click(tile("M"));

    await user.click(more());
    await user.click(more());
    expect(quantity()).toHaveValue(3);
    expect(more()).toBeDisabled();

    await user.click(tile("S"));

    expect(quantity()).toHaveValue(1);
    expect(allWeHave()).toBeInTheDocument();
  });
});
