import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CategoryTable, type CategoryTableRow } from "@/components/admin/category-table";

const row = (id: string, name: string, parentId: string | null = null): CategoryTableRow => ({
  id,
  parentId,
  name,
  slug: id,
  productCount: 1,
  active: true,
});

// As the page sends them, in the shop's order: Cards (Birthday and
// Christmas inside), Clothes (Dresses inside), then Gifts.
const categories = [
  row("cards", "Cards"),
  row("birthday", "Birthday Card", "cards"),
  row("christmas", "Christmas Cards", "cards"),
  row("clothes", "Clothes"),
  row("dresses", "Dresses", "clothes"),
  row("gifts", "Gifts"),
];

const ROW_TOP = 100;
const ROW_HEIGHT = 60;

beforeAll(() => {
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

beforeEach(() => window.localStorage.clear());

function setup(move = jest.fn(async (_id: string, _target: string, _place: string) => ({ ok: true }))) {
  render(<CategoryTable categories={categories} move={move} />);
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

describe("CategoryTable ordering", () => {
  it("gives each category a handle, named for it, that says how to move it without a mouse", () => {
    setup();

    for (const name of ["Cards", "Birthday Card", "Gifts"]) expect(handle(name)).toBeInTheDocument();
    const instructions = document.getElementById(handle("Gifts").getAttribute("aria-describedby")!);
    expect(instructions).toHaveTextContent(/space.*arrow keys.*escape/i);
  });

  it("tells the page how to change the order, and that it is the shop's", () => {
    setup();

    expect(screen.getByText(/drag a category to change its place on the shop/i)).toBeInTheDocument();
  });

  describe("with the mouse", () => {
    it("drags a row from anywhere on it and saves where it was dropped", async () => {
      const { move, user } = setup();

      await dragRow(user, "Gifts", 3);

      expect(move).toHaveBeenCalledWith("gifts", "clothes", "before");
      expect(names()).toEqual(["Cards", "Birthday Card", "Christmas Cards", "Gifts", "Clothes", "Dresses"]);
    });

    it("moves a group with everything inside it", async () => {
      // Picked up, Cards folds its types away beneath it, so it is one row
      // among the groups while it moves.
      const { move, user } = setup();

      await dragRow(user, "Cards", 1);

      expect(move).toHaveBeenCalledWith("cards", "clothes", "after");
      expect(names()).toEqual(["Clothes", "Dresses", "Cards", "Birthday Card", "Christmas Cards", "Gifts"]);
    });

    it("puts a group dropped among another group's types as near to there as its own level allows", async () => {
      const { move, user } = setup();

      await dragRow(user, "Gifts", 2);

      expect(move).toHaveBeenCalledWith("gifts", "cards", "after");
      expect(names()).toEqual(["Cards", "Birthday Card", "Christmas Cards", "Gifts", "Clothes", "Dresses"]);
    });

    it("keeps a type within its own group", async () => {
      const { move, user } = setup();

      await dragRow(user, "Birthday Card", 4);

      expect(move).toHaveBeenCalledWith("birthday", "christmas", "after");
      expect(names()).toEqual(["Cards", "Christmas Cards", "Birthday Card", "Clothes", "Dresses", "Gifts"]);
    });

    it("never leaves a group folded by a drag let go of before it had properly begun", async () => {
      // A press, a flick and a release in one moment - as a quick hand or a
      // test tool can manage - and dnd-kit ends the drag without a drop.
      const { move } = setup();
      const at = { bubbles: true, isPrimary: true, button: 0, clientX: 400 };

      act(() => {
        rowOf("Cards").dispatchEvent(new PointerEvent("pointerdown", { ...at, clientY: centre(0) }));
        document.dispatchEvent(new PointerEvent("pointermove", { ...at, clientY: centre(0) + 40 }));
        document.dispatchEvent(new PointerEvent("pointerup", { ...at, clientY: centre(0) + 40 }));
      });
      await act(async () => {});

      expect(names()).toEqual(["Cards", "Birthday Card", "Christmas Cards", "Clothes", "Dresses", "Gifts"]);
      expect(screen.queryByText(/hidden/)).not.toBeInTheDocument();
      expect(move).not.toHaveBeenCalled();
    });

    it("does nothing for a category dropped where it already was", async () => {
      const { move, user } = setup();

      await dragRow(user, "Gifts", 4);

      expect(move).not.toHaveBeenCalled();
      expect(names()).toEqual(["Cards", "Birthday Card", "Christmas Cards", "Clothes", "Dresses", "Gifts"]);
    });
  });

  describe("with the keyboard", () => {
    it("picks a category up, moves it one place among its siblings per arrow, with what is inside it", async () => {
      const { move, user } = setup();

      handle("Clothes").focus();
      await user.keyboard("[Space]{ArrowUp}");
      expect(names()).toEqual(["Clothes", "Dresses", "Cards", "Birthday Card", "Christmas Cards", "Gifts"]);
      expect(handle("Clothes")).toHaveFocus();
      await user.keyboard("[Space]");
      await act(async () => {});

      expect(move).toHaveBeenCalledTimes(1);
      expect(move).toHaveBeenCalledWith("clothes", "cards", "before");
    });

    it("saves a category moved down by the one now above it", async () => {
      const { move, user } = setup();

      handle("Cards").focus();
      await user.keyboard("[Space]{ArrowDown}[Enter]");
      await act(async () => {});

      expect(move).toHaveBeenCalledWith("cards", "clothes", "after");
    });

    it("says where the category is as it moves", async () => {
      const { user } = setup();

      handle("Gifts").focus();
      await user.keyboard("[Space]");
      expect(screen.getByTestId("category-order-announcer")).toHaveTextContent(/picked up gifts/i);
      await user.keyboard("{ArrowUp}");
      expect(screen.getByTestId("category-order-announcer")).toHaveTextContent(/gifts.*2 of 3/i);
    });

    it("keeps a type within its own group", async () => {
      const { user } = setup();

      handle("Christmas Cards").focus();
      await user.keyboard("[Space]{ArrowDown}");

      expect(names()).toEqual(["Cards", "Birthday Card", "Christmas Cards", "Clothes", "Dresses", "Gifts"]);
      expect(screen.getByTestId("category-order-announcer")).toHaveTextContent(/already last/i);
    });

    it("puts everything back on Escape, and saves nothing", async () => {
      const { move, user } = setup();

      handle("Gifts").focus();
      await user.keyboard("[Space]{ArrowUp}{ArrowUp}{Escape}");
      await act(async () => {});

      expect(names()).toEqual(["Cards", "Birthday Card", "Christmas Cards", "Clothes", "Dresses", "Gifts"]);
      expect(move).not.toHaveBeenCalled();
    });

    it("saves nothing for a category put down where it was picked up", async () => {
      const { move, user } = setup();

      handle("Clothes").focus();
      await user.keyboard("[Space]{ArrowUp}{ArrowDown}[Space]");
      await act(async () => {});

      expect(move).not.toHaveBeenCalled();
    });
  });

  it("puts the list back, and says so, when the move cannot be saved", async () => {
    const { user } = setup(jest.fn(async (_id: string, _target: string, _place: string) => ({ ok: false })));

    handle("Gifts").focus();
    await user.keyboard("[Space]{ArrowUp}[Space]");

    await screen.findByText(/could not be saved/i);
    expect(notices()).toHaveLength(1);
    expect(names()).toEqual(["Cards", "Birthday Card", "Christmas Cards", "Clothes", "Dresses", "Gifts"]);
  });
});
