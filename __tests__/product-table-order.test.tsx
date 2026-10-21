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
  row("d1", "Draft One", "DRAFT"),
  row("d2", "Draft Two", "DRAFT"),
  row("a", "Angel Card", "ACTIVE"),
  row("b", "Bauble Card", "ACTIVE"),
  row("c", "Comet Card", "ACTIVE"),
];

const ROW_TOP = 100;
const ROW_HEIGHT = 60;

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  Element.prototype.scrollIntoView = function () {};
  // jsdom has no PointerEvent, which dragging with the mouse listens for.
  if (!("PointerEvent" in window)) {
    class PointerEventPolyfill extends MouseEvent {
      pointerId: number;
      isPrimary: boolean;
      pointerType: string;
      constructor(type: string, init: PointerEventInit = {}) {
        super(type, init);
        this.pointerId = init.pointerId ?? 1;
        this.isPrimary = init.isPrimary ?? true;
        this.pointerType = init.pointerType ?? "mouse";
      }
    }
    Object.assign(window, { PointerEvent: PointerEventPolyfill });
  }
  // jsdom lays nothing out. Give each row of the table a place, one under
  // another, so a drag can tell which row it is over.
  jest.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    const tr = this.closest("tbody > tr");
    const index = tr ? [...tr.parentElement!.children].indexOf(tr) : -1;
    const top = index >= 0 ? ROW_TOP + index * ROW_HEIGHT : 0;
    const height = index >= 0 ? ROW_HEIGHT : 0;
    const width = index >= 0 ? 800 : 0;
    return { x: 0, y: top, top, left: 0, right: width, bottom: top + height, width, height, toJSON: () => ({}) } as DOMRect;
  });
});

function setup(move = jest.fn(async (_id: string, _target: string, _place: string) => ({ ok: true }))) {
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

const names = () =>
  within(screen.getAllByRole("rowgroup")[1])
    .getAllByRole("link")
    .map((link) => link.textContent);

/** The page's own notices: not the region dragging announces itself through. */
const notices = () => screen.queryAllByRole("status").filter((element) => !element.id.startsWith("DndLiveRegion"));

const handle = (name: string) => screen.getByRole("button", { name: `Move ${name}` });
const rowOf = (name: string) => screen.getByRole("link", { name }).closest("tr")!;
const centre = (index: number) => ROW_TOP + index * ROW_HEIGHT + ROW_HEIGHT / 2;

/** Presses on a row - anywhere on it - and drags it to another row's place, in steps, as a hand does. */
async function dragRow(user: ReturnType<typeof userEvent.setup>, name: string, toIndex: number) {
  const from = names().indexOf(name);
  const steps = [0.25, 0.5, 0.75, 1].map((part) => ({
    coords: { clientX: 400, clientY: centre(from) + (centre(toIndex) - centre(from)) * part },
  }));
  await user.pointer([
    { keys: "[MouseLeft>]", target: rowOf(name), coords: { clientX: 400, clientY: centre(from) } },
    ...steps,
    { keys: "[/MouseLeft]" },
  ]);
  await act(async () => {});
}

describe("ProductTable ordering", () => {
  it("gives each piece a handle, named for the piece, that says how to move it without a mouse", () => {
    setup();

    for (const name of ["Draft One", "Angel Card", "Comet Card"]) expect(handle(name)).toBeInTheDocument();
    const instructions = document.getElementById(handle("Angel Card").getAttribute("aria-describedby")!);
    expect(instructions).toHaveTextContent(/space.*arrow keys.*escape/i);
  });

  it("tells the page how to change the order", () => {
    setup();

    expect(screen.getByText(/drag a row to change its place on the shop/i)).toBeInTheDocument();
  });

  describe("with the mouse", () => {
    it("drags a row from anywhere on it, not only its handle, and saves where it was dropped", async () => {
      const { move, user } = setup();

      await dragRow(user, "Comet Card", 3);

      expect(move).toHaveBeenCalledWith("c", "b", "before");
      expect(names()).toEqual(["Draft One", "Draft Two", "Angel Card", "Comet Card", "Bauble Card"]);
    });

    it("puts a piece dropped among another status's rows at the nearest end of its own", async () => {
      // In the whole list the drafts sit at the top: dragging an active piece
      // up there means "first of the active ones", not "refuse".
      const { move, user } = setup();

      await dragRow(user, "Bauble Card", 0);

      expect(move).toHaveBeenCalledWith("b", "a", "before");
      expect(names()).toEqual(["Draft One", "Draft Two", "Bauble Card", "Angel Card", "Comet Card"]);
    });

    it("does nothing for a piece dropped where it already was", async () => {
      const { move, user } = setup();

      await dragRow(user, "Angel Card", 1);

      expect(move).not.toHaveBeenCalled();
    });
  });

  describe("with the keyboard", () => {
    it("picks a piece up, moves it one place per arrow, and puts it down where it is", async () => {
      const { move, user } = setup();

      handle("Comet Card").focus();
      await user.keyboard("[Space]");
      await user.keyboard("{ArrowUp}");
      expect(names()).toEqual(["Draft One", "Draft Two", "Angel Card", "Comet Card", "Bauble Card"]);
      expect(handle("Comet Card")).toHaveFocus();
      await user.keyboard("{ArrowUp}");
      await user.keyboard("[Space]");
      await act(async () => {});

      expect(names()).toEqual(["Draft One", "Draft Two", "Comet Card", "Angel Card", "Bauble Card"]);
      expect(move).toHaveBeenCalledTimes(1);
      expect(move).toHaveBeenCalledWith("c", "a", "before");
    });

    it("saves a piece moved down by the one now above it", async () => {
      const { move, user } = setup();

      handle("Angel Card").focus();
      await user.keyboard("[Space]{ArrowDown}[Enter]");
      await act(async () => {});

      expect(move).toHaveBeenCalledWith("a", "b", "after");
    });

    it("says where the piece is as it moves", async () => {
      const { user } = setup();

      handle("Comet Card").focus();
      await user.keyboard("[Space]");
      expect(screen.getByTestId("order-announcer")).toHaveTextContent(/picked up comet card/i);
      await user.keyboard("{ArrowUp}");
      expect(screen.getByTestId("order-announcer")).toHaveTextContent(/comet card.*2 of 3/i);
    });

    it("keeps a piece within its own status", async () => {
      const { user } = setup();

      handle("Angel Card").focus();
      await user.keyboard("[Space]{ArrowUp}");

      expect(names()).toEqual(["Draft One", "Draft Two", "Angel Card", "Bauble Card", "Comet Card"]);
      expect(screen.getByTestId("order-announcer")).toHaveTextContent(/already first/i);
    });

    it("puts everything back on Escape, and saves nothing", async () => {
      const { move, user } = setup();

      handle("Comet Card").focus();
      await user.keyboard("[Space]{ArrowUp}{ArrowUp}{Escape}");
      await act(async () => {});

      expect(names()).toEqual(["Draft One", "Draft Two", "Angel Card", "Bauble Card", "Comet Card"]);
      expect(move).not.toHaveBeenCalled();
    });

    it("saves nothing for a piece put down where it was picked up", async () => {
      const { move, user } = setup();

      handle("Bauble Card").focus();
      await user.keyboard("[Space]{ArrowUp}{ArrowDown}[Space]");
      await act(async () => {});

      expect(move).not.toHaveBeenCalled();
    });
  });

  it("puts the list back, and says so, when the move cannot be saved", async () => {
    const { user } = setup(jest.fn(async (_id: string, _target: string, _place: string) => ({ ok: false })));

    handle("Comet Card").focus();
    await user.keyboard("[Space]{ArrowUp}[Space]");

    await screen.findByText(/could not be saved/i);
    expect(notices()).toHaveLength(1);
    expect(names()).toEqual(["Draft One", "Draft Two", "Angel Card", "Bauble Card", "Comet Card"]);
  });
});
