import { render, screen } from "@testing-library/react";

import { HeaderIcons } from "@/components/shop/header-icons";

describe("HeaderIcons", () => {
  it("marks what does not exist yet as not working, rather than as a dead control", () => {
    // Search and the basket are in the design and the space is theirs, but
    // neither exists. Disabled is honest; a control that silently does
    // nothing is not.
    render(<HeaderIcons />);

    for (const name of [/search/i, /basket/i]) {
      const control = screen.getByRole("button", { name });
      expect(control).toBeDisabled();
      expect(control).toHaveAttribute("title", expect.stringMatching(/coming soon/i));
    }
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

  it("keeps the icons themselves away from screen readers, which hear the labels", () => {
    const { container } = render(<HeaderIcons />);

    for (const svg of container.querySelectorAll("svg")) {
      expect(svg).toHaveAttribute("aria-hidden", "true");
    }
  });
});
