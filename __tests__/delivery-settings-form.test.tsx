import { render, screen } from "@testing-library/react";

import { DeliverySettingsForm } from "@/components/admin/delivery-settings-form";
import { DELIVERY_DEFAULTS } from "@/lib/delivery/parcel";

const noop = async () => ({ errors: {}, saved: false });

describe("DeliverySettingsForm", () => {
  it("shows the envelope or box for each size, a letter's thickness only for a letter", () => {
    render(<DeliverySettingsForm action={noop} settings={DELIVERY_DEFAULTS} unweighed={41} />);

    expect(screen.getByLabelText("Large Letter packing, in grams")).toHaveValue("40");
    expect(screen.getByLabelText("Large Letter packing, in millimetres")).toHaveValue("2");
    expect(screen.getByLabelText("Small Parcel packing, in grams")).toHaveValue("110");
    expect(screen.queryByLabelText("Small Parcel packing, in millimetres")).not.toBeInTheDocument();
  });

  it("says how many pieces are not weighed, what they count as, and where to weigh them", () => {
    render(<DeliverySettingsForm action={noop} settings={DELIVERY_DEFAULTS} unweighed={41} />);

    expect(screen.getByText(/41 pieces on the shop/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/counts as, in grams/i)).toHaveValue("500");
    expect(screen.getByLabelText(/sent as/i)).toHaveValue("SMALL_PARCEL");
    expect(screen.getByRole("link", { name: /weigh pieces/i })).toHaveAttribute("href", "/admin/products/weigh");
  });

  it("says when every piece is weighed", () => {
    render(<DeliverySettingsForm action={noop} settings={DELIVERY_DEFAULTS} unweighed={0} />);

    expect(screen.getByText(/every piece on the shop has a weight/i)).toBeInTheDocument();
  });

  it("shows what is wrong beside each box", () => {
    render(
      <DeliverySettingsForm
        action={noop}
        settings={DELIVERY_DEFAULTS}
        unweighed={3}
        initialState={{ errors: { "LARGE_LETTER.mm": "Whole millimetres, like 2." }, saved: false }}
      />,
    );

    expect(screen.getByLabelText("Large Letter packing, in millimetres")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Whole millimetres, like 2.")).toBeInTheDocument();
  });
});
