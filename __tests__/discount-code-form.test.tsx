import { render, screen } from "@testing-library/react";

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
