import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CustomiserBar, CustomiserPanels, CustomiserProvider } from "@/components/shop/customiser";
import type { Offer } from "@/lib/customisation/offer";

const name = { id: "f1", label: "Name", kind: "TEXT" as const, maxLength: 12, choices: [] };
const sign = { id: "f2", label: "Zodiac sign", kind: "CHOICE" as const, maxLength: null, choices: ["♈ Aries", "♌ Leo"] };

/** A card offering everything, personalisation optional. */
const everything: Offer = {
  noun: { one: "card", many: "cards" },
  single: { pricePence: 550, wasPence: null },
  packs: [{ id: "p3", cards: 3, pricePence: 1500, wasPence: null }],
  message: { pricePence: 80, maxLength: 200 },
  personalisation: { pricePence: 150, required: false, fields: [name, sign] },
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

      expect(screen.getByRole("radio", { name: "Single One card £5.50" })).not.toBeChecked();
      expect(screen.getByRole("radio", { name: "Pack of 3 3 cards £15.00 Save £1.50" })).not.toBeChecked();
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

      expect(screen.getByRole("radio", { name: /add a printed message we print it for you \+80p a card/i })).toBeInTheDocument();
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
  });

  describe("required personalisation", () => {
    const required = { ...everything, personalisation: { ...everything.personalisation!, required: true } };

    it("has no switch: it asks for each thing straight away, and is marked required", () => {
      setup(required);

      expect(screen.queryByRole("switch")).not.toBeInTheDocument();
      expect(screen.getByLabelText("Name")).toBeInTheDocument();
      expect(within(panel(/personalisation/i)).getByText("Required")).toBeInTheDocument();
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

    it("counts what is still needed", () => {
      setup();

      expect(status()).toHaveTextContent("2 answers still needed before you can add this to your basket");
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

    it("says ordering opens soon once everything is chosen, and again when pressed", async () => {
      const { user } = setup();
      await chooseEverything(user);

      expect(status()).toHaveTextContent("All done. Online ordering opens soon.");

      await user.click(addButton());
      expect(status()).toHaveTextContent("Online ordering opens soon. Until then, get in touch to order this one.");
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

    expect(screen.getByRole("radio", { name: "Single One bookmark £5.50" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /^pack of 3 3 bookmarks/i })).toBeInTheDocument();
  });
});
