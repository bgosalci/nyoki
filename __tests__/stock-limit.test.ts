import { neverRunsOut } from "@/lib/products/stock-limit";

describe("neverRunsOut", () => {
  it("holds an ordinary piece to its stock", () => {
    expect(neverRunsOut({ madeToOrder: false, madeOnOrder: false })).toBe(false);
  });

  it("lets a piece made to order go in any number: it is not held in stock", () => {
    expect(neverRunsOut({ madeToOrder: true, madeOnOrder: false })).toBe(true);
  });

  it("lets a piece made on order go in any number: more is made when it runs out", () => {
    expect(neverRunsOut({ madeToOrder: false, madeOnOrder: true })).toBe(true);
  });
});
