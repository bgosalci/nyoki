import { render, screen, within } from "@testing-library/react";

import { CategoryForm } from "@/components/admin/category-form";

const noopAction = async () => ({ errors: {} });

// tableware -> mugs -> espresso ; vases
const categories = [
  { id: "tableware", name: "Tableware", parentId: null },
  { id: "mugs", name: "Mugs", parentId: "tableware" },
  { id: "espresso", name: "Espresso cups", parentId: "mugs" },
  { id: "vases", name: "Vases", parentId: null },
];

describe("CategoryForm", () => {
  it("renders the fields", () => {
    render(<CategoryForm action={noopAction} categories={categories} />);

    expect(screen.getByLabelText(/^name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/web address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/parent/i)).toBeInTheDocument();
  });

  it("offers top level and every category as a parent when creating", () => {
    render(<CategoryForm action={noopAction} categories={categories} />);

    const parent = screen.getByLabelText(/parent/i);
    const options = within(parent).getAllByRole("option").map((o) => o.textContent);

    expect(options[0]).toMatch(/top level/i);
    expect(options).toEqual(expect.arrayContaining(["Tableware", "Mugs", "Espresso cups", "Vases"]));
  });

  it("does not offer a category itself or its descendants as its parent", () => {
    render(
      <CategoryForm
        action={noopAction}
        categories={categories}
        excludeId="mugs"
        category={{ name: "Mugs", slug: "mugs", description: null, parentId: "tableware" }}
      />,
    );

    const parent = screen.getByLabelText(/parent/i);
    const options = within(parent).getAllByRole("option").map((o) => o.textContent);

    expect(options).not.toContain("Mugs");
    expect(options).not.toContain("Espresso cups");
    expect(options).toEqual(expect.arrayContaining(["Tableware", "Vases"]));
  });

  it("pre-selects the current parent", () => {
    render(
      <CategoryForm
        action={noopAction}
        categories={categories}
        excludeId="mugs"
        category={{ name: "Mugs", slug: "mugs", description: null, parentId: "tableware" }}
      />,
    );

    expect(screen.getByLabelText(/parent/i)).toHaveValue("tableware");
  });

  it("shows a field error where it belongs", () => {
    render(
      <CategoryForm
        action={noopAction}
        categories={categories}
        initialState={{ errors: { parentId: "A category cannot sit inside itself." } }}
      />,
    );

    expect(screen.getByLabelText(/parent/i)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("A category cannot sit inside itself.")).toBeInTheDocument();
  });
});
