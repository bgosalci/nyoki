import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PricingTable } from "@/components/admin/pricing-table";
import type { PricingRow } from "@/lib/costing/list";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});

const rows: PricingRow[] = [
  { id: "p1", name: "Christening Card", image: null, pricePence: 1299, costed: true, costPence: 420, profitPence: 662, costMultiple: 2.58 },
  { id: "p2", name: "Bud Vase", image: null, pricePence: 1800, costed: false, costPence: 0, profitPence: null, costMultiple: null },
  { id: "p3", name: "Hairclip 3-pack", image: null, pricePence: 1300, costed: true, costPence: 1317, profitPence: -234, costMultiple: 0.82 },
];

function setup() {
  const reprice = jest.fn(async () => {});
  render(<PricingTable rows={rows} header={<h1>Pricing</h1>} reprice={reprice} />);
  return { reprice, user: userEvent.setup() };
}

const rowFor = (name: string) => screen.getByRole("link", { name }).closest("tr")!;

describe("PricingTable", () => {
  it("shows what each piece costs, sells for, and leaves", () => {
    setup();

    const row = rowFor("Christening Card");
    expect(row).toHaveTextContent("£4.20");
    expect(row).toHaveTextContent("£12.99");
    expect(row).toHaveTextContent("£6.62");
    expect(row).toHaveTextContent("×2.58");
  });

  it("sends each piece to its own pricing page", () => {
    setup();

    expect(screen.getByRole("link", { name: "Christening Card" })).toHaveAttribute("href", "/admin/pricing/p1");
  });

  it("says a piece is not costed rather than showing its price as profit", () => {
    setup();

    const row = rowFor("Bud Vase");
    expect(row).toHaveTextContent(/not costed/i);
    expect(row).not.toHaveTextContent("£15.00");
  });

  it("shows a loss in red", () => {
    setup();

    expect(within(rowFor("Hairclip 3-pack")).getByText("-£2.34")).toHaveClass("text-red-600");
  });

  it("changes the price of what is chosen, from here and only here", async () => {
    const { user, reprice } = setup();

    await user.click(screen.getByRole("checkbox", { name: /christening card/i }));
    await user.click(screen.getByRole("button", { name: /change price/i }));
    await user.type(screen.getByLabelText(/by how much/i), "10");
    await user.click(screen.getByRole("button", { name: /change 1 price/i }));

    expect(reprice).toHaveBeenCalledWith(["p1"], { mode: "INCREASE", unit: "PERCENT", value: "10", rounding: "EXACT" });
  });

  it("pins the bulk bar with the header, as the products list does", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("checkbox", { name: /bud vase/i }));

    const pinned = screen.getByRole("heading", { name: "Pricing" }).closest(".sticky");
    expect(pinned).toContainElement(screen.getByRole("button", { name: /change price/i }));
  });
});
