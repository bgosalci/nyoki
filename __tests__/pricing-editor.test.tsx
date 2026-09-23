import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PricingEditor } from "@/components/admin/pricing-editor";

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

const figure = (name: RegExp) => within(screen.getByRole("group", { name: /what it makes/i })).getByText(name).nextSibling;

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

  it("shows what the same piece makes on Not On The High Street", () => {
    setup();

    expect(screen.getByRole("group", { name: /not on the high street/i })).toHaveTextContent("£2.72");
  });

  it("keeps her 2023 price beside the costs it came with, for reference", () => {
    setup({ origin: { source: "Cards / Christening / row 6", pricePence: 1299 } });

    expect(screen.getByText(/cards \/ christening \/ row 6/i)).toBeInTheDocument();
  });
});

describe("PricingEditor, for a piece not yet costed", () => {
  const suggestion = {
    id: "e1",
    source: "Cards / Christmas / row 30",
    note: null,
    photoUrl: "/uploads/price-lists/cards-030.jpg",
    pricePence: 790,
    vatRate: 20,
    lines: [
      { label: "Card & envelope", unitPence: 22, quantityHundredths: 100 },
      { label: "Making cost", unitPence: 100, quantityHundredths: 100 },
    ],
  };

  it("offers the price-list rows most likely to be it", () => {
    setup({ lines: [], suggestions: [suggestion] });

    expect(screen.getByRole("heading", { name: /from your price lists/i })).toBeInTheDocument();
    expect(screen.getByText("Cards / Christmas / row 30")).toBeInTheDocument();
  });

  it("fills the costs in from one, to be checked before it is saved", async () => {
    const { user, action } = setup({ lines: [], suggestions: [suggestion] });

    await user.click(screen.getByRole("button", { name: /use these costs/i }));

    expect(screen.getByText("Total cost").nextSibling).toHaveTextContent("£1.22");
    expect(action).not.toHaveBeenCalled();
    // And the save will record where the costs came from.
    expect(document.querySelector('input[name="fromEntry"]')).toHaveValue("e1");
  });

  it("offers nothing once a piece has costs of its own", () => {
    setup({ suggestions: [suggestion] });

    expect(screen.queryByRole("heading", { name: /from your price lists/i })).not.toBeInTheDocument();
  });
});
