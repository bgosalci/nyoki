import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ProductTable, type ProductRow } from "@/components/admin/product-table";
import { parseProductList, PRODUCT_LIST_KEY } from "@/lib/products/browse";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});

const rows: ProductRow[] = [
  { id: "p1", name: "Snowflake Card", status: "ACTIVE", pricePence: 600, stock: 3, madeToOrder: false, oneOfAKind: false, image: null },
  { id: "p2", name: "Stocking Card", status: "DRAFT", pricePence: 500, stock: 0, madeToOrder: false, oneOfAKind: true, image: null },
  { id: "p3", name: "Bud Vase", status: "ARCHIVED", pricePence: 1800, stock: 1, madeToOrder: true, oneOfAKind: false, image: null },
];

function setup(overrides: Partial<React.ComponentProps<typeof ProductTable>> = {}) {
  const setStatus = jest.fn(async () => ({ unpriced: [] as string[] }));
  const remove = jest.fn(async () => {});
  const reprice = jest.fn(async () => {});
  render(
    <ProductTable
      rows={rows}
      header={<h1>Products</h1>}
      setStatus={setStatus}
      remove={remove}
      reprice={reprice}
      {...overrides}
    />,
  );
  return { setStatus, remove, reprice, user: userEvent.setup() };
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

  it("says which pieces it could not put on the shop, and why", async () => {
    const setStatus = jest.fn(async () => ({ unpriced: ["Stocking Card"] }));
    const { user } = setup({ setStatus });

    await user.click(screen.getByRole("checkbox", { name: /select all/i }));
    await user.click(screen.getByRole("button", { name: /make active/i }));

    const notice = await screen.findByRole("status");
    expect(notice).toHaveTextContent("Stocking Card");
    expect(notice).toHaveTextContent(/price tab/i);
  });

  it("says nothing when everything asked for was done", async () => {
    const { user } = setup();

    await user.click(screen.getByRole("checkbox", { name: /stocking card/i }));
    await user.click(screen.getByRole("button", { name: /make active/i }));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
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
    expect(within(table).getByText("Archived")).toBeInTheDocument();
  });
});
