import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { OrderDetail, type OrderView } from "@/components/admin/order-detail";
import { printedWords } from "@/lib/checkout/order";

const order: OrderView = {
  orderNumber: "NYK-1042",
  status: "PENDING",
  placedAt: new Date("2026-10-26T21:14:00Z"),
  email: "ella.morgan@example.com",
  phone: null,
  guest: true,
  gift: true,
  giftNote: "Happy Christmas, Mum! Love, Ella x",
  hidePrices: true,
  shippingMethod: "Royal Mail Tracked 48",
  parcel: { size: "LARGE_LETTER", grams: 182, mm: 20 },
  address: { name: "Margaret Morgan", line1: "12 Orchard Lane", line2: null, city: "Ilkley", county: "West Yorkshire", postcode: "LS29 9AA" },
  items: [
    {
      id: "i1",
      name: "Silver Snowflake Card",
      variantName: null,
      sku: "SNOW-1",
      imageUrl: null,
      quantity: 1,
      unitPence: 2190,
      totalPence: 2190,
      details: [
        { label: "Single or pack", value: "Pack of 3" },
        { label: "Inside the card", value: "Printed: “Merry Christmas from all of us”" },
        { label: "Names", value: "Rebecca & Oscar" },
      ],
    },
    { id: "i2", name: "Merino Hat", variantName: "Seascape / 2-3 years", sku: null, imageUrl: null, quantity: 2, unitPence: 4500, totalPence: 9000, details: [] },
  ],
  subtotalPence: 11190,
  discountPence: 749,
  codeName: "WINTER10",
  shippingPence: 0,
  totalPence: 10441,
  taxPence: 449,
};

describe("printedWords", () => {
  it("is the words to print, from a line's message row", () => {
    expect(printedWords("Printed: “Merry Christmas”")).toBe("Merry Christmas");
    expect(printedWords("Blank inside")).toBeNull();
  });
});

describe("OrderDetail, the parcel", () => {
  it("says what the parcel was priced as, so the postage bought is the postage charged for", () => {
    render(<OrderDetail order={order} />);

    expect(screen.getByText("Large Letter, 182 g packed, 20 mm thick")).toBeInTheDocument();
  });

  it("leaves a parcel's thickness out, and says nothing of an order made before parcels were kept", () => {
    const { unmount } = render(<OrderDetail order={{ ...order, parcel: { size: "SMALL_PARCEL", grams: 352, mm: null } }} />);
    expect(screen.getByText("Small Parcel, 352 g packed")).toBeInTheDocument();
    unmount();

    render(<OrderDetail order={{ ...order, parcel: null }} />);
    expect(screen.queryByText(/packed/)).not.toBeInTheDocument();
  });
});

describe("OrderDetail", () => {
  it("says what the order is, and that it is not paid yet", () => {
    render(<OrderDetail order={order} />);

    expect(screen.getByRole("heading", { name: "NYK-1042" })).toBeInTheDocument();
    expect(screen.getByText("Not paid")).toBeInTheDocument();
    expect(screen.getByText("Gift")).toBeInTheDocument();
  });

  it("leads with what to make: the words to print in full, to copy rather than retype", async () => {
    const user = userEvent.setup();
    render(<OrderDetail order={order} />);

    const make = screen.getByRole("region", { name: "To make and send" });
    expect(within(make).getByText("Merry Christmas from all of us")).toBeInTheDocument();
    expect(make).toHaveTextContent("Names: Rebecca & Oscar");
    expect(make).toHaveTextContent("Single or pack: Pack of 3");
    expect(make).toHaveTextContent("Seascape / 2-3 years");
    expect(make).toHaveTextContent("2 × £45.00");

    await user.click(within(make).getByRole("button", { name: "Copy the printed message" }));
    expect(await navigator.clipboard.readText()).toBe("Merry Christmas from all of us");
  });

  it("says where it goes, and how to send a gift", () => {
    render(<OrderDetail order={order} />);

    const send = screen.getByRole("region", { name: "Send to" });
    expect(send).toHaveTextContent("Margaret Morgan");
    expect(send).toHaveTextContent("LS29 9AA");
    expect(send).toHaveTextContent("Royal Mail Tracked 48");
    expect(send).toHaveTextContent("Leave the prices off the delivery note");
    expect(send).toHaveTextContent("Happy Christmas, Mum! Love, Ella x");
    expect(within(send).getByRole("button", { name: "Copy the note" })).toBeInTheDocument();
  });

  it("says who ordered it, and what it came to", () => {
    render(<OrderDetail order={order} />);

    expect(screen.getByRole("region", { name: "Ordered by" })).toHaveTextContent("ella.morgan@example.com");
    expect(screen.getByRole("region", { name: "Ordered by" })).toHaveTextContent("Guest");
    const make = screen.getByRole("region", { name: "To make and send" });
    expect(make).toHaveTextContent("WINTER10");
    expect(make).toHaveTextContent("−£7.49");
    expect(make).toHaveTextContent("£104.41");
    expect(make).toHaveTextContent("£4.49");
  });

  it("says nothing about a gift on an order that is not one", () => {
    render(<OrderDetail order={{ ...order, gift: false, giftNote: null, hidePrices: false }} />);

    expect(screen.queryByText("Gift")).not.toBeInTheDocument();
    expect(screen.queryByText(/leave the prices off/i)).not.toBeInTheDocument();
  });
});
