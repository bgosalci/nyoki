import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { ChooserItem } from "@/components/admin/photo-chooser";
import { PhotoMultiChooser } from "@/components/admin/photo-multi-chooser";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});

const items: ChooserItem[] = [
  { id: "a", title: "Holly Card", details: ["Cards › Christmas Cards"], imageUrl: "/a.jpg", searchText: "cards christmas" },
  { id: "b", title: "Snow Card", details: ["Cards › Christmas Cards"], imageUrl: "/b.jpg", searchText: "cards christmas" },
  { id: "c", title: "Pink Booties", details: ["Clothes"], imageUrl: null, searchText: "clothes mohair" },
];

function setup(overrides: Partial<React.ComponentProps<typeof PhotoMultiChooser>> = {}) {
  const onSave = jest.fn(async () => {});
  const onCancel = jest.fn();
  const props = { open: true, title: "Products in Gifts", items, chosen: ["a"], onSave, onCancel, ...overrides };
  const view = render(<PhotoMultiChooser {...props} />);
  return { ...props, view, user: userEvent.setup() };
}

describe("PhotoMultiChooser", () => {
  it("stays shut until asked", () => {
    setup({ open: false });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows every item by its photo and its name, ticked if it is chosen", () => {
    setup();

    const dialog = screen.getByRole("dialog", { name: "Products in Gifts" });
    const boxes = within(dialog).getAllByRole("checkbox");
    expect(boxes).toHaveLength(3);
    expect(screen.getByRole("checkbox", { name: /holly card/i })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /snow card/i })).not.toBeChecked();
  });

  it("loads its photos lazily, which is what makes showing them all cheap", () => {
    setup();

    const photo = screen.getByRole("dialog").querySelector("img")!;
    expect(photo).toHaveAttribute("loading", "lazy");
  });

  it("hands back what changed, not the whole set, so a piece filed elsewhere meanwhile is left alone", async () => {
    const { user, onSave } = setup();

    await user.click(screen.getByRole("checkbox", { name: /holly card/i }));
    await user.click(screen.getByRole("checkbox", { name: /snow card/i }));
    await user.click(screen.getByRole("checkbox", { name: /booties/i }));
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(onSave).toHaveBeenCalledWith({ added: ["b", "c"], removed: ["a"] });
  });

  it("says what a save will do as it is ticked", async () => {
    const { user } = setup();

    expect(screen.getByText(/nothing changed yet/i)).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: /snow card/i }));
    expect(screen.getByText("1 to add")).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: /holly card/i }));
    expect(screen.getByText("1 to add, 1 to take out")).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: /snow card/i }));
    expect(screen.getByText("1 to take out")).toBeInTheDocument();
  });

  it("ticked and unticked again is no change", async () => {
    const { user, onSave, onCancel } = setup();

    await user.click(screen.getByRole("checkbox", { name: /snow card/i }));
    await user.click(screen.getByRole("checkbox", { name: /snow card/i }));
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(onSave).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("narrows by every word typed, in any order, against all it knows", async () => {
    const { user } = setup();

    await user.type(screen.getByRole("searchbox"), "mohair clothes");

    expect(within(screen.getByRole("dialog")).getAllByRole("checkbox")).toHaveLength(1);
    expect(screen.getByRole("checkbox", { name: /booties/i })).toBeInTheDocument();
  });

  it("keeps a tick that has been filtered out of view", async () => {
    const { user, onSave } = setup();

    await user.click(screen.getByRole("checkbox", { name: /snow card/i }));
    await user.type(screen.getByRole("searchbox"), "booties");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(onSave).toHaveBeenCalledWith({ added: ["b"], removed: [] });
  });

  it("selects and clears what the search found, and nothing else", async () => {
    const { user, onSave } = setup({ chosen: [] });

    await user.click(screen.getByRole("checkbox", { name: /booties/i }));
    await user.type(screen.getByRole("searchbox"), "christmas");
    await user.click(screen.getByRole("button", { name: "Select these 2" }));
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(onSave).toHaveBeenCalledWith({ added: ["a", "b", "c"], removed: [] });
  });

  it("clears the ones it found", async () => {
    const { user, onSave } = setup({ chosen: ["a", "b", "c"] });

    await user.type(screen.getByRole("searchbox"), "christmas");
    await user.click(screen.getByRole("button", { name: "Clear these 2" }));
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(onSave).toHaveBeenCalledWith({ added: [], removed: ["a", "b"] });
  });

  it("offers all of them when nothing is typed", async () => {
    const { user, onSave } = setup({ chosen: ["a"] });

    await user.click(screen.getByRole("button", { name: "Select all 3" }));
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(onSave).toHaveBeenCalledWith({ added: ["b", "c"], removed: [] });
  });

  it("does not save when Enter is pressed in the search", async () => {
    const { user, onSave } = setup();

    await user.click(screen.getByRole("checkbox", { name: /snow card/i }));
    await user.type(screen.getByRole("searchbox"), "holly{Enter}");

    expect(onSave).not.toHaveBeenCalled();
  });

  it("says when nothing matches", async () => {
    const { user } = setup();

    await user.type(screen.getByRole("searchbox"), "zebra");

    expect(screen.getByText(/nothing matches/i)).toBeInTheDocument();
  });

  it("shows it is saving, and takes no second press", async () => {
    let finish = () => {};
    const onSave = jest.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    const { user } = setup({ onSave });

    await user.click(screen.getByRole("checkbox", { name: /snow card/i }));
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    const saving = screen.getByRole("button", { name: /saving/i });
    expect(saving).toBeDisabled();
    await user.click(saving);
    expect(onSave).toHaveBeenCalledTimes(1);
    finish();
    await screen.findByRole("button", { name: /save changes/i });
  });

  it("Escape does not throw ticks away; Cancel, pressed on purpose, does", async () => {
    const { user, onCancel } = setup();

    await user.click(screen.getByRole("checkbox", { name: /snow card/i }));
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
    expect(onCancel).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("takes a second Escape as meant: Chrome shuts the dialog itself then, firing only close", async () => {
    // Chrome lets a page refuse Escape once. Left unheard, the dialog was shut
    // while React held it open, and the button that opens it went dead.
    const { user, onCancel } = setup();

    await user.click(screen.getByRole("checkbox", { name: /snow card/i }));
    fireEvent(screen.getByRole("dialog"), new Event("close"));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("Escape shuts it when nothing has been ticked", () => {
    const { onCancel } = setup();

    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("starts afresh each time it opens, from what is chosen then", async () => {
    const { user, view, ...props } = setup();

    await user.click(screen.getByRole("checkbox", { name: /snow card/i }));
    await user.type(screen.getByRole("searchbox"), "snow");

    view.rerender(<PhotoMultiChooser {...props} open={false} />);
    view.rerender(<PhotoMultiChooser {...props} open chosen={["c"]} />);

    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(screen.getByRole("checkbox", { name: /snow card/i })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: /booties/i })).toBeChecked();
  });
});
