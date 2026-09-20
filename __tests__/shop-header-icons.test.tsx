import { render, screen } from "@testing-library/react";

import { HeaderIcons } from "@/components/shop/header-icons";

describe("HeaderIcons", () => {
  it("offers search as a real link to where you can search", () => {
    render(<HeaderIcons />);

    expect(screen.getByRole("link", { name: /search/i })).toHaveAttribute("href", "/shop");
  });

  it("shows the account and basket, but marks them as not working yet", () => {
    // They are in the design and the space is theirs, but neither exists.
    // Marking them disabled is honest; a link that silently does nothing is not.
    render(<HeaderIcons />);

    for (const name of [/account/i, /basket/i]) {
      const control = screen.getByRole("button", { name });
      expect(control).toBeDisabled();
      expect(control).toHaveAttribute("title", expect.stringMatching(/coming soon/i));
    }
  });

  it("keeps the icons themselves away from screen readers, which hear the labels", () => {
    const { container } = render(<HeaderIcons />);

    for (const svg of container.querySelectorAll("svg")) {
      expect(svg).toHaveAttribute("aria-hidden", "true");
    }
  });
});
