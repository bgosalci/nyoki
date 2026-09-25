import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PhotoChooser, type ChooserItem } from "@/components/admin/photo-chooser";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});

const items: ChooserItem[] = [
  { id: "a", title: "Cards / Christmas / row 30", details: ["Costs £2.85"], imageUrl: "/a.jpg", searchText: "cards christmas dragonfly" },
  { id: "b", title: "Clothes / Autumn/Winter / row 42", details: ["Costs £17.44"], imageUrl: "/b.jpg", searchText: "clothes pink mohair booties" },
  { id: "c", title: "Cards / Valentines / row 30", details: [], imageUrl: null, searchText: "cards valentines heart" },
];

function setup(overrides: Partial<React.ComponentProps<typeof PhotoChooser>> = {}) {
  const onChoose = jest.fn();
  const onCancel = jest.fn();
  render(
    <PhotoChooser open title="Choose a row" items={items} onChoose={onChoose} onCancel={onCancel} {...overrides} />,
  );
  return { onChoose, onCancel, user: userEvent.setup() };
}

describe("PhotoChooser", () => {
  it("stays shut until asked", () => {
    setup({ open: false });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows every choice by its photo and its name, in the order given", () => {
    setup();

    const choices = within(screen.getByRole("dialog")).getAllByRole("button", { name: /row/i });
    expect(choices.map((choice) => choice.textContent)).toEqual([
      expect.stringContaining("Christmas"),
      expect.stringContaining("Autumn/Winter"),
      expect.stringContaining("Valentines"),
    ]);
  });

  it("narrows the choices by any word it knows about them", async () => {
    // "booties" is in the photo's file name, not its title.
    const { user } = setup();

    await user.type(screen.getByRole("searchbox"), "booties");

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("button", { name: /autumn\/winter/i })).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: /christmas/i })).not.toBeInTheDocument();
  });

  it("matches every word typed, in any order", async () => {
    const { user } = setup();

    await user.type(screen.getByRole("searchbox"), "heart cards");

    expect(within(screen.getByRole("dialog")).getAllByRole("button", { name: /row/i })).toHaveLength(1);
  });

  it("says so when nothing matches, rather than showing an empty grid", async () => {
    const { user } = setup();

    await user.type(screen.getByRole("searchbox"), "teapot");

    expect(screen.getByText(/nothing matches/i)).toBeInTheDocument();
  });

  it("hands back the one chosen", async () => {
    const { user, onChoose } = setup();

    await user.click(screen.getByRole("button", { name: /valentines/i }));

    expect(onChoose).toHaveBeenCalledWith("c");
  });

  it("marks the one already chosen", () => {
    setup({ selectedId: "b" });

    expect(screen.getByRole("button", { name: /autumn\/winter/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /christmas/i })).toHaveAttribute("aria-pressed", "false");
  });

  it("shows every choice, however many, so any can be found by scrolling", () => {
    const many = Array.from({ length: 226 }, (_, i) => ({ id: `i${i}`, title: `Row ${i}`, details: [], imageUrl: null, searchText: "" }));
    setup({ items: many });

    expect(within(screen.getByRole("dialog")).getAllByRole("button", { name: /^row/i })).toHaveLength(226);
    expect(screen.getByText("226 to choose from")).toBeInTheDocument();
  });

  it("fetches a photo only as it scrolls into view, which is what makes showing them all cheap", () => {
    setup();

    const photos = screen.getByRole("dialog").querySelectorAll("img");
    expect(photos.length).toBeGreaterThan(0);
    photos.forEach((photo) => expect(photo).toHaveAttribute("loading", "lazy"));
  });

  it("can show what is being matched, to compare against", () => {
    setup({ lead: <p>Looking for: Christmas Dragonfly Card</p> });

    expect(within(screen.getByRole("dialog")).getByText(/looking for/i)).toBeInTheDocument();
  });

  it("closes without choosing when called off", async () => {
    const { user, onChoose, onCancel } = setup();

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onCancel).toHaveBeenCalled();
    expect(onChoose).not.toHaveBeenCalled();
  });
});
