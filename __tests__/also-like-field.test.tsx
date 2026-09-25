import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AlsoLikeField } from "@/components/admin/also-like-field";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});

const piece = (id: string, name: string) => ({ id, name, image: null });
const snowflake = piece("p1", "Snowflake Card");
const stocking = piece("p2", "Stocking Card");
const stars = piece("p3", "Three Stars");
const baubles = piece("p4", "Tree Baubles");
const reindeer = piece("p5", "Reindeer Card");
const vase = piece("p6", "Bud Vase");

// What the shop picks by itself for this product: same categories, newest first.
const automatic = [snowflake, stocking, stars, baubles, reindeer];
const options = [...automatic, vase];

function setup(props: Partial<React.ComponentProps<typeof AlsoLikeField>> = {}) {
  const { container } = render(
    <form>
      <AlsoLikeField options={options} automatic={automatic} chosen={[]} {...props} />
    </form>,
  );
  const posted = () => new FormData(container.querySelector("form")!).getAll("alsoLikeIds");
  return { posted, user: userEvent.setup() };
}

const field = () => screen.getByRole("group", { name: "You may also like" });
/** The row as shown: each piece's name and whether it was picked automatically. */
const row = () =>
  within(within(field()).getByRole("list", { name: "Shown on the product's page" }))
    .getAllByRole("listitem")
    .map((tile) => `${tile.querySelector("[data-name]")?.textContent ?? "(empty)"} - ${tile.querySelector("[data-how]")?.textContent ?? ""}`);

describe("AlsoLikeField", () => {
  it("shows the four pieces the product's page shows now, picked automatically", () => {
    const { posted } = setup();

    expect(row()).toEqual([
      "Snowflake Card - Automatic",
      "Stocking Card - Automatic",
      "Three Stars - Automatic",
      "Tree Baubles - Automatic",
    ]);
    expect(within(field()).getByText(/picked automatically from the same categories/i)).toBeInTheDocument();
    expect(posted()).toEqual([]);
  });

  it("makes the row her own when she changes one: the four she sees, with her choice in its place", async () => {
    const { user, posted } = setup();

    await user.click(within(field()).getByRole("button", { name: "Change Stocking Card" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Bud Vase" }));

    expect(row()).toEqual([
      "Snowflake Card - Your choice",
      "Bud Vase - Your choice",
      "Three Stars - Your choice",
      "Tree Baubles - Your choice",
    ]);
    expect(posted()).toEqual(["p1", "p6", "p3", "p4"]);
  });

  it("does not offer a piece already in the row", async () => {
    const { user } = setup();

    await user.click(within(field()).getByRole("button", { name: "Change Snowflake Card" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByRole("button", { name: "Stocking Card" })).not.toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Reindeer Card" })).toBeInTheDocument();
  });

  it("shows her choices first and fills the rest automatically, as the page does", () => {
    setup({ chosen: [{ ...vase, onShop: true }, { ...stars, onShop: true }] });

    expect(row()).toEqual([
      "Bud Vase - Your choice",
      "Three Stars - Your choice",
      "Snowflake Card - Automatic",
      "Stocking Card - Automatic",
    ]);
  });

  it("goes back to the automatic pieces", async () => {
    const { user, posted } = setup({ chosen: [{ ...vase, onShop: true }] });

    await user.click(within(field()).getByRole("button", { name: "Back to automatic" }));

    expect(posted()).toEqual([]);
    expect(row()[0]).toBe("Snowflake Card - Automatic");
    expect(within(field()).queryByRole("button", { name: "Back to automatic" })).not.toBeInTheDocument();
  });

  it("leaves a place to add one where the categories find fewer than four", async () => {
    const { user, posted } = setup({ automatic: [snowflake] });

    expect(row()).toEqual(["Snowflake Card - Automatic", "(empty) - ", "(empty) - ", "(empty) - "]);
    await user.click(within(field()).getAllByRole("button", { name: "Add a piece" })[0]);
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Bud Vase" }));

    expect(posted()).toEqual(["p1", "p6"]);
  });

  it("names a chosen piece taken off the shop, which the page skips, and lets it go", async () => {
    const { user, posted } = setup({ chosen: [{ id: "old", name: "Old Card", image: null, onShop: false }, { ...vase, onShop: true }] });

    expect(row()[0]).toBe("Bud Vase - Your choice");
    expect(within(field()).getByText(/old card is not on the shop, so it is skipped/i)).toBeInTheDocument();

    await user.click(within(field()).getByRole("button", { name: "Remove Old Card" }));

    expect(posted()).toEqual(["p6"]);
  });
});
