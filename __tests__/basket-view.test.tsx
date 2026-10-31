import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { BasketView } from "@/components/shop/basket-view";
import type { PricedLine } from "@/lib/basket/review";

// jsdom does not implement the dialog element's modal methods.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); this.dispatchEvent(new Event("close")); };
});

const stored = { variantId: null, packId: null, message: null, messageText: "", personalise: false, personalisation: {} };

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
  unitPence: 650,
  wasUnitPence: null,
  saleName: null,
  totalPence: 650,
  vatRate: 20,
  details: [],
  madeToOrder: false,
  leadTimeDays: null,
  postage: { grams: 30, size: "LETTER", mm: 3 },
  units: 1,
};

const removed = { productId: "snowflake", name: "Silver Snowflake Card", quantity: 1, stored };

function setup() {
  const actions = {
    changeQuantity: jest.fn().mockResolvedValue(undefined),
    removeLine: jest.fn().mockResolvedValue(removed),
    putBack: jest.fn().mockResolvedValue({ ok: true }),
  };
  const full = { lines: [card], changes: [], pieces: 1, subtotalPence: 650, rates: [], saved: 0, ...actions };
  const empty = { ...full, lines: [], pieces: 0, subtotalPence: 0 };
  return { user: userEvent.setup(), actions, full, empty, ...render(<BasketView {...full} />) };
}

describe("the basket page", () => {
  it("offers to put back the last piece taken out, once the basket is empty", async () => {
    const { user, actions, empty, rerender } = setup();

    await user.click(within(screen.getByRole("listitem", { name: "Silver Snowflake Card" })).getByRole("button", { name: "Remove" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Remove" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Removed Silver Snowflake Card.");

    // The removal refreshes the page, which comes back empty.
    rerender(<BasketView {...empty} />);

    expect(screen.getByText("Your basket is empty")).toBeInTheDocument();
    const notice = screen.getByRole("status");
    expect(notice).toHaveTextContent("Removed Silver Snowflake Card.");
    await user.click(within(notice).getByRole("button", { name: "Put it back" }));
    expect(actions.putBack).toHaveBeenCalledWith(removed);
  });

  it("shows the summary and Checkout while there is something in it", () => {
    setup();

    expect(screen.getByRole("complementary", { name: "Order summary" })).toHaveTextContent("Subtotal · 1 piece");
    expect(screen.getAllByRole("link", { name: "Checkout" })[0]).toHaveAttribute("href", "/checkout");
  });

  it("points an empty basket to the shop and to the pieces saved", () => {
    const { empty, rerender } = setup();

    rerender(<BasketView {...empty} saved={2} />);

    expect(screen.queryByRole("complementary", { name: "Order summary" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Have a look around" })).toHaveAttribute("href", "/shop");
    expect(screen.getByRole("link", { name: "Your 2 saved pieces" })).toHaveAttribute("href", "/account/favourites");
  });
});
