import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { BulkCategoryDialog } from "@/components/admin/bulk-category-dialog";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});

const categories = [
  { id: "cards", name: "Cards", parentId: null },
  { id: "christmas", name: "Christmas Cards", parentId: "cards" },
  { id: "gifts", name: "Gifts", parentId: null },
];

const rows = [
  { id: "p1", categoryIds: ["christmas", "gifts"] },
  { id: "p2", categoryIds: ["gifts"] },
];

function setup(overrides: Partial<React.ComponentProps<typeof BulkCategoryDialog>> = {}) {
  const onApply = jest.fn(async () => {});
  const onCancel = jest.fn();
  const props = { open: true, mode: "add" as const, rows, categories, onApply, onCancel, ...overrides };
  const view = render(<BulkCategoryDialog {...props} />);
  return { ...props, view, user: userEvent.setup() };
}

describe("BulkCategoryDialog, adding", () => {
  it("stays shut until asked", () => {
    setup({ open: false });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("says how many it is for, and that they keep the categories they have", () => {
    setup();

    const dialog = screen.getByRole("dialog", { name: "Add 2 products to a category" });
    expect(dialog).toHaveTextContent(/stay in the categories they are in/i);
  });

  it("offers every category, a type set in under its group", () => {
    setup();

    expect(within(screen.getByRole("dialog")).getAllByRole("checkbox")).toHaveLength(3);
    const type = screen.getByRole("checkbox", { name: /christmas cards/i }).closest("li")!;
    expect(type.style.paddingLeft).toBe("1.5rem");
  });

  it("says how many of them each category holds, and shuts one that holds them all", () => {
    setup();

    expect(screen.getByRole("checkbox", { name: /christmas cards.*1 of 2 in it/i })).toBeEnabled();
    expect(screen.getByRole("checkbox", { name: /gifts.*all in it/i })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: /^cards$/i })).toBeEnabled();
  });

  it("hands back what was ticked, naming the button for what it does", async () => {
    const { user, onApply } = setup();

    await user.click(screen.getByRole("checkbox", { name: /^cards$/i }));
    await user.click(screen.getByRole("checkbox", { name: /christmas cards/i }));
    await user.click(screen.getByRole("button", { name: "Add 2 products" }));

    expect(onApply).toHaveBeenCalledWith(["cards", "christmas"]);
  });

  it("uses the singular for one product", () => {
    setup({ rows: [rows[1]] });

    expect(screen.getByRole("dialog", { name: "Add 1 product to a category" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add 1 product" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /gifts.*in it/i })).toBeDisabled();
  });

  it("asks for a category rather than doing nothing without a word", async () => {
    const { user, onApply } = setup();

    await user.click(screen.getByRole("button", { name: "Add 2 products" }));

    expect(onApply).not.toHaveBeenCalled();
    expect(screen.getByText(/choose a category first/i)).toBeInTheDocument();
  });

  it("finds a category by its place in the tree, keeping its group beside it", async () => {
    const { user } = setup();

    await user.type(screen.getByRole("searchbox", { name: /find a category/i }), "christmas");

    expect(screen.getByRole("checkbox", { name: /christmas cards/i })).toBeVisible();
    expect(screen.getByRole("checkbox", { name: /^cards$/i })).toBeVisible();
    expect(screen.queryByRole("checkbox", { name: /gifts/i })).not.toBeInTheDocument();
  });

  it("keeps a tick filtered out of view, and shows what is ticked", async () => {
    const { user, onApply } = setup();

    await user.click(screen.getByRole("checkbox", { name: /^cards$/i }));
    await user.type(screen.getByRole("searchbox"), "gifts");

    expect(screen.getByText(/adding to: cards/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add 2 products" }));
    expect(onApply).toHaveBeenCalledWith(["cards"]);
  });

  it("does not send the form when Enter is pressed in the search", async () => {
    const { user, onApply } = setup();

    await user.click(screen.getByRole("checkbox", { name: /^cards$/i }));
    await user.type(screen.getByRole("searchbox"), "cards{Enter}");

    expect(onApply).not.toHaveBeenCalled();
  });

  it("says when nothing matches", async () => {
    const { user } = setup();

    await user.type(screen.getByRole("searchbox"), "zebra");

    expect(screen.getByText(/nothing matches/i)).toBeInTheDocument();
  });

  it("says so when there are no categories to offer", () => {
    setup({ categories: [] });

    expect(screen.getByText(/no categories yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add 2 products" })).not.toBeInTheDocument();
  });

  it("shows it is saving, and takes no second press", async () => {
    let finish = () => {};
    const onApply = jest.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    const { user } = setup({ onApply });

    await user.click(screen.getByRole("checkbox", { name: /^cards$/i }));
    await user.click(screen.getByRole("button", { name: "Add 2 products" }));

    const saving = screen.getByRole("button", { name: /saving/i });
    expect(saving).toBeDisabled();
    await user.click(saving);
    expect(onApply).toHaveBeenCalledTimes(1);
    finish();
    await screen.findByRole("button", { name: "Add 2 products" });
  });

  it("calls off on Cancel and on Escape, changing nothing", async () => {
    const { user, onCancel, onApply } = setup();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);

    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(onApply).not.toHaveBeenCalled();
  });

  it("starts afresh each time it opens", async () => {
    const { user, view, ...props } = setup();

    await user.click(screen.getByRole("checkbox", { name: /^cards$/i }));
    await user.type(screen.getByRole("searchbox"), "cards");

    view.rerender(<BulkCategoryDialog {...props} open={false} />);
    view.rerender(<BulkCategoryDialog {...props} open />);

    expect(screen.getByRole("checkbox", { name: /^cards$/i })).not.toBeChecked();
    expect(screen.getByRole("searchbox")).toHaveValue("");
  });
});

describe("BulkCategoryDialog, taking out", () => {
  it("offers only the categories they are in, each by its whole place in the tree", () => {
    setup({ mode: "remove" });

    expect(screen.getByRole("dialog", { name: "Remove 2 products from a category" })).toBeInTheDocument();
    const boxes = within(screen.getByRole("dialog")).getAllByRole("checkbox");
    expect(boxes).toHaveLength(2);
    expect(screen.getByRole("checkbox", { name: /cards › christmas cards.*1 of 2 in it/i })).toBeEnabled();
    expect(screen.getByRole("checkbox", { name: /gifts.*all in it/i })).toBeEnabled();
  });

  it("says they stay in any others, and hands back what was ticked", async () => {
    const { user, onApply } = setup({ mode: "remove" });

    expect(screen.getByRole("dialog")).toHaveTextContent(/stay in any others/i);
    await user.click(screen.getByRole("checkbox", { name: /gifts/i }));
    await user.click(screen.getByRole("button", { name: "Remove 2 products" }));

    expect(onApply).toHaveBeenCalledWith(["gifts"]);
  });
});
