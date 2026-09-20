import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AdminSidebar } from "@/components/admin/admin-sidebar";

jest.mock("next/navigation", () => ({ usePathname: () => "/admin/products" }));

beforeEach(() => {
  try {
    window.localStorage.clear();
  } catch {
    // ignore
  }
});

describe("AdminSidebar", () => {
  it("gives every destination an icon the screen reader skips", () => {
    const { container } = render(<AdminSidebar />);

    const links = screen.getAllByRole("link");
    expect(links.length).toBeGreaterThan(5);
    for (const link of links) {
      expect(link.querySelector("svg")).not.toBeNull();
    }
    for (const svg of container.querySelectorAll("svg")) {
      expect(svg).toHaveAttribute("aria-hidden", "true");
    }
  });

  it("marks the section you are in", () => {
    render(<AdminSidebar />);

    expect(screen.getByRole("link", { name: "Products" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Overview" })).not.toHaveAttribute("aria-current");
  });

  it("collapses and expands, and says which it will do", async () => {
    const user = userEvent.setup();
    render(<AdminSidebar />);

    const toggle = screen.getByRole("button", { name: /collapse/i });
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    await user.click(toggle);

    expect(screen.getByRole("button", { name: /expand/i })).toHaveAttribute("aria-expanded", "false");
  });

  it("keeps every destination reachable by name once collapsed", async () => {
    // The labels are hidden to the eye, not to a screen reader: a sidebar of
    // unlabelled icons is unusable without sight.
    const user = userEvent.setup();
    render(<AdminSidebar />);

    await user.click(screen.getByRole("button", { name: /collapse/i }));

    expect(screen.getByRole("link", { name: "Products" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Settings" })).toBeInTheDocument();
  });

  it("remembers the choice for next time", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<AdminSidebar />);

    await user.click(screen.getByRole("button", { name: /collapse/i }));
    unmount();

    render(<AdminSidebar />);
    expect(screen.getByRole("button", { name: /expand/i })).toBeInTheDocument();
  });

  it("opens expanded when storage cannot be read, rather than failing", () => {
    const getItem = jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(() => render(<AdminSidebar />)).not.toThrow();
    expect(screen.getByRole("button", { name: /collapse/i })).toBeInTheDocument();

    getItem.mockRestore();
  });
});
