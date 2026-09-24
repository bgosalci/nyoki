import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CategoryChooser } from "@/components/admin/category-chooser";

// tableware -> mugs ; vases
const categories = [
  { id: "cat_tableware", name: "Tableware", parentId: null },
  { id: "cat_mugs", name: "Mugs", parentId: "cat_tableware" },
  { id: "cat_vases", name: "Vases", parentId: null },
];

function setup(chosen: string[] = ["cat_mugs"], list = categories) {
  const { container } = render(
    <form>
      <CategoryChooser categories={list} chosen={chosen} />
    </form>,
  );
  const posted = () => new FormData(container.querySelector("form")!).getAll("categoryIds");
  return { posted, user: userEvent.setup() };
}

const summary = () => screen.getByRole("list", { name: "Chosen categories" });

describe("CategoryChooser", () => {
  it("shows what is chosen, by its place in the tree, rather than every category", () => {
    setup();

    expect(within(summary()).getByText("Tableware › Mugs")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /vases/i })).not.toBeInTheDocument();
  });

  it("still saves what is chosen while the list is shut", () => {
    const { posted } = setup();

    expect(posted()).toEqual(["cat_mugs"]);
  });

  it("opens the whole list to change them, children beneath their parent", async () => {
    const { user, posted } = setup();

    const change = screen.getByRole("button", { name: "Change categories" });
    expect(change).toHaveAttribute("aria-expanded", "false");
    await user.click(change);

    expect(screen.getByRole("button", { name: "Done" })).toHaveAttribute("aria-expanded", "true");
    const order = screen.getAllByRole("checkbox").map((box) => box.getAttribute("value"));
    expect(order).toEqual(["cat_tableware", "cat_mugs", "cat_vases"]);
    expect(screen.getByRole("checkbox", { name: "Mugs" })).toBeChecked();

    await user.click(screen.getByRole("checkbox", { name: "Vases" }));
    await user.click(screen.getByRole("button", { name: "Done" }));

    expect(screen.queryByRole("checkbox", { name: "Vases" })).not.toBeInTheDocument();
    expect(within(summary()).getAllByRole("listitem").map((item) => item.firstChild?.textContent)).toEqual(["Tableware › Mugs", "Vases"]);
    expect(posted()).toEqual(["cat_mugs", "cat_vases"]);
  });

  it("takes one off from the summary, without opening the list", async () => {
    const { user, posted } = setup(["cat_mugs", "cat_vases"]);

    await user.click(screen.getByRole("button", { name: "Remove Vases" }));

    expect(within(summary()).queryByText("Vases")).not.toBeInTheDocument();
    expect(posted()).toEqual(["cat_mugs"]);
  });

  it("says when none is chosen, and offers to choose", () => {
    setup([]);

    expect(screen.getByText("None chosen yet.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Choose categories" })).toBeInTheDocument();
  });

  it("says so when the shop has no categories yet", () => {
    setup([], []);

    expect(screen.getByText(/no categories yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
