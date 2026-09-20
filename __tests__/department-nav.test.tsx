import { render, screen, within } from "@testing-library/react";

import { DepartmentNav } from "@/components/shop/department-nav";

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

describe("DepartmentNav", () => {
  it("links each department to its page", () => {
    render(<DepartmentNav groups={groups} />);

    expect(screen.getByRole("link", { name: "Accessories" })).toHaveAttribute("href", "/shop/accessories");
    expect(screen.getByRole("link", { name: "Everything" })).toHaveAttribute("href", "/shop");
  });

  it("carries its sub-categories as real links", () => {
    render(<DepartmentNav groups={groups} />);

    expect(screen.getByRole("link", { name: "Brooch" })).toHaveAttribute("href", "/shop/brooch");
    expect(screen.getByRole("link", { name: "Hairband" })).toHaveAttribute("href", "/shop/hairband");
  });

  it("names the menu after its department, so it is not just 'menu' to a screen reader", () => {
    render(<DepartmentNav groups={groups} />);

    const menu = screen.getByRole("group", { name: /accessories/i });
    expect(within(menu).getAllByRole("link")).toHaveLength(2);
  });

  it("gives a department with nothing beneath it no menu at all", () => {
    render(<DepartmentNav groups={groups} />);

    expect(screen.getByRole("link", { name: "Tableware" })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: /tableware/i })).not.toBeInTheDocument();
  });

  it("opens on focus as well as hover, so it works from the keyboard", () => {
    const { container } = render(<DepartmentNav groups={groups} />);
    const menu = screen.getByRole("group", { name: /accessories/i });

    expect(menu.className).toMatch(/group-hover:visible/);
    expect(menu.className).toMatch(/group-focus-within:visible/);
    expect(container.querySelector("li.group")).not.toBeNull();
  });
});
