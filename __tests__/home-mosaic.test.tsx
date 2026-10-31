import { render, screen } from "@testing-library/react";

import { HomeMosaic } from "@/components/shop/home-mosaic";
import type { ShownTile } from "@/lib/home/tiles";

const tile = (label: string, overrides: Partial<ShownTile> = {}): ShownTile => ({
  label,
  href: `/shop/${label.toLowerCase().replace(/\s+/g, "-")}`,
  image: { url: `/${label}.jpg` },
  words: "nyoki-white",
  ...overrides,
});

const tiles = [
  "For Christmas",
  "For love",
  "For birthdays",
  "For Dad",
  "For anniversaries",
  "For little ones",
  "For book lovers",
  "For little dreamers",
  "For word lovers",
  "Just because",
].map((label) => tile(label));

describe("HomeMosaic", () => {
  it("makes every tile a link to where it leads, named by its words", () => {
    render(<HomeMosaic tiles={tiles} />);

    expect(screen.getByRole("link", { name: "For Christmas" })).toHaveAttribute("href", "/shop/for-christmas");
    expect(screen.getAllByRole("link")).toHaveLength(10);
  });

  it("makes the first tile of each five the large one", () => {
    render(<HomeMosaic tiles={tiles} />);

    expect(screen.getByRole("link", { name: "For Christmas" }).className).toMatch(/\bcol-span-2\b/);
    expect(screen.getByRole("link", { name: "For little ones" }).className).toMatch(/\bcol-span-2\b/);
    expect(screen.getByRole("link", { name: "For love" }).className).not.toMatch(/\bcol-span-2\b/);
  });

  it("puts the large tile on the left of the first block and on the right of the second", () => {
    render(<HomeMosaic tiles={tiles} />);

    const order = screen.getAllByRole("link").map((link) => link.textContent);
    // Laid out row by row, a large tile on the right comes after the two
    // small ones beside it - and on a phone, two small, the large, two small.
    expect(order.slice(0, 5)).toEqual(["For Christmas", "For love", "For birthdays", "For Dad", "For anniversaries"]);
    expect(order.slice(5)).toEqual(["For book lovers", "For little dreamers", "For little ones", "For word lovers", "Just because"]);
  });

  it("shows each tile's photo behind its words", () => {
    render(<HomeMosaic tiles={tiles} />);

    const link = screen.getByRole("link", { name: "For love" });
    expect(link.querySelector("img")).not.toBeNull();
  });

  it("draws a tile with no photo plainly, in colours its words still read on", () => {
    render(<HomeMosaic tiles={[tiles[0], tile("For love", { image: null }), ...tiles.slice(2, 5)]} />);

    const link = screen.getByRole("link", { name: "For love" });
    expect(link.querySelector("img")).toBeNull();
    expect(link.className).toMatch(/\bbg-nyoki-soft-ash\b/);
  });

  it("draws each tile's words in the colour chosen for it, dark words over a light fade", () => {
    render(<HomeMosaic tiles={[tiles[0], tile("For love", { words: "nyoki-navy" }), ...tiles.slice(2, 5)]} />);

    const link = screen.getByRole("link", { name: "For love" });
    expect(screen.getByText("For love").className).toMatch(/\btext-nyoki-navy\b/);
    expect(link.querySelector("[aria-hidden]")?.className).toMatch(/\bfrom-white\//);
    expect(screen.getByText("For Christmas").className).toMatch(/\btext-nyoki-white\b/);
  });

  it("shows nothing at all with no tiles", () => {
    const { container } = render(<HomeMosaic tiles={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
