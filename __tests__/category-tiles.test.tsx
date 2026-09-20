import { render, screen, within } from "@testing-library/react";

import { CategoryTiles } from "@/components/shop/category-tiles";

const tiles = [
  { slug: "birthday-card", name: "Birthday Card", count: 21, image: { url: "/birthday.jpg", alt: "A birthday card" } },
  { slug: "easter-card", name: "Easter Card", count: 1, image: null },
];

describe("CategoryTiles", () => {
  it("gives each tile a heading and sends it to that category", () => {
    render(<CategoryTiles heading="Have a look" tiles={tiles} />);

    expect(screen.getByRole("heading", { name: "Have a look" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /birthday card/i })).toHaveAttribute("href", "/shop/birthday-card");
  });

  it("says how much is inside, so the tile is worth clicking", () => {
    render(<CategoryTiles heading="Have a look" tiles={tiles} />);

    const tile = screen.getByRole("link", { name: /birthday card/i });
    expect(within(tile).getByText("21 pieces")).toBeInTheDocument();
  });

  it("counts one piece as a piece", () => {
    render(<CategoryTiles heading="Have a look" tiles={tiles} />);

    expect(screen.getByText("1 piece")).toBeInTheDocument();
  });

  it("leaves the photo out of the label, which the name already carries", () => {
    // An empty alt takes the image out of the accessibility tree entirely,
    // which is why it is queried from the DOM rather than by role.
    const { container } = render(<CategoryTiles heading="Have a look" tiles={tiles} />);

    expect(container.querySelectorAll("img")).toHaveLength(1);
    expect(container.querySelector("img")).toHaveAttribute("alt", "");
  });

  it("draws a tile that has no photo yet", () => {
    const { container } = render(<CategoryTiles heading="Have a look" tiles={[tiles[1]]} />);

    expect(screen.getByRole("link", { name: /easter card/i })).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });

  it("shows nothing at all rather than an empty heading", () => {
    const { container } = render(<CategoryTiles heading="Have a look" tiles={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
