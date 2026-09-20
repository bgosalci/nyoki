import { render, screen, within } from "@testing-library/react";

import { OrderTable, type OrderRow } from "@/components/admin/order-table";
import { ui } from "@/lib/brand/ui";

const rows: OrderRow[] = [
  {
    id: "o1",
    orderNumber: "NYK-1042",
    placedAt: new Date("2026-09-18T10:00:00Z"),
    email: "someone@example.com",
    status: "PAID",
    itemCount: 3,
    totalPence: 2450,
  },
  {
    id: "o2",
    orderNumber: "NYK-1041",
    placedAt: new Date("2026-09-17T10:00:00Z"),
    email: "another@example.com",
    status: "FULFILLED",
    itemCount: 1,
    totalPence: 600,
  },
];

describe("OrderTable", () => {
  it("lists an order by its number, date, customer and total", () => {
    render(<OrderTable rows={rows} />);

    const row = screen.getByText("NYK-1042").closest("tr")!;
    expect(within(row).getByText("18 Sep 2026")).toBeInTheDocument();
    expect(within(row).getByText("someone@example.com")).toBeInTheDocument();
    expect(within(row).getByText("£24.50")).toBeInTheDocument();
  });

  it("counts what is in the order, since that is what has to be packed", () => {
    render(<OrderTable rows={rows} />);

    const row = screen.getByText("NYK-1042").closest("tr")!;
    expect(within(row).getByText("3")).toBeInTheDocument();
  });

  it("says what is left to do rather than what the payment did", () => {
    render(<OrderTable rows={rows} />);

    expect(screen.getByText("To send")).toBeInTheDocument();
    expect(screen.getByText("Sent")).toBeInTheDocument();
  });

  it("makes the order that is waiting on someone the one that stands out", () => {
    render(<OrderTable rows={rows} />);

    expect(screen.getByText("To send")).toHaveClass(...ui.badgeSale.split(" "));
    expect(screen.getByText("Sent")).not.toHaveClass("bg-nyoki-sage");
  });
});
