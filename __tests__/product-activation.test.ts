import { activationBlockedBecause } from "@/lib/products/activation";

describe("activationBlockedBecause", () => {
  it("lets a priced piece onto the shop", () => {
    expect(activationBlockedBecause({ pricePence: 850 })).toBeNull();
  });

  it("keeps an unpriced piece off it, and says where to go", () => {
    // Prices are set on the Price tab, so a new product starts at
    // nothing. Made active like that, it would be on the shop for free.
    expect(activationBlockedBecause({ pricePence: 0 })).toMatch(/price tab/i);
  });
});
