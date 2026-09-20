import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { BulkPriceDialog } from "@/components/admin/bulk-price-dialog";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});

const rows = [
  { id: "p1", name: "Snowflake Card", pricePence: 815 },
  { id: "p2", name: "Stocking Card", pricePence: 500 },
  { id: "p3", name: "Bud Vase", pricePence: 1800 },
];

function setup(overrides: Partial<React.ComponentProps<typeof BulkPriceDialog>> = {}) {
  const onApply = jest.fn(async () => {});
  const onCancel = jest.fn();
  render(<BulkPriceDialog open rows={rows} onApply={onApply} onCancel={onCancel} {...overrides} />);
  return { onApply, onCancel, user: userEvent.setup() };
}

describe("BulkPriceDialog", () => {
  it("stays closed until asked", () => {
    setup({ open: false });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("says how many products it is about to reprice", () => {
    setup();

    expect(screen.getByRole("dialog")).toHaveTextContent(/3 products/i);
  });

  it("shows what each price becomes, as the figure is typed", async () => {
    const { user } = setup();

    await user.type(screen.getByLabelText(/by how much/i), "10");

    // 815 + 10% = 896.5, rounded up to a whole penny.
    expect(screen.getByText("£8.97")).toBeInTheDocument();
    expect(screen.getByText("£5.50")).toBeInTheDocument();
    expect(screen.getByText("£19.80")).toBeInTheDocument();
  });

  it("keeps the old price beside the new one, so the change is visible", async () => {
    const { user } = setup();

    await user.type(screen.getByLabelText(/by how much/i), "10");

    expect(screen.getByText("£8.15")).toBeInTheDocument();
  });

  it("previews a handful and counts the rest rather than listing hundreds", async () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ id: `p${i}`, name: `Card ${i}`, pricePence: 500 }));
    const { user } = setup({ rows: many });

    await user.type(screen.getByLabelText(/by how much/i), "10");

    expect(screen.getByText(/3 more/i)).toBeInTheDocument();
  });

  it("takes a reduction off instead of adding it on", async () => {
    const { user } = setup();

    await user.selectOptions(screen.getByLabelText(/^change$/i), "DECREASE");
    await user.type(screen.getByLabelText(/by how much/i), "10");

    expect(screen.getByText("£7.34")).toBeInTheDocument();
  });

  it("changes every price to the same figure when setting one outright", async () => {
    const { user } = setup();

    await user.selectOptions(screen.getByLabelText(/^change$/i), "SET");
    await user.type(screen.getByLabelText(/new price/i), "12.50");

    expect(screen.getAllByText("£12.50")).toHaveLength(3);
  });

  it("drops the percentage choice when setting a price, which can only be an amount", async () => {
    const { user } = setup();

    expect(screen.getByLabelText(/measured in/i)).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText(/^change$/i), "SET");

    expect(screen.queryByLabelText(/measured in/i)).not.toBeInTheDocument();
  });

  it("tidies the new price when asked to round", async () => {
    const { user } = setup();

    await user.type(screen.getByLabelText(/by how much/i), "10");
    await user.selectOptions(screen.getByLabelText(/round/i), "FIFTY_PENCE");

    expect(screen.getByText("£9.00")).toBeInTheDocument();
  });

  it("says what is wrong instead of repricing on a figure it cannot read", async () => {
    const { user, onApply } = setup();

    await user.type(screen.getByLabelText(/by how much/i), "lots");
    await user.click(screen.getByRole("button", { name: /change 3 prices/i }));

    expect(screen.getByText(/write the percentage/i)).toBeInTheDocument();
    expect(onApply).not.toHaveBeenCalled();
  });

  it("will not reprice on nothing at all", async () => {
    const { user, onApply } = setup();

    await user.click(screen.getByRole("button", { name: /change 3 prices/i }));

    expect(onApply).not.toHaveBeenCalled();
  });

  it("hands the change over as typed, for the server to check again", async () => {
    const { user, onApply } = setup();

    await user.type(screen.getByLabelText(/by how much/i), "10");
    await user.click(screen.getByRole("button", { name: /change 3 prices/i }));

    expect(onApply).toHaveBeenCalledWith({ mode: "INCREASE", unit: "PERCENT", value: "10", rounding: "EXACT" });
  });

  it("cancels without repricing", async () => {
    const { user, onApply, onCancel } = setup();

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onApply).not.toHaveBeenCalled();
  });

  it("warns that a was-price the new price catches up with is cleared", () => {
    setup();

    expect(screen.getByRole("dialog")).toHaveTextContent(/was-price/i);
  });
});
