import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DiscountCodeForm } from "@/components/admin/discount-code-form";

const noop = async () => ({ errors: {} });

describe("DiscountCodeForm", () => {
  it("asks for the code, the discount and when it runs", () => {
    render(<DiscountCodeForm action={noop} />);

    expect(screen.getByLabelText(/^code/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/percent off/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/pounds off/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/starts/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/ends/i)).toBeInTheDocument();
  });

  it("offers the optional limits", () => {
    render(<DiscountCodeForm action={noop} />);

    expect(screen.getByLabelText(/minimum spend/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/how many times/i)).toBeInTheDocument();
  });

  it("is live by default when creating", () => {
    render(<DiscountCodeForm action={noop} />);

    expect(screen.getByLabelText(/^live/i)).toBeChecked();
  });

  it("prefills an existing code, with pence shown as pounds", () => {
    render(
      <DiscountCodeForm
        action={noop}
        code={{
          code: "SPRING20",
          type: "FIXED_AMOUNT",
          value: 500,
          minSpendPence: 2500,
          usageLimit: 50,
          startsAt: new Date("2026-06-01T09:00:00"),
          endsAt: null,
          active: true,
        }}
      />,
    );

    expect(screen.getByLabelText(/^code/i)).toHaveValue("SPRING20");
    expect(screen.getByLabelText(/^amount/i)).toHaveValue("5.00");
    expect(screen.getByLabelText(/minimum spend/i)).toHaveValue("25.00");
    expect(screen.getByLabelText(/how many times/i)).toHaveValue("50");
  });

  it("shows a field error where it belongs", () => {
    render(<DiscountCodeForm action={noop} initialState={{ errors: { code: "Another code already uses that." } }} />);

    expect(screen.getByLabelText(/^code/i)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Another code already uses that.")).toBeInTheDocument();
  });
});

describe("DiscountCodeForm, when a save is rejected", () => {
  it("keeps the code, the kind of discount and the amount", async () => {
    render(<DiscountCodeForm action={async () => ({ errors: { code: "Another code already uses that." } })} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/^code/i), "SPRING10");
    await user.click(screen.getByLabelText(/pounds off/i));
    await user.type(screen.getByLabelText(/^amount/i), "5.00");
    await user.click(screen.getByRole("button", { name: /save code/i }));
    await screen.findByText("Another code already uses that.");

    expect(screen.getByLabelText(/^code/i)).toHaveValue("SPRING10");
    expect(screen.getByLabelText(/pounds off/i)).toBeChecked();
    expect(screen.getByLabelText(/^amount/i)).toHaveValue("5.00");
  });
});
