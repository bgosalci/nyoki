import { ui } from "@/lib/brand/ui";
import {
  ORDER_STATUSES,
  customerOrderStatusLabel,
  formatDateTime,
  formatOrderDate,
  isAwaitingFulfilment,
  orderStatusBadge,
  orderStatusLabel,
  seenByShopper,
  shopperOrders,
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

describe("what a shopper is told", () => {
  it("describes the order from their side, not the shop's", () => {
    // "To send" is the shop's job list. A customer wants to know what is
    // happening to their order.
    expect(customerOrderStatusLabel("PENDING")).toBe("Not paid");
    expect(customerOrderStatusLabel("PAID")).toBe("Being made");
    expect(customerOrderStatusLabel("FULFILLED")).toBe("On its way");
    expect(customerOrderStatusLabel("CANCELLED")).toBe("Cancelled");
    expect(customerOrderStatusLabel("REFUNDED")).toBe("Refunded");
  });

  it("has something to say about every status the database can hold", () => {
    for (const status of ORDER_STATUSES) {
      expect(customerOrderStatusLabel(status)).toEqual(expect.any(String));
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

describe("formatDateTime", () => {
  it("gives the day and the time on a 24-hour clock, in London", () => {
    // British Summer Time until the last Sunday of October.
    expect(formatDateTime(new Date("2026-10-20T10:05:00Z"))).toBe("20 Oct 2026, 11:05");
    expect(formatDateTime(new Date("2026-12-01T09:30:00Z"))).toBe("1 Dec 2026, 09:30");
  });

  it("puts a time late at night on London's day, not the server's", () => {
    expect(formatDateTime(new Date("2026-06-30T23:30:00Z"))).toBe("1 Jul 2026, 00:30");
  });
});

describe("seenByShopper", () => {
  it("leaves out an order never paid for, which a shopper did not finish", () => {
    expect(seenByShopper("PENDING")).toBe(false);
    for (const status of ["PAID", "FULFILLED", "CANCELLED", "REFUNDED"] as const) expect(seenByShopper(status)).toBe(true);
  });
});

describe("shopperOrders", () => {
  // A guest order joins whichever Customer row holds its email, and nothing
  // proves an email belongs to whoever registers it. Listing those would show
  // anyone who claimed an address the orders its owner placed as a guest.
  it("lists only orders placed signed in to the account, and never an unpaid one", () => {
    expect(shopperOrders("c1")).toEqual({
      customerId: "c1",
      signedIn: true,
      status: { in: ORDER_STATUSES.filter((status) => status !== "PENDING") },
    });
  });
});
