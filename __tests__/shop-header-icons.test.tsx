import { render, screen } from "@testing-library/react";

import { HeaderIcons } from "@/components/shop/header-icons";

describe("HeaderIcons", () => {
  it("marks search, which does not exist yet, as not working rather than as a dead control", () => {
    // Search is in the design and the space is its, but it does not exist.
    // Disabled is honest; a control that silently does nothing is not.
    render(<HeaderIcons />);

    const search = screen.getByRole("button", { name: /search/i });
    expect(search).toBeDisabled();
    expect(search).toHaveAttribute("title", expect.stringMatching(/coming soon/i));
  });

  it("marks the basket as coming soon too, while ordering is closed", () => {
    render(<HeaderIcons basket={null} />);

    const basket = screen.getByRole("button", { name: /basket/i });
    expect(basket).toBeDisabled();
    expect(basket).toHaveAttribute("title", expect.stringMatching(/coming soon/i));
  });

  it("leads to the basket once ordering is open, saying how many pieces it holds", () => {
    render(<HeaderIcons basket={{ pieces: 4 }} />);

    const basket = screen.getByRole("link", { name: /basket, 4 pieces/i });
    expect(basket).toHaveAttribute("href", "/basket");
    expect(basket).toHaveTextContent("4");
  });

  it("shows no count on an empty basket, rather than a nought", () => {
    render(<HeaderIcons basket={{ pieces: 0 }} />);

    const basket = screen.getByRole("link", { name: "Basket" });
    expect(basket).not.toHaveTextContent("0");
  });

  it("draws its icons a size smaller and closer together on a phone, so the logo has room", () => {
    const { container } = render(<HeaderIcons basket={{ pieces: 1 }} />);

    expect(screen.getAllByRole("list")[0]).toHaveClass("gap-3", "sm:gap-5");
    for (const icon of container.querySelectorAll("svg")) expect(icon).toHaveClass("size-5", "sm:size-6");
  });

  it("sends a visitor who is not signed in to sign in", () => {
    render(<HeaderIcons />);

    expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute("href", "/account/sign-in");
  });

  it("sends a shopper who is signed in to their account instead", () => {
    render(<HeaderIcons signedIn />);

    expect(screen.getByRole("link", { name: /your account/i })).toHaveAttribute("href", "/account");
    expect(screen.queryByRole("link", { name: /sign in/i })).not.toBeInTheDocument();
  });

  it("offers the saved pieces, and says how many there are", () => {
    render(<HeaderIcons signedIn savedCount={3} />);

    const saved = screen.getByRole("link", { name: /saved pieces/i });
    expect(saved).toHaveAttribute("href", "/account/favourites");
    expect(saved).toHaveTextContent("3");
  });

  it("shows no count when nothing is saved, rather than a nought", () => {
    render(<HeaderIcons signedIn savedCount={0} />);

    expect(screen.getByRole("link", { name: /saved pieces/i })).not.toHaveTextContent("0");
  });

  it("keeps the icons themselves away from screen readers, which hear the labels", () => {
    const { container } = render(<HeaderIcons basket={{ pieces: 2 }} />);

    for (const svg of container.querySelectorAll("svg")) {
      expect(svg).toHaveAttribute("aria-hidden", "true");
    }
  });
});
