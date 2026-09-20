import { render, screen } from "@testing-library/react";

import { HeaderIcons } from "@/components/shop/header-icons";

describe("HeaderIcons", () => {
  it("shows all three, but marks them as not working yet", () => {
    // They are in the design and the space is theirs, but none of search,
    // customer accounts or a basket exists. Marking them disabled is honest;
    // a control that silently does nothing is not.
    render(<HeaderIcons />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();

    for (const name of [/search/i, /account/i, /basket/i]) {
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
