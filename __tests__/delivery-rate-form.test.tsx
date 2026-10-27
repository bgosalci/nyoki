import { render, screen } from "@testing-library/react";

import { DeliveryRateForm } from "@/components/admin/delivery-rate-form";

const noop = async () => ({ errors: {} });

describe("DeliveryRateForm", () => {
  it("asks for the name, the price, when it is free and how long it takes", () => {
    render(<DeliveryRateForm action={noop} />);

    expect(screen.getByLabelText(/^name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^price/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/free on orders over/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/shortest/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/longest/i)).toBeInTheDocument();
  });

  it("is offered at checkout by default when adding one", () => {
    render(<DeliveryRateForm action={noop} />);

    expect(screen.getByLabelText(/offered at checkout/i)).toBeChecked();
  });

  it("prefills an option, with pence shown as pounds", () => {
    render(
      <DeliveryRateForm
        action={noop}
        rate={{ name: "Royal Mail Tracked 48", pricePence: 395, freeOverPence: 4000, minDays: 2, maxDays: 3, active: false }}
      />,
    );

    expect(screen.getByLabelText(/^name/i)).toHaveValue("Royal Mail Tracked 48");
    expect(screen.getByLabelText(/^price/i)).toHaveValue("3.95");
    expect(screen.getByLabelText(/free on orders over/i)).toHaveValue("40.00");
    expect(screen.getByLabelText(/shortest/i)).toHaveValue("2");
    expect(screen.getByLabelText(/offered at checkout/i)).not.toBeChecked();
  });

  it("shows what is wrong beside each box", () => {
    render(<DeliveryRateForm action={noop} initialState={{ errors: { price: "Write the price as pounds and pence, like 3.95." } }} />);

    expect(screen.getByLabelText(/^price/i)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Write the price as pounds and pence, like 3.95.")).toBeInTheDocument();
  });
});
