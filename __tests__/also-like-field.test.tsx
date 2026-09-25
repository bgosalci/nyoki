import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AlsoLikeField } from "@/components/admin/also-like-field";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});

const options = ["Bud Vase", "Stoneware Mug", "Snowflake Card", "Stocking Card", "Three Stars"].map((name, i) => ({
  id: `p${i + 1}`,
  name,
  image: null,
}));

function setup(chosen: React.ComponentProps<typeof AlsoLikeField>["chosen"] = []) {
  const { container } = render(
    <form>
      <AlsoLikeField options={options} chosen={chosen} />
    </form>,
  );
  const posted = () => new FormData(container.querySelector("form")!).getAll("alsoLikeIds");
  return { posted, user: userEvent.setup() };
}

const field = () => screen.getByRole("group", { name: "You may also like" });
const pick = async (user: ReturnType<typeof userEvent.setup>, opener: RegExp, name: string) => {
  await user.click(within(field()).getByRole("button", { name: opener }));
  await user.click(within(screen.getByRole("dialog")).getByRole("button", { name }));
};

describe("AlsoLikeField", () => {
  it("is automatic until Njomza chooses, and says what automatic means", () => {
    const { posted } = setup();

    expect(within(field()).getByText(/chosen automatically/i)).toHaveTextContent(/same categories/i);
    expect(within(field()).getByRole("button", { name: "Choose pieces" })).toBeInTheDocument();
    expect(posted()).toEqual([]);
  });

  it("adds the pieces she chooses by photo, in the order chosen", async () => {
    const { user, posted } = setup();

    await pick(user, /choose pieces/i, "Snowflake Card");
    await pick(user, /add a piece/i, "Bud Vase");

    expect(within(field()).getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      expect.stringContaining("Snowflake Card"),
      expect.stringContaining("Bud Vase"),
    ]);
    expect(posted()).toEqual(["p3", "p1"]);
  });

  it("does not offer a piece already chosen", async () => {
    const { user } = setup([{ ...options[0], onShop: true }]);

    await user.click(within(field()).getByRole("button", { name: /add a piece/i }));

    expect(within(screen.getByRole("dialog")).queryByRole("button", { name: "Bud Vase" })).not.toBeInTheDocument();
  });

  it("takes one off, or goes back to automatic altogether", async () => {
    const { user, posted } = setup([{ ...options[0], onShop: true }, { ...options[1], onShop: true }]);

    await user.click(within(field()).getByRole("button", { name: "Remove Bud Vase" }));
    expect(posted()).toEqual(["p2"]);

    await user.click(within(field()).getByRole("button", { name: "Back to automatic" }));
    expect(posted()).toEqual([]);
    expect(within(field()).getByText(/chosen automatically/i)).toBeInTheDocument();
  });

  it("holds four at most, as the row does", async () => {
    setup(options.slice(0, 4).map((option) => ({ ...option, onShop: true })));

    expect(within(field()).queryByRole("button", { name: /add a piece/i })).not.toBeInTheDocument();
    expect(within(field()).getByText(/four chosen/i)).toBeInTheDocument();
  });

  it("marks a chosen piece that is no longer on the shop, since the page skips it", () => {
    setup([{ id: "gone", name: "Old Card", image: null, onShop: false }]);

    expect(within(field()).getByText("Old Card").closest("li")).toHaveTextContent(/not on the shop/i);
  });
});
