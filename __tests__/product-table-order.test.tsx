import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ProductTable, type ProductRow } from "@/components/admin/product-table";

const row = (id: string, name: string, status: ProductRow["status"]): ProductRow => ({
  id,
  name,
  status,
  pricePence: 500,
  stock: 1,
  madeToOrder: false,
  oneOfAKind: false,
  image: null,
});

// As the page sends them: drafts first, then active, each in the set order.
const rows = [
  row("d", "Draft Card", "DRAFT"),
  row("a", "Angel Card", "ACTIVE"),
  row("b", "Bauble Card", "ACTIVE"),
  row("c", "Comet Card", "ACTIVE"),
];

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  Element.prototype.scrollIntoView = function () {};
  // jsdom lays nothing out. Give each row of the table a place, one under
  // another, so dragging with the keyboard can find the row above or below.
  jest.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    const tr = this.closest("tbody > tr");
    const index = tr ? [...tr.parentElement!.children].indexOf(tr) : -1;
    const top = index >= 0 ? 100 + index * 60 : 0;
    const height = index >= 0 ? 60 : 0;
    const width = index >= 0 ? 800 : 0;
    return { x: 0, y: top, top, left: 0, right: width, bottom: top + height, width, height, toJSON: () => ({}) } as DOMRect;
  });
});

function setup(move = jest.fn(async () => ({ ok: true }))) {
  render(
    <ProductTable
      rows={rows}
      header={<h1>Products</h1>}
      setStatus={jest.fn(async () => ({ unpriced: [] }))}
      remove={jest.fn(async () => {})}
      reprice={jest.fn(async () => {})}
      move={move}
    />,
  );
  return { move, user: userEvent.setup() };
}

/** The page's own notices: not the region dragging announces itself through. */
const notices = () => screen.queryAllByRole("status").filter((element) => !element.id.startsWith("DndLiveRegion"));

const names = () => within(screen.getAllByRole("rowgroup")[1]).getAllByRole("link").filter((link) => link.textContent).map((link) => link.textContent);

/** Picks a piece up by its handle, moves it with the arrow keys, and drops it. */
async function drag(user: ReturnType<typeof userEvent.setup>, name: string, keys: string) {
  screen.getByRole("button", { name: `Move ${name}` }).focus();
  await user.keyboard("[Space]");
  await user.keyboard(keys);
  await user.keyboard("[Space]");
  await act(async () => {});
}

describe("ProductTable ordering", () => {
  it("gives each piece a handle to drag it by, named for the piece", () => {
    setup();

    for (const name of ["Draft Card", "Angel Card", "Bauble Card", "Comet Card"]) {
      expect(screen.getByRole("button", { name: `Move ${name}` })).toBeInTheDocument();
    }
  });

  it("explains how to move a piece without a mouse", () => {
    setup();

    const handle = screen.getByRole("button", { name: "Move Angel Card" });
    const instructions = document.getElementById(handle.getAttribute("aria-describedby")!);
    expect(instructions).toHaveTextContent(/space.*arrow keys.*escape/i);
  });

  it("moves a piece up, shows it there at once, and saves where it was dropped", async () => {
    const { move, user } = setup();

    await drag(user, "Comet Card", "{ArrowUp}");

    expect(move).toHaveBeenCalledWith("c", "b", "before");
    expect(names()).toEqual(["Draft Card", "Angel Card", "Comet Card", "Bauble Card"]);
  });

  it("moves a piece down", async () => {
    const { move, user } = setup();

    await drag(user, "Angel Card", "{ArrowDown}{ArrowDown}");

    expect(move).toHaveBeenCalledWith("a", "c", "after");
  });

  it("keeps drafts apart from active pieces, as the list does", async () => {
    const { move, user } = setup();

    await drag(user, "Draft Card", "{ArrowDown}");

    expect(move).not.toHaveBeenCalled();
    expect(names()).toEqual(["Draft Card", "Angel Card", "Bauble Card", "Comet Card"]);
  });

  it("puts the list back, and says so, when the move cannot be saved", async () => {
    const { user } = setup(jest.fn(async () => ({ ok: false })));

    await drag(user, "Comet Card", "{ArrowUp}");

    await screen.findByText(/could not be saved/i);
    expect(notices()).toHaveLength(1);
    expect(notices()[0]).toHaveTextContent(/could not be saved/i);
    expect(names()).toEqual(["Draft Card", "Angel Card", "Bauble Card", "Comet Card"]);
  });
});
