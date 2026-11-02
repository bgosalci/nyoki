import { render, screen } from "@testing-library/react";

import { ProductCard } from "@/components/shop/product-card";
import { ui } from "@/lib/brand/ui";

const base = {
  id: "p1",
  href: "/product/easter-bunny-card",
  name: "Handmade Easter Bunny Card",
  pricePence: 650,
  wasPence: null,
  badges: [] as { label: string; tone: "sale" | "made" | "one" }[],
  image: { url: "/uploads/a.jpg", alt: "Front of the card" },
  colours: null as number | null,
};

describe("ProductCard", () => {
  it("makes the whole card clickable, without swallowing the controls on it", () => {
    // The link stretches over the card rather than wrapping it, so a button
    // sitting on the photo is still its own control and not part of the link.
    const { container } = render(<ProductCard product={base} />);

    const link = screen.getByRole("link", { name: /handmade easter bunny card/i });
    expect(link).toHaveAttribute("href", "/product/easter-bunny-card");
    expect(link.className).toMatch(/after:absolute/);
    expect(container.firstElementChild).toContainElement(link);
  });

  it("shows the price", () => {
    render(<ProductCard product={base} />);

    expect(screen.getByText("£6.50")).toBeInTheDocument();
  });

  it("strikes through the old price and tells a screen reader what it means", () => {
    render(<ProductCard product={{ ...base, pricePence: 520, wasPence: 650 }} />);

    expect(screen.getByText("£5.20")).toBeInTheDocument();
    const was = screen.getByText("£6.50");
    expect(was.tagName).toBe("S");
    // "£6.50" struck through is meaningless read aloud on its own.
    expect(screen.getByText(/was/i)).toHaveClass("sr-only");
  });

  it("shows each badge, coloured by what it says", () => {
    render(
      <ProductCard
        product={{
          ...base,
          badges: [
            { label: "20% off", tone: "sale" },
            { label: "Made to order", tone: "made" },
            { label: "One of a kind", tone: "one" },
          ],
        }}
      />,
    );

    expect(screen.getByText("20% off").className).toMatch(/bg-nyoki-sage/);
    expect(screen.getByText("Made to order").className).toMatch(/bg-nyoki-accent-beige/);
    expect(screen.getByText("One of a kind").className).toMatch(/bg-nyoki-ink/);
  });

  it("puts the badges after the price, as the theme board has them", () => {
    render(<ProductCard product={{ ...base, badges: [{ label: "20% off", tone: "sale" }] }} />);

    const price = screen.getByText("£6.50");
    const badge = screen.getByText("20% off");
    expect(price.compareDocumentPosition(badge) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("is a white panel with a border, not a bare image", () => {
    const { container } = render(<ProductCard product={base} />);
    const card = container.firstElementChild!;

    expect(card.className).toMatch(/bg-nyoki-white/);
    expect(card.className).toMatch(/border/);
  });

  it("has the theme board's curved edges, with the photo clipped to them", () => {
    // The board draws cards at 8px with overflow hidden; without the clip the
    // square photo would poke out through the rounded top corners.
    const { container } = render(<ProductCard product={base} />);

    const card = container.firstElementChild!;
    expect(card.className).toMatch(/rounded-lg/);
    expect(card.className).toMatch(/overflow-hidden/);
  });

  it("curves the badges too, as the board's tags are", () => {
    render(<ProductCard product={{ ...base, badges: [{ label: "20% off", tone: "sale" }] }} />);

    expect(screen.getByText("20% off").className).toMatch(/rounded/);
  });

  it("gives the photo an empty alt, since the name is in the same link", () => {
    render(<ProductCard product={base} />);

    expect(screen.getByRole("presentation")).toHaveAttribute("alt", "");
  });

  it("offers to save the piece when the page hands it a way to", () => {
    const toggle = jest.fn(async () => {});
    render(<ProductCard product={base} signedIn saved={false} toggleFavourite={toggle} />);

    expect(screen.getByRole("button", { name: /save handmade easter bunny card/i })).toBeInTheDocument();
  });

  it("leaves the heart off entirely where saving is not on offer", () => {
    render(<ProductCard product={base} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows a placeholder square when there is no photo", () => {
    const { container } = render(<ProductCard product={{ ...base, image: null }} />);

    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByRole("link", { name: /easter bunny/i })).toBeInTheDocument();
  });

  it("marks a piece that comes in colours with a dot of many colours, and how many", () => {
    const { container } = render(<ProductCard product={{ ...base, colours: 4 }} />);

    const note = screen.getByText("4 colours");
    expect(screen.getByText("£6.50").compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // The dot only decorates the words, so it is not read out.
    const dot = container.querySelector('[data-colours-dot]')!;
    expect(dot).toHaveAttribute("aria-hidden", "true");
    expect(dot.className).toContain(ui.shopColoursDot);
  });

  it("says nothing of colour for a piece with no choice of it", () => {
    const { container } = render(<ProductCard product={base} />);

    expect(screen.queryByText(/colours/)).not.toBeInTheDocument();
    expect(container.querySelector("[data-colours-dot]")).toBeNull();
  });
});
