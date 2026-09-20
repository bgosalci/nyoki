import { ui } from "@/lib/brand/ui";
import {
  ORDER_STATUSES,
  formatOrderDate,
  isAwaitingFulfilment,
  orderStatusBadge,
  orderStatusLabel,
} from "@/lib/orders/status";

describe("order statuses", () => {
  it("covers every status the database can hold", () => {
    expect([...ORDER_STATUSES]).toEqual(["PENDING", "PAID", "FULFILLED", "CANCELLED", "REFUNDED"]);
  });

  it("names each one in the words a shopkeeper uses, not the database's", () => {
    expect(orderStatusLabel("PENDING")).toBe("Not paid");
    expect(orderStatusLabel("PAID")).toBe("To send");
    expect(orderStatusLabel("FULFILLED")).toBe("Sent");
    expect(orderStatusLabel("CANCELLED")).toBe("Cancelled");
    expect(orderStatusLabel("REFUNDED")).toBe("Refunded");
  });

  it("treats a paid order, and only a paid order, as waiting on someone", () => {
    const waiting = ORDER_STATUSES.filter(isAwaitingFulfilment);

    expect(waiting).toEqual(["PAID"]);
  });

  it("marks the one that needs attention in the brand colour, and the rest quietly", () => {
    expect(orderStatusBadge("PAID")).toBe(ui.badgeSale);

    for (const status of ORDER_STATUSES.filter((s) => s !== "PAID")) {
      expect(orderStatusBadge(status)).toBe(ui.badgeQuiet);
    }
  });
});

describe("formatOrderDate", () => {
  it("writes a date the way it is written in Britain", () => {
    expect(formatOrderDate(new Date("2026-09-20T09:15:00Z"))).toBe("20 Sep 2026");
  });

  it("reads the clock in London, wherever the server happens to be", () => {
    // Half past eleven at night in UTC is already the next day in British
    // Summer Time, and the shop keeps London hours.
    expect(formatOrderDate(new Date("2026-09-20T23:30:00Z"))).toBe("21 Sep 2026");
  });
});
