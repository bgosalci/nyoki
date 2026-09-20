import { render, screen, within } from "@testing-library/react";

import { CategoryPills } from "@/components/admin/category-pills";

const categories = [
  { id: "cards", slug: "cards", name: "Cards", parentId: null },
  { id: "birthday", slug: "birthday-card", name: "Birthday Card", parentId: "cards" },
  { id: "christmas", slug: "christmas-cards", name: "Christmas Cards", parentId: "cards" },
  { id: "clothes", slug: "clothes", name: "Clothes", parentId: null },
];
const counts = { cards: 30, birthday: 12, christmas: 18, clothes: 50 };

describe("CategoryPills", () => {
  it("shows an All pill and one per group, each with its product count", () => {
    render(<CategoryPills categories={categories} counts={counts} selected={null} q="" status="" />);

    expect(screen.getByRole("link", { name: /^all/i })).toHaveAttribute("href", "/admin/products");
    expect(screen.getByRole("link", { name: /cards 30/i })).toHaveAttribute("href", "/admin/products?category=cards");
    expect(screen.getByRole("link", { name: /clothes 50/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /birthday/i })).not.toBeInTheDocument();
  });

  it("reveals the group's types when a group is selected, and marks the selection", () => {
    render(<CategoryPills categories={categories} counts={counts} selected="cards" q="" status="" />);

    expect(screen.getByRole("link", { name: /cards 30/i })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("link", { name: /birthday card 12/i })).toHaveAttribute("href", "/admin/products?category=birthday-card");
    expect(screen.getByRole("link", { name: /christmas cards 18/i })).toBeInTheDocument();
  });

  it("keeps the search and status in every pill's address", () => {
    render(<CategoryPills categories={categories} counts={counts} selected={null} q="dad" status="ACTIVE" />);

    expect(screen.getByRole("link", { name: /cards 30/i })).toHaveAttribute("href", "/admin/products?q=dad&status=ACTIVE&category=cards");
    expect(screen.getByRole("link", { name: /^all/i })).toHaveAttribute("href", "/admin/products?q=dad&status=ACTIVE");
  });

  it("groups each row so assistive tech can tell them apart", () => {
    render(<CategoryPills categories={categories} counts={counts} selected="birthday-card" q="" status="" />);

    const groups = screen.getAllByRole("group");
    expect(groups).toHaveLength(2);
    expect(within(groups[1]).getByRole("link", { name: /birthday card/i })).toHaveAttribute("aria-current", "true");
  });

  it("renders nothing when there are no categories yet", () => {
    const { container } = render(<CategoryPills categories={[]} counts={{}} selected={null} q="" status="" />);

    expect(container).toBeEmptyDOMElement();
  });
});
