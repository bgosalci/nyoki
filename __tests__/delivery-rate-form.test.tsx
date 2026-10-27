import { fireEvent, render, screen, within } from "@testing-library/react";

import { DeliveryRateForm } from "@/components/admin/delivery-rate-form";

const noop = async () => ({ errors: {} });

const tracked48 = {
  name: "Royal Mail Tracked 48",
  pricePence: 395,
  byWeight: false,
  bands: [],
  freeOverPence: 4000,
  minDays: 2,
  maxDays: 3,
  active: false,
};

const priceList = () => screen.getByRole("group", { name: /price list/i, hidden: true });

describe("DeliveryRateForm", () => {
  it("asks for the name, how it is priced, when it is free and how long it takes", () => {
    render(<DeliveryRateForm action={noop} />);

    expect(screen.getByLabelText(/^name/i)).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /by size and weight/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /one price/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/free on orders over/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/shortest/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/longest/i)).toBeInTheDocument();
  });

  it("starts a new option on a price list by size and weight, offered at checkout", () => {
    render(<DeliveryRateForm action={noop} />);

    expect(screen.getByRole("radio", { name: /by size and weight/i })).toBeChecked();
    expect(priceList()).toBeVisible();
    expect(screen.getByLabelText(/^price \(£\)/i).closest("[hidden]")).not.toBeNull();
    expect(screen.getByLabelText(/offered at checkout/i)).toBeChecked();
  });

  it("prefills an option at one price, with pence shown as pounds, its price list hidden but kept", () => {
    render(<DeliveryRateForm action={noop} rate={tracked48} />);

    expect(screen.getByLabelText(/^name/i)).toHaveValue("Royal Mail Tracked 48");
    expect(screen.getByRole("radio", { name: /one price/i })).toBeChecked();
    expect(screen.getByLabelText(/^price \(£\)/i)).toHaveValue("3.95");
    expect(screen.getByLabelText(/^price \(£\)/i).closest("[hidden]")).toBeNull();
    expect(priceList().closest("[hidden]")).not.toBeNull();
    expect(screen.getByLabelText(/free on orders over/i)).toHaveValue("40.00");
    expect(screen.getByLabelText(/shortest/i)).toHaveValue("2");
    expect(screen.getByLabelText(/offered at checkout/i)).not.toBeChecked();
  });

  it("prefills a price list, a row for each band", () => {
    render(
      <DeliveryRateForm
        action={noop}
        rate={{ ...tracked48, byWeight: true, bands: [{ size: "LARGE_LETTER", upToGrams: 1000, pricePence: 290 }] }}
      />,
    );

    expect(screen.getByLabelText("Size, row 1")).toHaveValue("LARGE_LETTER");
    expect(screen.getByLabelText("Up to, in grams, row 1")).toHaveValue("1000");
    expect(screen.getByLabelText("Price in pounds, row 1")).toHaveValue("2.90");
  });

  it("fills in Royal Mail's prices for the service chosen", () => {
    render(<DeliveryRateForm action={noop} />);

    fireEvent.change(screen.getByLabelText(/royal mail service/i), { target: { value: "2nd-class" } });
    fireEvent.click(screen.getByRole("button", { name: /fill in royal mail.s prices/i }));

    const rows = within(priceList()).getAllByLabelText(/^size, row/i);
    expect(rows).toHaveLength(9);
    expect(screen.getByLabelText("Size, row 1")).toHaveValue("LETTER");
    expect(screen.getByLabelText("Price in pounds, row 1")).toHaveValue("0.91");
    expect(screen.getByLabelText("Up to, in grams, row 9")).toHaveValue("20000");
  });

  it("fills in the name and days as well when they are empty, and leaves them when they are not", () => {
    const { unmount } = render(<DeliveryRateForm action={noop} />);
    fireEvent.change(screen.getByLabelText(/royal mail service/i), { target: { value: "tracked-24" } });
    fireEvent.click(screen.getByRole("button", { name: /fill in royal mail.s prices/i }));
    expect(screen.getByLabelText(/^name/i)).toHaveValue("Royal Mail Tracked 24");
    expect(screen.getByLabelText(/shortest/i)).toHaveValue("1");
    expect(screen.getByLabelText(/longest/i)).toHaveValue("2");
    unmount();

    render(<DeliveryRateForm action={noop} rate={{ ...tracked48, name: "Tracked, signed for" }} />);
    fireEvent.click(screen.getByRole("radio", { name: /by size and weight/i }));
    fireEvent.change(screen.getByLabelText(/royal mail service/i), { target: { value: "tracked-24" } });
    fireEvent.click(screen.getByRole("button", { name: /fill in royal mail.s prices/i }));
    expect(screen.getByLabelText(/^name/i)).toHaveValue("Tracked, signed for");
    expect(screen.getByLabelText(/shortest/i)).toHaveValue("2");
  });

  it("adds a row and takes one away", () => {
    render(<DeliveryRateForm action={noop} />);

    fireEvent.click(screen.getByRole("button", { name: /add a row/i }));
    fireEvent.click(screen.getByRole("button", { name: /add a row/i }));
    expect(within(priceList()).getAllByLabelText(/^size, row/i)).toHaveLength(3);

    fireEvent.click(screen.getByRole("button", { name: "Remove row 2" }));
    expect(within(priceList()).getAllByLabelText(/^size, row/i)).toHaveLength(2);
  });

  it("shows what is wrong beside each box, and with the price list", () => {
    render(
      <DeliveryRateForm
        action={noop}
        rate={tracked48}
        initialState={{ errors: { price: "Write the price as pounds and pence, like 3.95.", bands: "Row 2: choose a size." } }}
      />,
    );

    expect(screen.getByLabelText(/^price \(£\)/i)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Write the price as pounds and pence, like 3.95.")).toBeInTheDocument();
    expect(screen.getByText("Row 2: choose a size.")).toBeInTheDocument();
  });
});
