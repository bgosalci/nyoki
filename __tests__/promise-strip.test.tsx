import { render, screen } from "@testing-library/react";

import { PromiseStrip } from "@/components/shop/promise-strip";

describe("PromiseStrip", () => {
  it("says whatever the shop has been told to say", () => {
    render(<PromiseStrip promises={["Touched by human hands", "Made in the UK"]} />);

    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "Touched by human hands",
      "Made in the UK",
    ]);
  });

  it("takes itself off the page when there is nothing to promise", () => {
    // Emptying all three boxes in the CMS is how the strip is removed; a
    // green band with nothing in it would be worse than no band.
    const { container } = render(<PromiseStrip promises={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
