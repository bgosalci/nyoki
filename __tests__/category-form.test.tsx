import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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
        category={{ name: "Mugs", slug: "mugs", description: null, parentId: "tableware", labelColour: "nyoki-navy", active: true }}
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
        category={{ name: "Mugs", slug: "mugs", description: null, parentId: "tableware", labelColour: "nyoki-navy", active: true }}
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

describe("CategoryForm, when a save is rejected", () => {
  it("keeps what was typed and chosen", async () => {
    render(<CategoryForm action={async () => ({ errors: { slug: "Another category already uses that web address." } })} categories={categories} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/^name/i), "Jugs");
    await user.type(screen.getByLabelText(/description/i), "For milk and flowers.");
    await user.selectOptions(screen.getByLabelText(/parent/i), "tableware");
    await user.click(screen.getByRole("button", { name: /save category/i }));
    await screen.findByText("Another category already uses that web address.");

    expect(screen.getByLabelText(/^name/i)).toHaveValue("Jugs");
    expect(screen.getByLabelText(/description/i)).toHaveValue("For milk and flowers.");
    expect(screen.getByLabelText(/parent/i)).toHaveValue("tableware");
  });
});

describe("CategoryForm, when a save goes through", () => {
  const mugs = { name: "Mugs", slug: "mugs", description: null, parentId: "tableware", labelColour: "nyoki-navy", active: true };

  it.each([
    ["Vases", "vases"],
    ["Top level", ""],
  ])("shows a category moved under %s there, so the next save does not move it back", async (label, parentId) => {
    const action = jest.fn(async (_state: unknown, _data: FormData) => ({ errors: {} }));
    const { rerender } = render(<CategoryForm action={action} categories={categories} category={mugs} excludeId="mugs" />);
    const user = userEvent.setup();

    await user.selectOptions(screen.getByLabelText(/parent/i), label);
    await user.click(screen.getByRole("button", { name: /save/i }));
    rerender(<CategoryForm action={action} categories={categories} category={{ ...mugs, parentId: parentId || null }} excludeId="mugs" />);
    await act(async () => {});

    expect(screen.getByLabelText(/parent/i)).toHaveValue(parentId);

    await user.click(screen.getByRole("button", { name: /save/i }));
    expect(action.mock.calls[1][1].get("parentId")).toBe(parentId);
  });
});

describe("CategoryForm, as React draws it", () => {
  it("raises no warning about keys", () => {
    const errors = jest.spyOn(console, "error").mockImplementation(() => {});
    render(<CategoryForm action={noopAction} categories={categories} category={{ name: "Mugs", slug: "mugs", description: null, parentId: "tableware", labelColour: "nyoki-navy", active: true }} excludeId="mugs" />);

    expect(errors.mock.calls.filter(([message]) => String(message).includes('unique "key"'))).toEqual([]);
    errors.mockRestore();
  });
});

describe("CategoryForm, the colour of its name", () => {
  it("offers the colours a name can take in the shop's header, starting from the one saved", () => {
    render(
      <CategoryForm
        action={noopAction}
        categories={categories}
        category={{ name: "CHRISTMAS", slug: "christmas", description: null, parentId: null, labelColour: "nyoki-ink", active: true }}
      />,
    );

    const colours = screen.getByRole("radiogroup", { name: /colour of its name/i });
    expect(within(colours).getByRole("radio", { name: "Ink" })).toBeChecked();
    expect(within(colours).getByRole("radio", { name: "Navy" })).not.toBeChecked();
  });

  it("starts a new category in navy, and posts the colour chosen", async () => {
    const { container } = render(<CategoryForm action={noopAction} categories={categories} />);
    const user = userEvent.setup();

    const colours = screen.getByRole("radiogroup", { name: /colour of its name/i });
    expect(within(colours).getByRole("radio", { name: "Navy" })).toBeChecked();

    await user.click(within(colours).getByRole("radio", { name: "Sage deep" }));

    expect(new FormData(container.querySelector("form")!).get("labelColour")).toBe("nyoki-sage-deep");
  });

  it("shows the name in that colour on the header's beige", async () => {
    render(
      <CategoryForm
        action={noopAction}
        categories={categories}
        category={{ name: "CHRISTMAS", slug: "christmas", description: null, parentId: null, labelColour: "nyoki-sage-deep", active: true }}
      />,
    );

    expect(screen.getByText("CHRISTMAS", { selector: "p" })).toHaveStyle({ color: "#637273" });
  });
});

describe("CategoryForm, its status", () => {
  const mugs = { name: "Mugs", slug: "mugs", description: null, parentId: "tableware", labelColour: "nyoki-navy", active: true };

  it("offers it as an Active switch, on for a new category, saying what switching it off does", () => {
    render(<CategoryForm action={noopAction} categories={categories} />);

    const toggle = screen.getByRole("switch", { name: "Active" });
    expect(toggle).toBeChecked();
    expect(toggle).toHaveAccessibleDescription(/everything inside it/i);
  });

  it("is off for an inactive category", () => {
    render(<CategoryForm action={noopAction} categories={categories} category={{ ...mugs, active: false }} excludeId="mugs" />);

    expect(screen.getByRole("switch", { name: "Active" })).not.toBeChecked();
  });

  it("posts the switch, and shows it as saved so the next save keeps it", async () => {
    const action = jest.fn(async (_state: unknown, _data: FormData) => ({ errors: {} }));
    const { rerender } = render(<CategoryForm action={action} categories={categories} category={mugs} excludeId="mugs" />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("switch", { name: "Active" }));
    await user.click(screen.getByRole("button", { name: /save/i }));
    expect(action.mock.calls[0][1].get("active")).toBeNull();

    rerender(<CategoryForm action={action} categories={categories} category={{ ...mugs, active: false }} excludeId="mugs" />);
    await act(async () => {});
    expect(screen.getByRole("switch", { name: "Active" })).not.toBeChecked();

    await user.click(screen.getByRole("switch", { name: "Active" }));
    await user.click(screen.getByRole("button", { name: /save/i }));
    expect(action.mock.calls[1][1].get("active")).toBe("on");
  });

  it("says when an inactive category above keeps it off the shop, however its own switch is set", () => {
    render(<CategoryForm action={noopAction} categories={categories} category={mugs} excludeId="mugs" offShopWith="Tableware" />);

    expect(screen.getByRole("switch", { name: "Active" })).toHaveAccessibleDescription(/Tableware is inactive/);
  });
});
