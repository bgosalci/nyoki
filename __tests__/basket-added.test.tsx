import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { BasketAddedProvider, BasketIcon, useBasketAdded, type AddedNotice } from "@/components/shop/basket-added";

jest.mock("next/navigation", () => ({ usePathname: () => "/product/snowman-card" }));

const tracked48 = { id: "t48", name: "Royal Mail Tracked 48", pricePence: 395, freeOverPence: 4000, minDays: 2, maxDays: 3 };

const notice: AddedNotice = {
  added: { name: "Snowman Card", image: "/uploads/snowman.jpg", quantity: 2, unitPence: 750, details: [] },
  basket: { pieces: 2, subtotalPence: 1500, freeDelivery: { reached: false, morePence: 2500, rate: tracked48 } },
  note: null,
};

function Adder({ value }: { value: AddedNotice }) {
  const basket = useBasketAdded();
  return (
    <button type="button" onClick={() => basket?.show(value)}>
      Pretend to add
    </button>
  );
}

function setup(value: AddedNotice = notice) {
  const user = userEvent.setup();
  render(
    <BasketAddedProvider>
      <p>Elsewhere on the page</p>
      <BasketIcon pieces={2} />
      <Adder value={value} />
    </BasketAddedProvider>,
  );
  return { user };
}

const panel = () => screen.getByRole("region", { name: "Added to your basket" });

describe("the panel that says a piece went in", () => {
  it("is not there until something goes in", () => {
    setup();

    expect(screen.queryByRole("region", { name: "Added to your basket" })).not.toBeInTheDocument();
  });

  it("says what went in and what it cost, with the way to the basket and to checkout", async () => {
    const { user } = setup();

    await user.click(screen.getByRole("button", { name: "Pretend to add" }));

    expect(panel()).toHaveTextContent("Snowman Card");
    expect(panel()).toHaveTextContent("2 × £7.50");
    expect(within(panel()).getByRole("link", { name: "View basket" })).toHaveAttribute("href", "/basket");
    expect(within(panel()).getByRole("link", { name: "Checkout" })).toHaveAttribute("href", "/checkout");
  });

  it("says how far the basket is from free delivery", async () => {
    const { user } = setup();

    await user.click(screen.getByRole("button", { name: "Pretend to add" }));

    expect(panel()).toHaveTextContent("£25.00 more for free delivery");
  });

  it("says when the basket has reached free delivery", async () => {
    const { user } = setup({ ...notice, basket: { ...notice.basket, freeDelivery: { reached: true, rate: tracked48 } } });

    await user.click(screen.getByRole("button", { name: "Pretend to add" }));

    expect(panel()).toHaveTextContent("Your basket gets free Royal Mail Tracked 48 delivery.");
  });

  it("passes on a note about how many went in", async () => {
    const { user } = setup({ ...notice, note: "There were only enough for 2, so we've added 2." });

    await user.click(screen.getByRole("button", { name: "Pretend to add" }));

    expect(panel()).toHaveTextContent("There were only enough for 2, so we've added 2.");
  });

  it("closes with its own button, with Escape, and with a click anywhere else", async () => {
    const { user } = setup();
    const open = () => user.click(screen.getByRole("button", { name: "Pretend to add" }));
    const closed = () => expect(screen.queryByRole("region", { name: "Added to your basket" })).not.toBeInTheDocument();

    await open();
    await user.click(within(panel()).getByRole("button", { name: "Close" }));
    closed();

    await open();
    await user.keyboard("{Escape}");
    closed();

    await open();
    await user.click(screen.getByText("Elsewhere on the page"));
    closed();
  });
});
