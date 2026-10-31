import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { BasketLines } from "@/components/shop/basket-lines";
import type { PricedLine } from "@/lib/basket/review";

// jsdom does not implement the dialog element's modal methods.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); this.dispatchEvent(new Event("close")); };
});

const stored = { variantId: null, packId: "p3", message: "Printed message" as const, messageText: "Merry Christmas", personalise: false, personalisation: {} };

const card: PricedLine = {
  id: "l1",
  productId: "snowflake",
  slug: "silver-snowflake",
  name: "Silver Snowflake Card",
  image: null,
  sku: null,
  variantId: null,
  variantName: null,
  stored,
  quantity: 1,
  maxQuantity: 3,
  unitPence: 2190,
  wasUnitPence: null,
  saleName: null,
  totalPence: 2190,
  vatRate: 20,
  details: [
    { label: "Single or pack", value: "Pack of 3" },
    { label: "Inside the card", value: "Printed: “Merry Christmas”" },
  ],
  madeToOrder: false,
  leadTimeDays: null,
  postage: { grams: 62, size: "LARGE_LETTER", mm: 8 },
  units: 3,
};

const reindeer: PricedLine = {
  ...card,
  id: "l2",
  productId: "reindeer",
  slug: "red-christmas-reindeer",
  name: "Red Christmas Reindeer Card",
  stored: { ...stored, packId: null, message: null, messageText: "" },
  quantity: 2,
  maxQuantity: 2,
  unitPence: 400,
  wasUnitPence: 500,
  saleName: "Winter sale",
  totalPence: 800,
  details: [],
};

function setup(lines: PricedLine[] = [card, reindeer]) {
  const user = userEvent.setup();
  const actions = {
    changeQuantity: jest.fn().mockResolvedValue(undefined),
    removeLine: jest.fn().mockResolvedValue({ productId: "snowflake", name: "Silver Snowflake Card", quantity: 1, stored }),
    putBack: jest.fn().mockResolvedValue({ ok: true }),
  };
  render(<BasketLines lines={lines} {...actions} />);
  return { user, ...actions };
}

const lineFor = (name: string) => screen.getByRole("listitem", { name });

async function removeConfirmed(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(within(lineFor(name)).getByRole("button", { name: "Remove" }));
  await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Remove" }));
}

describe("the basket's lines", () => {
  it("names each piece's choices in words, with what one costs and what the line comes to", () => {
    setup();

    const line = lineFor("Silver Snowflake Card");
    expect(within(line).getByRole("link", { name: "Silver Snowflake Card" })).toHaveAttribute("href", "/product/silver-snowflake");
    expect(line).toHaveTextContent("Single or pack: Pack of 3");
    expect(line).toHaveTextContent("Inside the card: Printed: “Merry Christmas”");
    expect(line).toHaveTextContent("£21.90 each");
  });

  it("shows a sale's price beside what it was, and the sale's name", () => {
    setup();

    const line = lineFor("Red Christmas Reindeer Card");
    expect(within(line).getByText("£5.00").tagName).toBe("S");
    expect(line).toHaveTextContent("Winter sale");
    expect(line).toHaveTextContent("£8.00");
  });

  it("changes a line's quantity, no further than the stock allows", async () => {
    const { user, changeQuantity } = setup();

    await user.click(within(lineFor("Silver Snowflake Card")).getByRole("button", { name: "One more" }));
    expect(changeQuantity).toHaveBeenCalledWith("l1", 2);

    const reindeerLine = lineFor("Red Christmas Reindeer Card");
    expect(within(reindeerLine).getByRole("button", { name: "One more" })).toBeDisabled();
    expect(reindeerLine).toHaveTextContent("That's all we have");
  });

  it("asks before taking a line out", async () => {
    const { user, removeLine } = setup();

    await user.click(within(lineFor("Silver Snowflake Card")).getByRole("button", { name: "Remove" }));

    const dialog = screen.getByRole("dialog", { name: "Remove Silver Snowflake Card?" });
    expect(dialog).toHaveAccessibleDescription("It comes out of your basket.");
    expect(removeLine).not.toHaveBeenCalled();
  });

  it("keeps the line when the shopper changes their mind", async () => {
    const { user, removeLine } = setup();

    await user.click(within(lineFor("Silver Snowflake Card")).getByRole("button", { name: "Remove" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Keep it" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(removeLine).not.toHaveBeenCalled();
    expect(lineFor("Silver Snowflake Card")).toBeInTheDocument();
  });

  it("takes a line out once confirmed, and offers to put it back", async () => {
    const { user, removeLine, putBack } = setup();

    await removeConfirmed(user, "Silver Snowflake Card");
    expect(removeLine).toHaveBeenCalledWith("l1");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    const notice = await screen.findByRole("status");
    expect(notice).toHaveTextContent("Removed Silver Snowflake Card.");
    await user.click(within(notice).getByRole("button", { name: "Put it back" }));
    expect(putBack).toHaveBeenCalledWith({ productId: "snowflake", name: "Silver Snowflake Card", quantity: 1, stored });
  });

  it("says so when a removed line cannot go back", async () => {
    const { user, putBack } = setup();
    putBack.mockResolvedValue({ ok: false, message: "Sorry, this is out of stock." });

    await removeConfirmed(user, "Silver Snowflake Card");
    await user.click(within(await screen.findByRole("status")).getByRole("button", { name: "Put it back" }));

    expect(await screen.findByText("Sorry, this is out of stock.")).toBeInTheDocument();
  });

  it("marks a piece made to order, and how long it takes", () => {
    setup([{ ...card, madeToOrder: true, leadTimeDays: 14 }]);

    expect(lineFor("Silver Snowflake Card")).toHaveTextContent("Made to order · 14 days");
  });
});
