import { render, screen } from "@testing-library/react";

import { PromiseStrip } from "@/components/shop/promise-strip";

describe("PromiseStrip", () => {
  it("says the three things that are true of everything in the shop", () => {
    render(<PromiseStrip />);

    const promises = screen.getAllByRole("listitem").map((item) => item.textContent);
    expect(promises).toEqual([
      "Every piece touched by human hands",
      "Eco-friendly, organic and recyclable",
      "Materials sourced in the UK",
    ]);
  });
});
