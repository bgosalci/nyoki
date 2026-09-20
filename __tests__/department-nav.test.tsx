import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DepartmentNav } from "@/components/shop/department-nav";

let pathname = "/shop";
jest.mock("next/navigation", () => ({ usePathname: () => pathname }));

const groups = [
  {
    slug: "accessories",
    name: "Accessories",
    children: [
      { slug: "brooch", name: "Brooch" },
      { slug: "hairband", name: "Hairband" },
    ],
  },
  { slug: "tableware", name: "Tableware", children: [] },
];

// A hidden element's accessible name computes as empty, so the panel is found
// by its label attribute rather than by role and name.
const menuOf = (department: string) =>
  document.querySelector<HTMLElement>(`[aria-label="${department} categories"]`)!;

beforeEach(() => {
  pathname = "/shop";
});

describe("DepartmentNav", () => {
  it("links each department to its page", () => {
    render(<DepartmentNav groups={groups} />);

    expect(screen.getByRole("link", { name: "Accessories" })).toHaveAttribute("href", "/shop/accessories");
    expect(screen.getByRole("link", { name: "Everything" })).toHaveAttribute("href", "/shop");
  });

  it("keeps its sub-categories in the page but out of sight until asked", () => {
    // Rendered rather than conditional, so the links are in the HTML for
    // crawlers; hidden, so screen readers skip them until the menu opens.
    render(<DepartmentNav groups={groups} />);

    const menu = menuOf("Accessories");
    expect(menu).not.toBeVisible();
    expect(within(menu).getByText("Brooch").closest("a")).toHaveAttribute("href", "/shop/brooch");
  });

  it("opens on hover and shuts again when the pointer leaves", async () => {
    const user = userEvent.setup();
    render(<DepartmentNav groups={groups} />);

    await user.hover(screen.getByRole("link", { name: "Accessories" }));
    expect(menuOf("Accessories")).toBeVisible();

    await user.unhover(screen.getByRole("link", { name: "Accessories" }));
    expect(menuOf("Accessories")).not.toBeVisible();
  });

  it("opens from the keyboard, so tabbing reaches the sub-categories", async () => {
    const user = userEvent.setup();
    render(<DepartmentNav groups={groups} />);

    await user.tab();
    expect(screen.getByRole("link", { name: "Accessories" })).toHaveFocus();
    expect(menuOf("Accessories")).toBeVisible();
  });

  it("shuts once focus leaves the department altogether", async () => {
    const user = userEvent.setup();
    render(<DepartmentNav groups={groups} />);

    await user.tab();
    expect(menuOf("Accessories")).toBeVisible();

    // Tab through both sub-category links, then out of the department.
    await user.tab();
    await user.tab();
    expect(menuOf("Accessories")).toBeVisible();

    await user.tab();
    expect(menuOf("Accessories")).not.toBeVisible();
  });

  it("shuts when a sub-category is chosen and the page changes", async () => {
    // The clicked link keeps focus after navigating, which would otherwise
    // hold the menu open over the page it just opened.
    const user = userEvent.setup();
    const { rerender } = render(<DepartmentNav groups={groups} />);

    await user.hover(screen.getByRole("link", { name: "Accessories" }));
    expect(menuOf("Accessories")).toBeVisible();

    pathname = "/shop/brooch";
    rerender(<DepartmentNav groups={groups} />);

    expect(menuOf("Accessories")).not.toBeVisible();
  });

  it("gives a department with nothing beneath it no menu at all", () => {
    render(<DepartmentNav groups={groups} />);

    expect(screen.getByRole("link", { name: "Tableware" })).toBeInTheDocument();
    expect(document.querySelector('[aria-label="Tableware categories"]')).toBeNull();
  });
});
