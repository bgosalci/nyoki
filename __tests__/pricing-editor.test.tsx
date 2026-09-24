import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Link from "next/link";

import { PricingEditor } from "@/components/admin/pricing-editor";
import { SaveSlot, SaveSlotProvider } from "@/components/admin/save-slot";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});

// Christening card: her sheet has it at £12.99 costing £4.20.
const product = {
  id: "p1",
  name: "Christening Card",
  image: null,
  pricePence: 1299,
  compareAtPence: null,
  vatRate: 20,
};

const lines = [
  { label: "Card & envelope", unitPence: 80, quantityHundredths: 100 },
  { label: "Bag", unitPence: 9, quantityHundredths: 100 },
  { label: "Ink", unitPence: 25, quantityHundredths: 100 },
  { label: "Post & packaging", unitPence: 106, quantityHundredths: 100 },
  { label: "Making cost", unitPence: 200, quantityHundredths: 100 },
];

function setup(overrides: Partial<React.ComponentProps<typeof PricingEditor>> = {}) {
  const action = jest.fn(async () => ({ errors: {} }));
  render(
    <PricingEditor product={product} lines={lines} origin={null} suggestions={[]} action={action} {...overrides} />,
  );
  return { action, user: userEvent.setup() };
}

/** A figure is a term and its value: find the term, return the value beside it. */
const figure = (name: RegExp) => {
  const terms = [...screen.getByRole("group", { name: /what it makes/i }).querySelectorAll("dt")];
  const term = terms.find((dt) => name.test(dt.textContent ?? ""));
  if (!term) throw new Error(`No figure called ${name}`);
  return term.nextElementSibling;
};

describe("PricingEditor", () => {
  it("adds up what goes into the piece", () => {
    setup();

    expect(screen.getByText("Total cost").nextSibling).toHaveTextContent("£4.20");
  });

  it("shows what the price leaves once VAT and costs are out", () => {
    setup();

    expect(figure(/^VAT$/)).toHaveTextContent("£2.17");
    expect(figure(/after vat/i)).toHaveTextContent("£10.82");
    expect(figure(/^profit/i)).toHaveTextContent("£6.62");
  });

  it("works the figures out again as the price is typed", async () => {
    const { user } = setup();

    const price = screen.getByLabelText(/^price/i);
    await user.clear(price);
    await user.type(price, "9.00");

    // £9.00 at 20%: £1.50 VAT, £7.50 kept, £3.30 after £4.20 of cost.
    expect(figure(/^profit/i)).toHaveTextContent("£3.30");
  });

  it("takes no VAT out of a zero-rated piece", async () => {
    const { user } = setup();

    await user.selectOptions(screen.getByLabelText(/vat/i), "0");

    expect(figure(/^VAT$/)).toHaveTextContent("£0.00");
  });

  it("adds a line, and the cost follows", async () => {
    const { user } = setup();

    await user.click(screen.getByRole("button", { name: /add a line/i }));
    const labels = screen.getAllByLabelText(/^what$/i);
    await user.type(labels[labels.length - 1], "Ribbon");
    const units = screen.getAllByLabelText(/^cost each$/i);
    await user.type(units[units.length - 1], "0.30");

    expect(screen.getByText("Total cost").nextSibling).toHaveTextContent("£4.50");
  });

  it("removes a line, and the cost follows", async () => {
    const { user } = setup();

    await user.click(screen.getByRole("button", { name: /remove making cost/i }));

    expect(screen.getByText("Total cost").nextSibling).toHaveTextContent("£2.20");
  });

  it("shows a loss as a loss, not as a smaller number", async () => {
    const { user } = setup();

    const price = screen.getByLabelText(/^price/i);
    await user.clear(price);
    await user.type(price, "4.00");

    expect(figure(/^profit/i)).toHaveTextContent("-£0.87");
    expect(figure(/^profit/i)).toHaveClass("text-red-600");
  });

  it("works out every step of a sale, down to half price", () => {
    setup();

    const ladder = screen.getByRole("table", { name: /on sale/i });
    // Her sheet: £10.39 at 20% off, leaving £4.46.
    const twenty = within(ladder).getByText("20% off").closest("tr")!;
    expect(twenty).toHaveTextContent("£10.39");
    expect(twenty).toHaveTextContent("£4.46");
    expect(within(ladder).getByText("50% off")).toBeInTheDocument();
  });

  it("shows the margin the price leaves, as a share of what is kept", () => {
    setup();

    // £6.62 profit on £10.82 kept.
    expect(figure(/^margin/i)).toHaveTextContent("61.2%");
  });

  it("opens showing the margin the price gives now", () => {
    setup();

    expect(screen.getByLabelText(/^margin/i)).toHaveValue("61.2");
  });

  it("works the margin out as the price is typed", async () => {
    const { user } = setup();

    const price = screen.getByLabelText(/^price/i);
    await user.clear(price);
    await user.type(price, "9.00");

    // £9.00: £7.50 kept, £3.30 profit - 44%.
    expect(screen.getByLabelText(/^margin/i)).toHaveValue("44.0");
  });

  it("keeps the margin in step as the costs change, while the price is what was typed", async () => {
    const { user } = setup();

    await user.click(screen.getByRole("button", { name: /remove making cost/i }));

    // £2.20 of cost now: £8.62 profit on £10.82 kept.
    expect(screen.getByLabelText(/^margin/i)).toHaveValue("79.7");
    expect(screen.getByLabelText(/^price/i)).toHaveValue("12.99");
  });

  it("works the price out from a margin, rounded up to a tidy ending", async () => {
    const { user } = setup();

    const margin = screen.getByLabelText(/^margin/i);
    await user.clear(margin);
    await user.type(margin, "50");

    // £4.20 of cost at 50% needs £10.08; the next tidy price is £10.50.
    expect(screen.getByLabelText(/^price/i)).toHaveValue("10.50");
  });

  it("rounds to 99p when asked to", async () => {
    const { user } = setup();

    await user.selectOptions(screen.getByLabelText(/round up to/i), "99");
    const margin = screen.getByLabelText(/^margin/i);
    await user.clear(margin);
    await user.type(margin, "50");

    expect(screen.getByLabelText(/^price/i)).toHaveValue("10.99");
  });

  it("keeps the price in step as the costs change, while the margin is what was typed", async () => {
    const { user } = setup();

    const margin = screen.getByLabelText(/^margin/i);
    await user.clear(margin);
    await user.type(margin, "50");
    await user.click(screen.getByRole("button", { name: /remove making cost/i }));

    // £2.20 of cost at 50% needs £5.28; the next tidy price is £5.50.
    expect(screen.getByLabelText(/^price/i)).toHaveValue("5.50");
    expect(margin).toHaveValue("50");
  });

  it("leaves the margin as typed rather than snapping it to what the tidy price gives", async () => {
    // 50% asked for; £10.50 actually gives 52%. The box keeps the 50 that was
    // typed - rewriting it under the cursor would fight the typing - and the
    // figures below show the 52.
    const { user } = setup();

    const margin = screen.getByLabelText(/^margin/i);
    await user.clear(margin);
    await user.type(margin, "50");

    expect(margin).toHaveValue("50");
    expect(figure(/^margin/i)).toHaveTextContent("52.0%");
  });

  it("cannot work from a margin before the piece is costed", () => {
    setup({ lines: [] });

    expect(screen.getByLabelText(/^margin/i)).toBeDisabled();
    expect(screen.getByText(/add its costs first/i)).toBeInTheDocument();
  });

  it("says no price reaches a margin of 100% or more", async () => {
    const { user } = setup();

    // Pasted, not typed: key by key it would pass through 1% and 10%, which
    // are reachable and rightly move the price on the way.
    const margin = screen.getByLabelText(/^margin/i);
    await user.clear(margin);
    await user.paste("100");

    expect(screen.getByText(/no price reaches/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^price/i)).toHaveValue("12.99");
  });

  it("shows what Not On The High Street leaves at each step of a sale too", () => {
    setup();

    const ladder = screen.getByRole("table", { name: /on sale/i });
    // £10.39 there: their 30% is £3.12, VAT £1.73, cost £4.20.
    expect(within(ladder).getByText("20% off").closest("tr")).toHaveTextContent("£1.34");
    expect(within(ladder).getByRole("columnheader", { name: /not on the high street/i })).toBeInTheDocument();
  });

  it("shows what the same piece makes on Not On The High Street", () => {
    setup();

    expect(screen.getByRole("group", { name: /not on the high street/i })).toHaveTextContent("£2.72");
  });

  it("keeps her 2023 price beside the costs it came with, for reference", () => {
    setup({ origin: { source: "Cards / Christening / row 6", pricePence: 1299 } });

    expect(screen.getByText(/cards \/ christening \/ row 6/i)).toBeInTheDocument();
  });
});

describe("PricingEditor, starting from a category's usual costs", () => {
  const cards = {
    categoryId: "cards",
    categoryName: "Cards",
    lines: [
      { label: "Card & envelope", unitPence: 22, quantityHundredths: 100 },
      { label: "Post & packaging", unitPence: 106, quantityHundredths: 100 },
    ],
  };

  const whatLines = () => screen.getAllByLabelText<HTMLInputElement>("What").map((input) => input.value);

  it("fills a piece not yet costed from its category's usual costs, to be checked before it is saved", async () => {
    const { user, action } = setup({ lines: [], templates: [cards] });

    await user.click(screen.getByRole("button", { name: /start from the usual costs for cards/i }));

    expect(whatLines()).toEqual(["Card & envelope", "Post & packaging"]);
    expect(screen.getByText("Total cost").nextSibling).toHaveTextContent("£1.28");
    expect(screen.getByText(/filled in from the usual costs for/i)).toHaveTextContent(/cards.*not saved yet/i);
    expect(action).not.toHaveBeenCalled();
  });

  it("offers each category's, for a piece in two", () => {
    const clothes = { categoryId: "clothes", categoryName: "Clothes", lines: [{ label: "Yarn", unitPence: 450, quantityHundredths: 100 }] };
    setup({ lines: [], templates: [cards, clothes] });

    expect(screen.getByRole("button", { name: /usual costs for cards/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /usual costs for clothes/i })).toBeInTheDocument();
  });

  it("lets go of a price-list row chosen before, since the costs no longer come from it", async () => {
    const row = {
      id: "e1",
      source: "Cards / Christmas / row 30",
      note: null,
      photoUrl: null,
      photoFilename: null,
      pricePence: 790,
      vatRate: 20,
      lines: [{ label: "Glitter", unitPence: 40, quantityHundredths: 100 }],
    };
    const { user } = setup({ lines: [], templates: [cards], suggestions: [row] });
    await user.click(within(screen.getByRole("group", { name: /from your price lists/i })).getByRole("button", { name: "Choose" }));
    await user.click(screen.getByRole("button", { name: /christmas \/ row 30/i }));
    expect(document.querySelector('input[name="fromEntry"]')).toHaveValue("e1");

    await user.click(screen.getByRole("button", { name: /start from the usual costs for cards/i }));

    expect(document.querySelector('input[name="fromEntry"]')).toHaveValue("");
    expect(whatLines()).toEqual(["Card & envelope", "Post & packaging"]);
  });

  it("offers nothing once a piece has costs of its own", () => {
    setup({ templates: [cards] });

    expect(screen.queryByRole("button", { name: /usual costs/i })).not.toBeInTheDocument();
  });
});

describe("PricingEditor, leaving with changes not saved", () => {
  function withLink(overrides: Partial<React.ComponentProps<typeof PricingEditor>> = {}) {
    const follow = jest.fn();
    const action = jest.fn(async () => ({ errors: {}, saved: true }));
    render(
      <>
        <PricingEditor product={product} lines={lines} origin={null} suggestions={[]} action={action} {...overrides} />
        <Link
 href="/admin/products/p2" onClick={(event) => { event.preventDefault(); follow(); }}>Details</Link>
      </>,
    );
    return { follow, action, user: userEvent.setup() };
  }

  it("asks before a link takes away a price not yet saved", async () => {
    const { user, follow } = withLink();

    await user.clear(screen.getByLabelText("Price"));
    await user.type(screen.getByLabelText("Price"), "13.50");
    await user.click(screen.getByRole("link", { name: "Details" }));

    expect(screen.getByRole("dialog", { name: /leave without saving/i })).toBeInTheDocument();
    expect(follow).not.toHaveBeenCalled();
  });

  it("asks when a cost line is taken away", async () => {
    const { user } = withLink();

    await user.click(screen.getAllByRole("button", { name: /remove/i })[0]);
    await user.click(screen.getByRole("link", { name: "Details" }));

    expect(screen.getByRole("dialog", { name: /leave without saving/i })).toBeInTheDocument();
  });

  it("does not ask over a rounding choice that changes nothing saved", async () => {
    const { user, follow } = withLink();

    await user.selectOptions(screen.getByLabelText(/round up to/i), "99");
    await user.click(screen.getByRole("link", { name: "Details" }));

    expect(follow).toHaveBeenCalled();
  });

  it("does not ask once the new price is saved", async () => {
    const { user, follow, action } = withLink();
    await user.clear(screen.getByLabelText("Price"));
    await user.type(screen.getByLabelText("Price"), "13.50");

    await user.click(screen.getByRole("button", { name: /^save$/i }));
    expect(action).toHaveBeenCalled();
    await screen.findByText(/saved\./i);
    await user.click(screen.getByRole("link", { name: "Details" }));

    expect(follow).toHaveBeenCalled();
  });
});

describe("PricingEditor, for a piece not yet costed", () => {
  const suggestion = (id: string, source: string, photoFilename: string | null, unitPence = 22) => ({
    id,
    source,
    note: null,
    photoUrl: `/uploads/price-lists/${id}.jpg`,
    photoFilename,
    pricePence: 790,
    vatRate: 20,
    lines: [
      { label: "Card & envelope", unitPence, quantityHundredths: 100 },
      { label: "Making cost", unitPence: 100, quantityHundredths: 100 },
    ],
  });

  const rows = [
    suggestion("e1", "Cards / Christmas / row 30", "christmas_dragonfly.jpg"),
    suggestion("e2", "Clothes / Autumn/Winter / row 42", "pink_mohair_booties.png", 1644),
    suggestion("e3", "Cards / Valentines / row 30", null),
  ];

  const field = () => screen.getByRole("group", { name: /from your price lists/i });

  const openChooser = async (user: ReturnType<typeof userEvent.setup>) =>
    user.click(within(field()).getByRole("button", { name: "Choose" }));

  it("offers every row of the price lists, rather than a few guesses", async () => {
    const { user } = setup({ lines: [], suggestions: rows });

    expect(field()).toBeInTheDocument();
    await openChooser(user);

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getAllByRole("button", { name: /row/i })).toHaveLength(3);
  });

  it("keeps the best guess first", async () => {
    const { user } = setup({ lines: [], suggestions: rows });
    await openChooser(user);

    const [first] = within(screen.getByRole("dialog")).getAllByRole("button", { name: /row/i });
    expect(first).toHaveTextContent("Cards / Christmas / row 30");
  });

  it("finds a row by the words in its photo's file name, which often say what it is", async () => {
    const { user } = setup({ lines: [], suggestions: rows });
    await openChooser(user);

    await user.type(screen.getByRole("searchbox"), "booties");

    const found = within(screen.getByRole("dialog")).getAllByRole("button", { name: /row/i });
    expect(found).toHaveLength(1);
    expect(found[0]).toHaveTextContent("Autumn/Winter");
  });

  it("shows the piece being matched, to compare the photographs against", async () => {
    const { user } = setup({ lines: [], suggestions: rows });
    await openChooser(user);

    expect(within(screen.getByRole("dialog")).getByText(/christening card/i)).toBeInTheDocument();
  });

  it("fills the costs in from the row chosen, to be checked before it is saved", async () => {
    const { user, action } = setup({ lines: [], suggestions: rows });
    await openChooser(user);

    await user.click(screen.getByRole("button", { name: /christmas \/ row 30/i }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("Total cost").nextSibling).toHaveTextContent("£1.22");
    expect(action).not.toHaveBeenCalled();
    // And the save will record where the costs came from.
    expect(document.querySelector('input[name="fromEntry"]')).toHaveValue("e1");
  });

  it("shows the row chosen in its field, the way the home page shows its main photo", async () => {
    const { user } = setup({ lines: [], suggestions: rows });
    expect(within(field()).getByText(/none chosen/i)).toBeInTheDocument();

    await openChooser(user);
    await user.click(screen.getByRole("button", { name: /christmas \/ row 30/i }));

    expect(within(field()).getByText("Cards / Christmas / row 30")).toBeInTheDocument();
    expect(within(field()).getByText(/not saved yet/i)).toBeInTheDocument();
  });

  it("takes the costs back out when the choice is cleared", async () => {
    const zeroRated = { ...rows[1], vatRate: 0 };
    const { user } = setup({ lines: [], suggestions: [zeroRated] });
    await openChooser(user);
    await user.click(screen.getByRole("button", { name: /autumn\/winter/i }));
    expect(screen.getByLabelText(/vat/i)).toHaveValue("0");

    await user.click(within(field()).getByRole("button", { name: /clear/i }));

    expect(screen.getByText("Total cost").nextSibling).toHaveTextContent("£0.00");
    expect(screen.getByLabelText(/vat/i)).toHaveValue("20");
    expect(document.querySelector('input[name="fromEntry"]')).toHaveValue("");
    expect(within(field()).getByText(/none chosen/i)).toBeInTheDocument();
  });

  it("offers nothing once a piece has costs of its own", () => {
    setup({ suggestions: rows });

    expect(screen.queryByRole("group", { name: /from your price lists/i })).not.toBeInTheDocument();
  });
});

describe("PricingEditor, when a save is rejected", () => {
  it("keeps the price and the cost lines typed - they are controlled, so React never loses them", async () => {
    const { user } = setup({ action: jest.fn(async () => ({ errors: { compareAtPrice: "The was-price has to be higher than the price, or there is nothing to strike through." } })) });

    await user.clear(screen.getByLabelText("Price"));
    await user.type(screen.getByLabelText("Price"), "13.50");
    await user.type(screen.getAllByLabelText("What")[0], " (large)");
    await user.click(screen.getByRole("button", { name: /^save$/i }));
    await screen.findByText(/nothing to strike through/i);

    expect(screen.getByLabelText("Price")).toHaveValue("13.50");
    expect(screen.getAllByLabelText("What")[0]).toHaveValue("Card & envelope (large)");
  });
});

describe("PricingEditor, saving from the top of the page", () => {
  it("puts Save beside the page's title too, and it saves the price", async () => {
    const action = jest.fn(async () => ({ errors: {}, saved: true }));
    render(
      <SaveSlotProvider>
        <SaveSlot />
        <PricingEditor product={product} lines={lines} origin={null} suggestions={[]} action={action} />
      </SaveSlotProvider>,
    );
    const user = userEvent.setup();

    const saves = screen.getAllByRole("button", { name: /^save$/i });
    expect(saves).toHaveLength(2);
    expect(document.querySelector("[data-save-slot]")).toContainElement(saves[0]);

    await user.clear(screen.getByLabelText("Price"));
    await user.type(screen.getByLabelText("Price"), "13.50");
    await user.click(saves[0]);

    expect(action).toHaveBeenCalledTimes(1);
    expect(((action.mock.calls[0] as unknown[])[1] as FormData).get("price")).toBe("13.50");
  });
});

