import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ThemeToggle } from "@/components/admin/theme-toggle";
import { THEME_STORAGE_KEY } from "@/lib/admin/theme";

beforeEach(() => {
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe("ThemeToggle", () => {
  it("offers both themes and the machine's own setting", () => {
    render(<ThemeToggle />);

    const group = screen.getByRole("group", { name: /theme/i });
    expect(group).toBeInTheDocument();
    for (const label of ["Light", "Dark", "System"]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
  });

  it("follows the machine until told otherwise", () => {
    render(<ThemeToggle />);

    expect(screen.getByRole("button", { name: "System" })).toHaveAttribute("aria-pressed", "true");
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it("marks the page when a theme is chosen outright", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(screen.getByRole("button", { name: "Dark" }));

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(screen.getByRole("button", { name: "Dark" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "System" })).toHaveAttribute("aria-pressed", "false");
  });

  it("hands the decision back by taking the mark off again", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(screen.getByRole("button", { name: "Light" }));
    expect(document.documentElement.dataset.theme).toBe("light");

    await user.click(screen.getByRole("button", { name: "System" }));
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it("remembers the choice for next time", async () => {
    const user = userEvent.setup();
    const first = render(<ThemeToggle />);

    await user.click(screen.getByRole("button", { name: "Dark" }));
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");

    first.unmount();
    render(<ThemeToggle />);

    expect(screen.getByRole("button", { name: "Dark" })).toHaveAttribute("aria-pressed", "true");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("takes the mark off when it leaves, since the shop has only one look", async () => {
    const user = userEvent.setup();
    const view = render(<ThemeToggle />);

    await user.click(screen.getByRole("button", { name: "Dark" }));
    view.unmount();

    expect(document.documentElement.dataset.theme).toBeUndefined();
  });
});
