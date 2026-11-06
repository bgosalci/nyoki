import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ProductTable, type ProductRow } from "@/components/admin/product-table";
import { parseProductList, PRODUCT_LIST_KEY } from "@/lib/products/browse";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});

const rows: ProductRow[] = [
  {
    id: "p1",
    name: "Snowflake Card",
    status: "ACTIVE",
    pricePence: 600,
    stock: 3,
    madeToOrder: false,
    madeOnOrder: false,
    oneOfAKind: false,
    image: null,
    categories: ["Cards › Christmas Cards", "Gifts"],
    categoryIds: ["christmas", "gifts"],
  },
  { id: "p2", name: "Stocking Card", status: "DRAFT", pricePence: 500, stock: 0, madeToOrder: false, madeOnOrder: false, oneOfAKind: true, image: null, categories: [], categoryIds: [] },
  { id: "p3", name: "Bud Vase", status: "ARCHIVED", pricePence: 1800, stock: 1, madeToOrder: true, madeOnOrder: false, oneOfAKind: false, image: null, categories: ["Home"], categoryIds: ["home"] },
];

const categories = [
  { id: "cards", name: "Cards", parentId: null },
  { id: "christmas", name: "Christmas Cards", parentId: "cards" },
  { id: "gifts", name: "Gifts", parentId: null },
  { id: "home", name: "Home", parentId: null },
];

/** The page's own notices: not the region dragging announces itself through. */
const notices = () => screen.queryAllByRole("status").filter((element) => !element.id.startsWith("DndLiveRegion"));

function setup(overrides: Partial<React.ComponentProps<typeof ProductTable>> = {}) {
  const setStatus = jest.fn(async () => ({ unpriced: [] as string[] }));
  const remove = jest.fn(async () => {});
  const reprice = jest.fn(async () => {});
  const addToCategories = jest.fn(async () => ({ ok: true as const, said: ["Added 2 products to Gifts."] }));
  const removeFromCategories = jest.fn(async () => ({ ok: true as const, said: ["Took 1 product out of Gifts."] }));
  render(
    <ProductTable
      rows={rows}
      header={<h1>Products</h1>}
      setStatus={setStatus}
      remove={remove}
      reprice={reprice}
      move={jest.fn(async () => ({ ok: true }))}
      categories={categories}
      addToCategories={addToCategories}
      removeFromCategories={removeFromCategories}
      {...overrides}
    />,
  );
  return { setStatus, remove, reprice, addToCategories, removeFromCategories, user: userEvent.setup() };
}

describe("ProductTable", () => {
  it("remembers the list it shows, in its order and with its filters, for stepping through from a product", () => {
    window.history.pushState({}, "", "/admin/products?q=card");
    setup();

    const remembered = parseProductList(window.sessionStorage.getItem(PRODUCT_LIST_KEY));
    expect(remembered?.href).toBe("/admin/products?q=card");
    expect(remembered?.items).toEqual([
      { id: "p1", name: "Snowflake Card" },
      { id: "p2", name: "Stocking Card" },
      { id: "p3", name: "Bud Vase" },
    ]);
  });

  it("shows each piece's categories by their place in the tree", () => {
    setup();

    const snowflake = screen.getByRole("list", { name: "Categories of Snowflake Card" });
    expect(within(snowflake).getAllByRole("listitem").map((item) => item.textContent)).toEqual(["Cards › Christmas Cards", "Gifts"]);
    const vase = screen.getByRole("list", { name: "Categories of Bud Vase" });
    expect(within(vase).getAllByRole("listitem").map((item) => item.textContent)).toEqual(["Home"]);
  });

  it("shows the stock of a piece made on order, and that more is made when it runs out", () => {
    setup({ rows: [{ ...rows[0], id: "p4", name: "Holly Card", stock: 0, madeOnOrder: true }] });

    const row = screen.getByRole("link", { name: "Holly Card" }).closest("tr")!;
    const stock = row.querySelectorAll("td")[row.querySelectorAll("td").length - 1];
    expect(stock).toHaveTextContent(/^0\s*made on order$/);
  });

  it("shows made to order in place of the stock, since none is kept", () => {
    setup();

    const row = screen.getByRole("link", { name: "Bud Vase" }).closest("tr")!;
    const cells = row.querySelectorAll("td");
    expect(cells[cells.length - 1]).toHaveTextContent(/^made to order$/);
  });

  it("says when a piece is in no category, since the shop's category pages will not show it", () => {
    setup();

    expect(screen.queryByRole("list", { name: "Categories of Stocking Card" })).not.toBeInTheDocument();
    const stocking = screen.getByRole("link", { name: "Stocking Card" }).closest("td")!;
    expect(within(stocking).getByText("In no category")).toBeInTheDocument();
  });

  it("offers nothing to act on until something is chosen", () => {
    setup();

    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/selected/i)).not.toBeInTheDocument();
  });

  it("clears the selection in one go", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("checkbox", { name: /snowflake card/i }));
    await user.click(screen.getByRole("checkbox", { name: /bud vase/i }));

    await user.click(screen.getByRole("button", { name: /clear selection/i }));

    expect(screen.queryByText(/selected/i)).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /snowflake card/i })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: /bud vase/i })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: /select all/i })).not.toBeChecked();
  });

  it("opens a product from its photo as well as its name", () => {
    const { container } = render(
      <ProductTable
        rows={[{ ...rows[0], image: { url: "/uploads/snowflake.jpg", alt: null } }]}
        setStatus={jest.fn()}
        remove={jest.fn()}
        reprice={jest.fn()}
        move={jest.fn()}
        categories={categories}
        addToCategories={jest.fn()}
        removeFromCategories={jest.fn()}
      />,
    );

    const photo = container.querySelector('img[src*="snowflake"]')!;
    const link = photo.closest("a");
    expect(link).toHaveAttribute("href", "/admin/products/p1");
    // The name is the one link a keyboard or screen reader meets; the photo
    // is the same place again, for the mouse.
    expect(link).toHaveAttribute("tabindex", "-1");
    expect(link).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("link", { name: "Snowflake Card" })).toHaveAttribute("href", "/admin/products/p1");
  });

  it("counts what is chosen", async () => {
    const { user } = setup();

    await user.click(screen.getByRole("checkbox", { name: /snowflake card/i }));
    expect(screen.getByText(/1 selected/i)).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: /bud vase/i }));
    expect(screen.getByText(/2 selected/i)).toBeInTheDocument();
  });

  it("chooses and clears everything from the header", async () => {
    const { user } = setup();
    const all = screen.getByRole("checkbox", { name: /select all/i });

    await user.click(all);
    expect(screen.getByText(/3 selected/i)).toBeInTheDocument();

    await user.click(all);
    expect(screen.queryByText(/selected/i)).not.toBeInTheDocument();
  });

  it("changes the status of exactly what was chosen", async () => {
    const { user, setStatus } = setup();

    await user.click(screen.getByRole("checkbox", { name: /stocking card/i }));
    await user.click(screen.getByRole("button", { name: /make active/i }));

    expect(setStatus).toHaveBeenCalledWith(["p2"], "ACTIVE");
  });

  it("archives rather than deletes when asked to archive", async () => {
    const { user, setStatus } = setup();

    await user.click(screen.getByRole("checkbox", { name: /select all/i }));
    await user.click(screen.getByRole("button", { name: /archive/i }));

    expect(setStatus).toHaveBeenCalledWith(["p1", "p2", "p3"], "ARCHIVED");
  });

  it("asks before deleting, and says how many and that it cannot be undone", async () => {
    const { user, remove } = setup();

    await user.click(screen.getByRole("checkbox", { name: /snowflake card/i }));
    await user.click(screen.getByRole("checkbox", { name: /bud vase/i }));
    await user.click(screen.getByRole("button", { name: /^delete/i }));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent(/2 products/i);
    expect(dialog).toHaveTextContent(/cannot be undone/i);
    expect(remove).not.toHaveBeenCalled();
  });

  it("deletes only once confirmed", async () => {
    const { user, remove } = setup();

    await user.click(screen.getByRole("checkbox", { name: /snowflake card/i }));
    await user.click(screen.getByRole("button", { name: /^delete/i }));
    await user.click(screen.getByRole("button", { name: /delete 1 product/i }));

    expect(remove).toHaveBeenCalledWith(["p1"]);
  });

  it("leaves the selection alone when the deletion is called off", async () => {
    const { user, remove } = setup();

    await user.click(screen.getByRole("checkbox", { name: /snowflake card/i }));
    await user.click(screen.getByRole("button", { name: /^delete/i }));
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(remove).not.toHaveBeenCalled();
    expect(screen.getByText(/1 selected/i)).toBeInTheDocument();
  });

  it("changes the price of what is chosen, once the change has been previewed", async () => {
    // With pricing on each product's own tab, this list is where a price
    // changes across many pieces at once.
    const { user, reprice } = setup();

    await user.click(screen.getByRole("checkbox", { name: /snowflake card/i }));
    await user.click(screen.getByRole("checkbox", { name: /bud vase/i }));
    await user.click(screen.getByRole("button", { name: /change price/i }));
    await user.type(screen.getByLabelText(/by how much/i), "10");
    expect(reprice).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /change 2 prices/i }));

    expect(reprice).toHaveBeenCalledWith(["p1", "p3"], { mode: "INCREASE", unit: "PERCENT", value: "10", rounding: "EXACT" });
  });

  it("adds what is chosen to a category, through a dialog that says how many", async () => {
    const { user, addToCategories } = setup();

    await user.click(screen.getByRole("checkbox", { name: /snowflake card/i }));
    await user.click(screen.getByRole("checkbox", { name: /stocking card/i }));
    await user.click(screen.getByRole("button", { name: "Add to category" }));

    const dialog = screen.getByRole("dialog", { name: "Add 2 products to a category" });
    await user.click(within(dialog).getByRole("checkbox", { name: /home/i }));
    expect(addToCategories).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "Add 2 products" }));

    expect(addToCategories).toHaveBeenCalledWith(["p1", "p2"], ["home"]);
  });

  it("says what was done, shuts the dialog and clears the selection", async () => {
    const { user } = setup();

    await user.click(screen.getByRole("checkbox", { name: /stocking card/i }));
    await user.click(screen.getByRole("button", { name: "Add to category" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("checkbox", { name: /gifts/i }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Add 1 product" }));

    await screen.findByText("Added 2 products to Gifts.");
    expect(notices()).toHaveLength(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText(/selected/i)).not.toBeInTheDocument();
  });

  it("takes the notice away once something else is chosen", async () => {
    const { user } = setup();

    await user.click(screen.getByRole("checkbox", { name: /stocking card/i }));
    await user.click(screen.getByRole("button", { name: "Add to category" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("checkbox", { name: /gifts/i }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Add 1 product" }));
    await screen.findByText("Added 2 products to Gifts.");

    await user.click(screen.getByRole("checkbox", { name: /bud vase/i }));

    expect(screen.queryByText("Added 2 products to Gifts.")).not.toBeInTheDocument();
  });

  it("offers only the categories the chosen pieces are in when taking them out", async () => {
    const { user, removeFromCategories } = setup();

    await user.click(screen.getByRole("checkbox", { name: /snowflake card/i }));
    await user.click(screen.getByRole("button", { name: "Remove from category" }));

    const dialog = screen.getByRole("dialog", { name: "Remove 1 product from a category" });
    expect(within(dialog).queryByRole("checkbox", { name: /home/i })).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole("checkbox", { name: /gifts/i }));
    await user.click(within(dialog).getByRole("button", { name: "Remove 1 product" }));

    expect(removeFromCategories).toHaveBeenCalledWith(["p1"], ["gifts"]);
  });

  it("does not offer to take out of a category what is in none", async () => {
    const { user } = setup();

    await user.click(screen.getByRole("checkbox", { name: /stocking card/i }));

    expect(screen.getByRole("button", { name: "Add to category" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove from category" })).not.toBeInTheDocument();
  });

  it("keeps the selection and says so when a category change cannot be saved", async () => {
    const addToCategories = jest.fn(async () => ({ ok: false as const }));
    const { user } = setup({ addToCategories });

    await user.click(screen.getByRole("checkbox", { name: /stocking card/i }));
    await user.click(screen.getByRole("button", { name: "Add to category" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("checkbox", { name: /gifts/i }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Add 1 product" }));

    await screen.findByText(/could not be saved/i);
    expect(screen.getByText(/1 selected/i)).toBeInTheDocument();
  });

  it("says so when a category change fails outright", async () => {
    const addToCategories = jest.fn(async () => { throw new Error("network"); });
    const { user } = setup({ addToCategories });

    await user.click(screen.getByRole("checkbox", { name: /stocking card/i }));
    await user.click(screen.getByRole("button", { name: "Add to category" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("checkbox", { name: /gifts/i }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Add 1 product" }));

    await screen.findByText(/could not be saved/i);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("says which pieces it could not put on the shop, and why", async () => {
    const setStatus = jest.fn(async () => ({ unpriced: ["Stocking Card"] }));
    const { user } = setup({ setStatus });

    await user.click(screen.getByRole("checkbox", { name: /select all/i }));
    await user.click(screen.getByRole("button", { name: /make active/i }));

    await screen.findByText(/stocking card/i, { selector: "[role=status]" });
    const [notice] = notices();
    expect(notice).toHaveTextContent("Stocking Card");
    expect(notice).toHaveTextContent(/price tab/i);
  });

  it("says nothing when everything asked for was done", async () => {
    const { user } = setup();

    await user.click(screen.getByRole("checkbox", { name: /stocking card/i }));
    await user.click(screen.getByRole("button", { name: /make active/i }));

    expect(notices()).toEqual([]);
  });

  it("pins the bulk actions with the header, so they do not scroll away from the rows they act on", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("checkbox", { name: /snowflake card/i }));

    // Inside the pinned block, its measured height already covers the bar and
    // the column headers settle beneath it. No second sticky layer to keep in
    // step with the first.
    const pinned = screen.getByRole("heading", { name: "Products" }).closest(".sticky");
    expect(pinned).toContainElement(screen.getByRole("button", { name: /make active/i }));
  });

  it("renders the page's own header above the table", () => {
    setup();

    expect(screen.getByRole("heading", { name: "Products" })).toBeInTheDocument();
  });

  it("still lists every product with its price and status", () => {
    setup();

    const table = screen.getByRole("table");
    expect(within(table).getByText("Snowflake Card")).toBeInTheDocument();
    expect(within(table).getByText("£18.00")).toBeInTheDocument();
    expect(within(table).getAllByText("Archived").length).toBeGreaterThan(0);
  });
});

describe("ProductTable, on a phone", () => {
  // At 375px the table was 511px wide: the page scrolled sideways and Price
  // and Stock started off the screen. It cannot be put in a scrolling box,
  // which its pinned column headers would stick to instead of the page.
  const rowOf = (name: string) => screen.getByRole("checkbox", { name }).closest("tr")!;

  it("pins only the bulk bar while something is chosen, or the block would fill the screen and hide the rows", async () => {
    // At 375x812 the header and the bar together left 28px for the rows, and
    // the next piece to tick could not be seen. From md up there is room for both.
    const { user } = setup();
    const heading = screen.getByRole("heading", { name: "Products" });
    expect(heading.closest(".hidden")).toBeNull();

    await user.click(screen.getByRole("checkbox", { name: /snowflake card/i }));
    expect(heading.closest(".hidden")).toHaveClass("md:block");
    expect(screen.getByRole("button", { name: "Add to category" }).closest(".hidden")).toBeNull();

    await user.click(screen.getByRole("button", { name: /clear selection/i }));
    expect(heading.closest(".hidden")).toBeNull();
  });

  it("draws the photo half size until there is room for the large one", () => {
    setup({ rows: [{ ...rows[0], image: { url: "/uploads/card.jpg", alt: null } }] });

    expect(rowOf("Snowflake Card").querySelector("img")).toHaveClass("size-14", "sm:size-28");
  });

  it("says the status under the name, in place of a column of its own", () => {
    setup();

    expect(screen.getByRole("columnheader", { name: "Status" })).toHaveClass("hidden", "sm:table-cell");
    const vase = rowOf("Bud Vase");
    const [nameCell, statusCell] = [within(vase).getByRole("link", { name: "Bud Vase" }).closest("td")!, within(vase).getAllByRole("cell")[4]];
    expect(within(nameCell).getByText("Archived")).toHaveClass("sm:hidden");
    expect(statusCell).toHaveTextContent("Archived");
    expect(statusCell).toHaveClass("hidden", "sm:table-cell");
  });

  it("sets the columns closer together, and keeps the handle a finger reorders by", () => {
    setup();

    for (const header of screen.getAllByRole("columnheader")) expect(header).toHaveClass("pr-2", "sm:pr-4");
    expect(within(rowOf("Snowflake Card")).getByRole("button", { name: "Move Snowflake Card" })).toBeInTheDocument();
  });
});
