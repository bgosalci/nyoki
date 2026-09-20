import { topNavCurrent } from "@/lib/storefront/nav";

describe("topNavCurrent", () => {
  it("marks Shop while browsing departments", () => {
    expect(topNavCurrent("/shop")).toBe("shop");
    expect(topNavCurrent("/shop/cards")).toBe("shop");
    expect(topNavCurrent("/shop/christmas-cards")).toBe("shop");
  });

  it("marks Shop on a product too, since looking at one is shopping", () => {
    expect(topNavCurrent("/product/handmade-snowflake-card")).toBe("shop");
  });

  it("marks About us on the about page", () => {
    expect(topNavCurrent("/about")).toBe("about");
  });

  it("marks nothing on the home page, which is neither", () => {
    expect(topNavCurrent("/")).toBeNull();
  });

  it("does not mark Shop on an unrelated path that merely starts the same", () => {
    expect(topNavCurrent("/shopping-guide")).toBeNull();
  });
});
