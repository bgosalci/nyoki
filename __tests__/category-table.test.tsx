import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CategoryTable } from "@/components/admin/category-table";

const branches = [
  { row: { id: "cards", name: "Cards", slug: "cards", productCount: 102 }, depth: 0 },
  { row: { id: "birthday", name: "Birthday Card", slug: "birthday-card", productCount: 20 }, depth: 1 },
  { row: { id: "christmas", name: "Christmas Cards", slug: "christmas-cards", productCount: 30 }, depth: 1 },
  { row: { id: "clothes", name: "Clothes", slug: "clothes", productCount: 73 }, depth: 0 },
];

function setup() {
  render(<CategoryTable branches={branches} />);
  return { user: userEvent.setup() };
}

beforeEach(() => window.localStorage.clear());

describe("CategoryTable", () => {
  it("lists every category, its address and how many products it holds", () => {
    setup();

    expect(screen.getByRole("link", { name: "Christmas Cards" })).toHaveAttribute("href", "/admin/categories/christmas");
    expect(screen.getByText("/christmas-cards")).toBeInTheDocument();
    expect(screen.getByText("102")).toBeInTheDocument();
  });

  it("shuts a group, hiding what is inside it", async () => {
    const { user } = setup();

    await user.click(screen.getByRole("button", { name: "Collapse Cards" }));

    expect(screen.queryByRole("link", { name: "Birthday Card" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Clothes" })).toBeInTheDocument();
  });

  it("says how much a shut group is hiding, so nothing disappears quietly", async () => {
    const { user } = setup();

    await user.click(screen.getByRole("button", { name: "Collapse Cards" }));

    expect(screen.getByText(/2 hidden/i)).toBeInTheDocument();
  });

  it("opens again", async () => {
    const { user } = setup();

    await user.click(screen.getByRole("button", { name: "Collapse Cards" }));
    await user.click(screen.getByRole("button", { name: "Expand Cards" }));

    expect(screen.getByRole("link", { name: "Birthday Card" })).toBeInTheDocument();
  });

  it("says whether a group is open", async () => {
    const { user } = setup();

    expect(screen.getByRole("button", { name: "Collapse Cards" })).toHaveAttribute("aria-expanded", "true");

    await user.click(screen.getByRole("button", { name: "Collapse Cards" }));

    expect(screen.getByRole("button", { name: "Expand Cards" })).toHaveAttribute("aria-expanded", "false");
  });

  it("offers nothing to collapse on a category with nothing inside it", () => {
    setup();

    expect(screen.queryByRole("button", { name: /clothes/i })).not.toBeInTheDocument();
  });

  it("shuts and opens the whole list at once", async () => {
    const { user } = setup();

    await user.click(screen.getByRole("button", { name: /collapse all/i }));
    expect(screen.queryByRole("link", { name: "Birthday Card" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /expand all/i }));
    expect(screen.getByRole("link", { name: "Birthday Card" })).toBeInTheDocument();
  });

  it("remembers what was shut, so a long list is not reopened every visit", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Collapse Cards" }));

    const again = render(<CategoryTable branches={branches} />);

    expect(again.queryByRole("link", { name: "Birthday Card" })).not.toBeInTheDocument();
  });
});
