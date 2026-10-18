import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CustomiseForm, type CustomiseState } from "@/components/admin/customise-form";
import { customiseValues } from "@/lib/customisation/settings";

const card = { one: "card", many: "cards" };
const nothingSet = customiseValues(null, [], []);

const everythingSet = customiseValues(
  { message: true, messagePricePence: 80, messageMaxLength: 250, personalisation: true, personalisationPricePence: 150, personalisationRequired: true },
  [
    { label: "Name", kind: "TEXT", maxLength: 20, choices: [] },
    { label: "Zodiac sign", kind: "CHOICE", maxLength: null, choices: ["♈ Aries", "♉ Taurus"] },
  ],
  [{ cards: 3, pricePence: 1500 }],
);

function setup(values = nothingSet, action = jest.fn(async (): Promise<CustomiseState> => ({ errors: {}, saved: true }))) {
  const user = userEvent.setup();
  render(<CustomiseForm noun={card} singlePricePence={550} values={values} action={action} />);
  return { user, action };
}

const section = (name: string) => screen.getByRole("region", { name });

/** What the form posts, as the action receives it. */
async function submitted(user: ReturnType<typeof userEvent.setup>, action: jest.Mock) {
  await user.click(screen.getAllByRole("button", { name: "Save" }).at(-1)!);
  const data: FormData = action.mock.calls.at(-1)[1];
  return data;
}

describe("customiseValues", () => {
  it("starts a piece with nothing set, at the usual limits", () => {
    expect(nothingSet).toMatchObject({
      message: false,
      messagePrice: "",
      messageMaxLength: "300",
      personalisation: false,
      personalisationPrice: "",
      personalisationRequired: false,
      fields: [],
      packs: [],
    });
  });

  it("writes stored pence back as pounds and pence, exactly", () => {
    expect(everythingSet).toMatchObject({ messagePrice: "0.80", personalisationPrice: "1.50", messageMaxLength: "250" });
    expect(everythingSet.packs.map(({ cards, price }) => ({ cards, price }))).toEqual([{ cards: "3", price: "15.00" }]);
  });

  it("writes a choice list one per line", () => {
    expect(everythingSet.fields.map(({ label, kind, maxLength, choices }) => ({ label, kind, maxLength, choices }))).toEqual([
      { label: "Name", kind: "TEXT", maxLength: "20", choices: "" },
      { label: "Zodiac sign", kind: "CHOICE", maxLength: "", choices: "♈ Aries\n♉ Taurus" },
    ]);
  });
});

describe("CustomiseForm", () => {
  it("has a section for the message, personalisation and packs", () => {
    setup();

    expect(section("Message inside")).toBeInTheDocument();
    expect(section("Personalisation")).toBeInTheDocument();
    expect(section("Packs")).toBeInTheDocument();
  });

  describe("the printed message", () => {
    it("shows its settings only once it is offered", async () => {
      const { user } = setup();
      const offer = screen.getByRole("checkbox", { name: "Offer a printed message inside" });

      expect(offer).not.toBeChecked();
      expect(screen.getByLabelText("Extra cost for a message (£)")).not.toBeVisible();

      await user.click(offer);

      expect(screen.getByLabelText("Extra cost for a message (£)")).toBeVisible();
      expect(screen.getByLabelText("Longest message")).toHaveValue(300);
    });

    it("posts whether it is offered, its cost and the longest message", async () => {
      const { user, action } = setup(everythingSet);

      const data = await submitted(user, action);

      expect(data.get("message")).toBe("on");
      expect(data.get("messagePrice")).toBe("0.80");
      expect(data.get("messageMaxLength")).toBe("250");
    });
  });

  describe("personalisation", () => {
    it("shows its settings only once it is offered", async () => {
      const { user } = setup();

      expect(screen.getByLabelText("Extra cost for personalising (£)")).not.toBeVisible();
      await user.click(screen.getByRole("checkbox", { name: "Offer personalisation" }));

      expect(screen.getByLabelText("Extra cost for personalising (£)")).toBeVisible();
      expect(screen.getByRole("checkbox", { name: /only sold personalised/i })).not.toBeChecked();
    });

    it("adds a thing to personalise, typed by default, with a character limit", async () => {
      const { user } = setup();
      await user.click(screen.getByRole("checkbox", { name: "Offer personalisation" }));

      await user.click(screen.getByRole("button", { name: "Add a thing to personalise" }));

      expect(screen.getByRole("textbox", { name: "What is personalised (thing 1)" })).toHaveValue("");
      expect(screen.getByRole("combobox", { name: "Kind (thing 1)" })).toHaveValue("TEXT");
      expect(screen.getByRole("spinbutton", { name: "Most characters (thing 1)" })).toHaveValue(30);
    });

    it("asks for the choices instead when a thing is chosen from a list", async () => {
      const { user } = setup();
      await user.click(screen.getByRole("checkbox", { name: "Offer personalisation" }));
      await user.click(screen.getByRole("button", { name: "Add a thing to personalise" }));

      await user.selectOptions(screen.getByRole("combobox", { name: "Kind (thing 1)" }), "CHOICE");

      expect(screen.getByRole("textbox", { name: "Choices, one per line (thing 1)" })).toBeInTheDocument();
      expect(screen.queryByRole("spinbutton", { name: "Most characters (thing 1)" })).not.toBeInTheDocument();
    });

    it("posts every thing as one row of each list, whatever its kind", async () => {
      const { user, action } = setup(everythingSet);

      const data = await submitted(user, action);

      expect(data.get("personalisation")).toBe("on");
      expect(data.get("personalisationPrice")).toBe("1.50");
      expect(data.get("personalisationRequired")).toBe("on");
      expect(data.getAll("fieldLabel")).toEqual(["Name", "Zodiac sign"]);
      expect(data.getAll("fieldKind")).toEqual(["TEXT", "CHOICE"]);
      expect(data.getAll("fieldMaxLength")).toEqual(["20", ""]);
      expect(data.getAll("fieldChoices")).toEqual(["", "♈ Aries\n♉ Taurus"]);
    });

    it("takes a thing off", async () => {
      const { user, action } = setup(everythingSet);

      await user.click(screen.getByRole("button", { name: "Remove Name" }));
      const data = await submitted(user, action);

      expect(data.getAll("fieldLabel")).toEqual(["Zodiac sign"]);
    });

    it("keeps its settings while switched off, so switching it back on finds them", async () => {
      const { user } = setup(everythingSet);
      const offer = screen.getByRole("checkbox", { name: "Offer personalisation" });

      await user.click(offer);
      await user.click(offer);

      expect(screen.getByRole("textbox", { name: "What is personalised (thing 1)" })).toHaveValue("Name");
    });
  });

  describe("packs", () => {
    it("says what the single card sells at", () => {
      setup();

      expect(within(section("Packs")).getByText(/£5\.50/)).toBeInTheDocument();
    });

    it("adds a pack, and says what it saves against singles", async () => {
      const { user } = setup();

      await user.click(screen.getByRole("button", { name: "Add a pack" }));
      await user.type(screen.getByRole("spinbutton", { name: "Cards in pack 1" }), "3");
      await user.type(screen.getByRole("textbox", { name: "Price of pack 1 (£)" }), "15");

      expect(screen.getByText("Saves £1.50 against 3 single cards")).toBeInTheDocument();
    });

    it("says when a pack saves nothing", async () => {
      const { user } = setup();

      await user.click(screen.getByRole("button", { name: "Add a pack" }));
      await user.type(screen.getByRole("spinbutton", { name: "Cards in pack 1" }), "2");
      await user.type(screen.getByRole("textbox", { name: "Price of pack 1 (£)" }), "11");

      expect(screen.getByText("No saving against 2 single cards")).toBeInTheDocument();
    });

    it("posts each pack's size and price, and takes one off", async () => {
      const { user, action } = setup(everythingSet);

      let data = await submitted(user, action);
      expect(data.getAll("packCards")).toEqual(["3"]);
      expect(data.getAll("packPrice")).toEqual(["15.00"]);

      await user.click(screen.getByRole("button", { name: "Remove the pack of 3" }));
      data = await submitted(user, action);
      expect(data.getAll("packCards")).toEqual([]);
    });
  });

  it("shows what the save refused, beside each section", async () => {
    const action = jest.fn(async (): Promise<CustomiseState> => ({
      errors: {
        messagePrice: "Write the cost as pounds and pence, like 0.80.",
        fields: "Thing 2 repeats Name.",
        packs: "Pack 1 repeats a pack of 3.",
      },
    }));
    const { user } = setup(everythingSet, action);

    await user.click(screen.getAllByRole("button", { name: "Save" }).at(-1)!);

    expect(await screen.findByText("Write the cost as pounds and pence, like 0.80.")).toBeInTheDocument();
    expect(screen.getByText("Thing 2 repeats Name.")).toBeInTheDocument();
    expect(screen.getByText("Pack 1 repeats a pack of 3.")).toBeInTheDocument();
    expect(screen.getByLabelText("Extra cost for a message (£)")).toHaveAttribute("aria-invalid", "true");
  });

  it("shows a refusal that is not about one section at the top", async () => {
    const action = jest.fn(async (): Promise<CustomiseState> => ({ errors: { form: "Only cards and bookmarks can be customised." } }));
    const { user } = setup(everythingSet, action);

    await user.click(screen.getAllByRole("button", { name: "Save" }).at(-1)!);

    expect(await screen.findByRole("alert")).toHaveTextContent("Only cards and bookmarks can be customised.");
  });

  it("says when it has saved", async () => {
    const { user } = setup(everythingSet);

    await user.click(screen.getAllByRole("button", { name: "Save" }).at(-1)!);

    expect(await screen.findByRole("status")).toHaveTextContent(/saved/i);
  });
});
