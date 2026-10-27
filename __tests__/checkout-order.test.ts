import { basketMatchesOrder, detailsOf, orderItems } from "@/lib/checkout/order";
import type { PricedLine } from "@/lib/basket/review";

const line: PricedLine = {
  id: "l1",
  productId: "hat",
  slug: "merino-hat",
  name: "Hand-Knitted Merino Wool Unisex Hat",
  image: "/uploads/hat.jpg",
  sku: "HAT-SEA-2",
  variantId: "v-sea-2",
  variantName: "Seascape / 2-3 years",
  stored: { variantId: "v-sea-2", packId: null, message: null, messageText: "", personalise: false, personalisation: {} },
  quantity: 2,
  maxQuantity: 3,
  unitPence: 4500,
  wasUnitPence: null,
  saleName: null,
  totalPence: 9000,
  vatRate: 0,
  details: [
    { label: "Colour", value: "Seascape" },
    { label: "Size", value: "2-3 years" },
  ],
  madeToOrder: true,
  leadTimeDays: 14,
  postage: { grams: 100, size: "SMALL_PARCEL", mm: null },
  units: 2,
};

describe("orderItems", () => {
  it("copies everything an order line must keep, so later edits to the piece cannot change it", () => {
    expect(orderItems([line])).toEqual([
      {
        productId: "hat",
        variantId: "v-sea-2",
        productName: "Hand-Knitted Merino Wool Unisex Hat",
        variantName: "Seascape / 2-3 years",
        sku: "HAT-SEA-2",
        imageUrl: "/uploads/hat.jpg",
        unitPricePence: 4500,
        quantity: 2,
        totalPence: 9000,
        details: [
          { label: "Colour", value: "Seascape" },
          { label: "Size", value: "2-3 years" },
        ],
        vatRate: 0,
      },
    ]);
  });
});

describe("basketMatchesOrder", () => {
  const items = orderItems([line]);

  it("is true while the basket is what the order was made from", () => {
    expect(basketMatchesOrder([line], items)).toBe(true);
  });

  it("is false once anything differs: a quantity, a price, a choice, or another line", () => {
    expect(basketMatchesOrder([{ ...line, quantity: 1, totalPence: 4500 }], items)).toBe(false);
    expect(basketMatchesOrder([{ ...line, unitPence: 4000, totalPence: 8000 }], items)).toBe(false);
    expect(basketMatchesOrder([{ ...line, details: [{ label: "Colour", value: "Polar" }] }], items)).toBe(false);
    expect(basketMatchesOrder([line, { ...line, id: "l2", productId: "card" }], items)).toBe(false);
    expect(basketMatchesOrder([], items)).toBe(false);
  });

  it("does not mind the order the lines come in", () => {
    const other = { ...line, id: "l2", productId: "card", variantId: null };
    expect(basketMatchesOrder([other, line], orderItems([line, other]))).toBe(true);
  });
});

describe("detailsOf", () => {
  it("reads an order line's choices back as they were saved", () => {
    expect(detailsOf([{ label: "Size", value: "2-3 years" }])).toEqual([{ label: "Size", value: "2-3 years" }]);
  });

  it("drops anything that is not a label and a value, rather than show it", () => {
    expect(detailsOf([{ label: "Size" }, "odd", null, { label: "Colour", value: "Polar" }])).toEqual([{ label: "Colour", value: "Polar" }]);
    expect(detailsOf(null)).toEqual([]);
    expect(detailsOf({ label: "x", value: "y" })).toEqual([]);
  });
});
