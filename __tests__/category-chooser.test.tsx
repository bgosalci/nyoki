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

  describe("searching the list", () => {
    const shown = () => screen.getAllByRole("checkbox").map((box) => box.getAttribute("value"));

    async function open(chosen: string[] = ["cat_mugs"]) {
      const utils = setup(chosen);
      await utils.user.click(screen.getByRole("button", { name: /categories/i }));
      return utils;
    }

    it("puts the cursor in the search as the list opens", async () => {
      await open();

      expect(screen.getByRole("searchbox", { name: "Find a category" })).toHaveFocus();
    });

    it("finds categories by what is typed, each with its group beside it", async () => {
      const { user } = await open();

      await user.type(screen.getByRole("searchbox"), "mug");

      expect(shown()).toEqual(["cat_tableware", "cat_mugs"]);
    });

    it("shows a group's types when the group's name is typed", async () => {
      const { user } = await open();

      await user.type(screen.getByRole("searchbox"), "TABLE");

      expect(shown()).toEqual(["cat_tableware", "cat_mugs"]);
    });

    it("keeps what is ticked while it is out of view", async () => {
      const { user, posted } = await open(["cat_mugs", "cat_vases"]);

      await user.type(screen.getByRole("searchbox"), "mug");

      expect(shown()).not.toContain("cat_vases");
      expect(posted()).toEqual(["cat_mugs", "cat_vases"]);
    });

    it("says so when nothing matches", async () => {
      const { user } = await open();

      await user.type(screen.getByRole("searchbox"), "teapot");

      expect(screen.getByText("Nothing matches that.")).toBeInTheDocument();
      expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    });

    it("does not save the product when Enter is pressed in it", async () => {
      const onSubmit = jest.fn((event: React.FormEvent) => event.preventDefault());
      render(
        <form onSubmit={onSubmit}>
          <CategoryChooser categories={categories} chosen={[]} />
          <button type="submit">Save</button>
        </form>,
      );
      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: "Choose categories" }));

      await user.type(screen.getByRole("searchbox"), "mug{Enter}");

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("is not itself saved with the product", async () => {
      const { user, posted } = await open();
      await user.type(screen.getByRole("searchbox"), "mug");

      expect(posted()).toEqual(["cat_mugs"]);
      expect(screen.getByRole("searchbox")).not.toHaveAttribute("name");
    });

    it("starts afresh each time the list is opened", async () => {
      const { user } = await open();
      await user.type(screen.getByRole("searchbox"), "mug");
      await user.click(screen.getByRole("button", { name: "Done" }));
      await user.click(screen.getByRole("button", { name: "Change categories" }));

      expect(screen.getByRole("searchbox")).toHaveValue("");
      expect(shown()).toEqual(["cat_tableware", "cat_mugs", "cat_vases"]);
    });
  });
});

