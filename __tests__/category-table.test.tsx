import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CategoryTable } from "@/components/admin/category-table";

const categories = [
  { id: "cards", parentId: null, name: "Cards", slug: "cards", productCount: 102, active: true },
  { id: "birthday", parentId: "cards", name: "Birthday Card", slug: "birthday-card", productCount: 20, active: true },
  { id: "christmas", parentId: "cards", name: "Christmas Cards", slug: "christmas-cards", productCount: 30, active: true },
  { id: "clothes", parentId: null, name: "Clothes", slug: "clothes", productCount: 73, active: true },
];

function setup() {
  render(<CategoryTable categories={categories} move={jest.fn(async () => ({ ok: true }))} />);
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

    expect(screen.queryByRole("button", { name: /(collapse|expand) clothes/i })).not.toBeInTheDocument();
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

    const again = render(<CategoryTable categories={categories} move={jest.fn(async () => ({ ok: true }))} />);

    expect(again.queryByRole("link", { name: "Birthday Card" })).not.toBeInTheDocument();
  });
});

describe("CategoryTable, each category's status", () => {
  const withStatus = [
    { id: "cards", parentId: null, name: "Cards", slug: "cards", productCount: 102, active: true },
    { id: "christmas", parentId: "cards", name: "Christmas Cards", slug: "christmas-cards", productCount: 30, active: false },
    { id: "packs", parentId: "christmas", name: "Christmas Packs", slug: "christmas-packs", productCount: 4, active: true },
    { id: "birthday", parentId: "cards", name: "Birthday Card", slug: "birthday-card", productCount: 20, active: true },
  ];
  const row = (name: string) => screen.getByRole("link", { name }).closest("tr")!;

  it("marks an inactive category, and says what keeps the ones inside it off the shop", () => {
    render(<CategoryTable categories={withStatus} move={jest.fn(async () => ({ ok: true }))} />);

    expect(row("Christmas Cards")).toHaveTextContent("Inactive");
    expect(row("Christmas Packs")).toHaveTextContent("Off the shop: Christmas Cards is inactive");
    expect(row("Cards")).not.toHaveTextContent(/inactive|off the shop/i);
    expect(row("Birthday Card")).not.toHaveTextContent(/inactive|off the shop/i);
  });
});
