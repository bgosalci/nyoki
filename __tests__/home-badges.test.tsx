import { render, screen, within } from "@testing-library/react";

import { HomeBadges } from "@/components/shop/home-badges";

describe("HomeBadges", () => {
  it("shows all seven badges, each saying what it promises", () => {
    render(<HomeBadges />);

    const list = screen.getByRole("list", { name: /every piece/i });
    expect(within(list).getAllByRole("img")).toHaveLength(7);
    for (const promise of [
      "Small family business",
      "Sourced and made in the UK",
      "Eco-conscious",
      "Recycled and recyclable",
      "Solvent-free adhesives",
      "Biodegradable and compostable",
    ]) {
      expect(within(list).getByRole("img", { name: promise })).toBeInTheDocument();
    }
  });

  it("says since 2009, not how many years", () => {
    render(<HomeBadges />);

    expect(screen.getByRole("img", { name: "Moments to memories, since 2009" })).toBeInTheDocument();
  });

  it("draws Njomza's own artwork, kept with the brand files", () => {
    render(<HomeBadges />);

    for (const image of screen.getAllByRole("img")) {
      expect(image.getAttribute("src")).toMatch(/\/brand\/badges\/[a-z-]+\.png/);
    }
  });

  it("keeps since 2009 in the middle of the row, where the artwork puts it", () => {
    render(<HomeBadges />);

    const names = screen.getAllByRole("img").map((image) => image.getAttribute("alt"));
    expect(names[3]).toBe("Moments to memories, since 2009");
  });
});
