import { orderingOpen } from "@/lib/ordering";

describe("orderingOpen", () => {
  it("is open while developing, so the whole basket and checkout can be tried", () => {
    expect(orderingOpen({ NODE_ENV: "development" })).toBe(true);
    expect(orderingOpen({ NODE_ENV: "test" })).toBe(true);
  });

  it("is closed on the live site until payment lands, with nothing set", () => {
    // A shopper would otherwise reach Ready to pay with no way to pay.
    expect(orderingOpen({ NODE_ENV: "production" })).toBe(false);
  });

  it("follows ORDERING when it is set, either way", () => {
    expect(orderingOpen({ NODE_ENV: "production", ORDERING: "open" })).toBe(true);
    expect(orderingOpen({ NODE_ENV: "development", ORDERING: "closed" })).toBe(false);
  });

  it("ignores a value it does not know, rather than guessing", () => {
    expect(orderingOpen({ NODE_ENV: "production", ORDERING: "yes" })).toBe(false);
    expect(orderingOpen({ NODE_ENV: "development", ORDERING: "" })).toBe(true);
  });
});
