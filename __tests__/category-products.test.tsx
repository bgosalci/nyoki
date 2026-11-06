import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CategoryProducts, type CategoryProductItem } from "@/components/admin/category-products";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});

const item = (id: string, name: string, inCategory: boolean, extra: Partial<CategoryProductItem> = {}): CategoryProductItem => ({
  id,
  name,
  sku: null,
  status: "ACTIVE",
  image: null,
  categories: [],
  inCategory,
  ...extra,
});

const products = [
  item("p1", "Bonnet", false, { categories: ["Clothes › Hats"] }),
  item("p2", "Holly Card", true, { categories: ["Christmas Cards"] }),
  item("p3", "Draft Card", true, { status: "DRAFT", categories: ["Christmas Cards"] }),
  item("p4", "Unfiled Brooch", false, { sku: "BR-7" }),
];

function setup(overrides: Partial<React.ComponentProps<typeof CategoryProducts>> = {}) {
  const save = jest.fn(async () => ({ ok: true as const, said: ["Added 1 product to Christmas Cards."] }));
  render(
    <CategoryProducts
      categoryName="Christmas Cards"
      products={products}
      beneath={0}
      listHref="/admin/products?category=christmas-cards"
      save={save}
      {...overrides}
    />,
  );
  return { save, user: userEvent.setup() };
}

describe("CategoryProducts", () => {
  it("lists what is in the category, each leading to its page, saying which are not on the shop", () => {
    setup();

    const list = screen.getByRole("list", { name: "Products in Christmas Cards" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    expect(within(list).getByRole("link", { name: /holly card/i })).toHaveAttribute("href", "/admin/products/p2");
    expect(within(list).getByRole("link", { name: /draft card/i })).toHaveTextContent(/draft/i);
    expect(within(list).queryByRole("link", { name: /bonnet/i })).not.toBeInTheDocument();
  });

  it("counts them, and says how many more are in the categories inside it, with the way to see them", () => {
    setup({ beneath: 12 });

    expect(screen.getByText(/2 products\./i)).toBeInTheDocument();
    const more = screen.getByRole("link", { name: /12 more/i });
    expect(more).toHaveAttribute("href", "/admin/products?category=christmas-cards");
  });

  it("uses the singular for one more", () => {
    setup({ beneath: 1 });

    expect(screen.getByRole("link", { name: /1 more/i })).toBeInTheDocument();
  });

  it("says when there are none", () => {
    setup({ products: [item("p1", "Bonnet", false)] });

    expect(screen.getByText(/no products yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: /products in/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Choose products" })).toBeInTheDocument();
  });

  it("opens on the whole catalogue with what is in it ticked and first", async () => {
    const { user } = setup();

    await user.click(screen.getByRole("button", { name: "Change products" }));

    const dialog = screen.getByRole("dialog", { name: "Products in Christmas Cards" });
    const boxes = within(dialog).getAllByRole("checkbox");
    expect(boxes.map((box) => (box as HTMLInputElement).checked)).toEqual([true, true, false, false]);
    expect(boxes[0]).toHaveAccessibleName(expect.stringMatching(/holly card/i));
    expect(boxes[2]).toHaveAccessibleName(expect.stringMatching(/bonnet/i));
  });

  it("says where each is filed, which are not on the shop, and which are in nothing", async () => {
    const { user } = setup();

    await user.click(screen.getByRole("button", { name: "Change products" }));

    expect(screen.getByRole("checkbox", { name: /bonnet.*clothes › hats/i })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /draft card.*draft/i })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /unfiled brooch.*in no category/i })).toBeInTheDocument();
  });

  it("finds a piece by its code, its categories, or by being in none", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Change products" }));
    const search = screen.getByRole("searchbox");

    await user.type(search, "BR-7");
    expect(within(screen.getByRole("dialog")).getAllByRole("checkbox")).toHaveLength(1);

    await user.clear(search);
    await user.type(search, "hats");
    expect(screen.getByRole("checkbox", { name: /bonnet/i })).toBeInTheDocument();

    await user.clear(search);
    await user.type(search, "no category");
    expect(screen.getByRole("checkbox", { name: /unfiled brooch/i })).toBeInTheDocument();
    expect(within(screen.getByRole("dialog")).getAllByRole("checkbox")).toHaveLength(1);
  });

  it("saves what changed, shuts, and says what was done", async () => {
    const { user, save } = setup();
    await user.click(screen.getByRole("button", { name: "Change products" }));

    await user.click(screen.getByRole("checkbox", { name: /bonnet/i }));
    await user.click(screen.getByRole("checkbox", { name: /draft card/i }));
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(save).toHaveBeenCalledWith({ add: ["p1"], remove: ["p3"] });
    expect(await screen.findByRole("status")).toHaveTextContent("Added 1 product to Christmas Cards.");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("calling it off changes nothing", async () => {
    const { user, save } = setup();
    await user.click(screen.getByRole("button", { name: "Change products" }));

    await user.click(screen.getByRole("checkbox", { name: /bonnet/i }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(save).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("stays open with its ticks and says so when it could not be saved, to try again", async () => {
    const save = jest.fn(async () => ({ ok: false as const }));
    const { user } = setup({ save });
    await user.click(screen.getByRole("button", { name: "Change products" }));

    await user.click(screen.getByRole("checkbox", { name: /bonnet/i }));
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(await screen.findByRole("status")).toHaveTextContent(/could not be saved/i);
    expect(screen.getByRole("checkbox", { name: /bonnet/i })).toBeChecked();
    expect(screen.getByRole("button", { name: /save changes/i })).toBeEnabled();
  });

  it("does the same when the save fails outright, rather than sitting on Saving", async () => {
    const save = jest.fn(async () => { throw new Error("network"); });
    const { user } = setup({ save });
    await user.click(screen.getByRole("button", { name: "Change products" }));

    await user.click(screen.getByRole("checkbox", { name: /bonnet/i }));
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(await screen.findByRole("status")).toHaveTextContent(/could not be saved/i);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
