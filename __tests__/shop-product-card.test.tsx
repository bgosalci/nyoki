import { render, screen } from "@testing-library/react";

import { ProductCard } from "@/components/shop/product-card";

const base = {
  href: "/product/easter-bunny-card",
  name: "Handmade Easter Bunny Card",
  pricePence: 650,
  wasPence: null,
  badges: [],
  image: { url: "/uploads/a.jpg", alt: "Front of the card" },
};

describe("ProductCard", () => {
  it("is a single link to the product, so the whole card is clickable", () => {
    render(<ProductCard product={base} />);

    const link = screen.getByRole("link", { name: /handmade easter bunny card/i });
    expect(link).toHaveAttribute("href", "/product/easter-bunny-card");
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

  it("shows each badge", () => {
    render(<ProductCard product={{ ...base, badges: ["20% off", "One of a kind"] }} />);

    expect(screen.getByText("20% off")).toBeInTheDocument();
    expect(screen.getByText("One of a kind")).toBeInTheDocument();
  });

  it("gives the photo an empty alt, since the name is in the same link", () => {
    render(<ProductCard product={base} />);

    expect(screen.getByRole("presentation")).toHaveAttribute("alt", "");
  });

  it("shows a placeholder square when there is no photo", () => {
    const { container } = render(<ProductCard product={{ ...base, image: null }} />);

    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByRole("link", { name: /easter bunny/i })).toBeInTheDocument();
  });
});
