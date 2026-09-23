import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ProductPicker } from "@/components/admin/product-picker";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});

const products = [
  { id: "p1", name: "Green Cardigan", image: { url: "/green.jpg", alt: null } },
  { id: "p2", name: "Snowflake Card", image: { url: "/snow.jpg", alt: null } },
  { id: "p3", name: "Bud Vase", image: null },
];

function setup(overrides: Partial<React.ComponentProps<typeof ProductPicker>> = {}) {
  render(
    <ProductPicker
      name="heroProductId"
      label="Main photo"
      products={products}
      value={null}
      emptyLabel="The newest piece with a photo"
      {...overrides}
    />,
  );
  return { user: userEvent.setup() };
}

/** The value the surrounding form would actually post. */
const posted = (container: HTMLElement) =>
  container.querySelector<HTMLInputElement>('input[name="heroProductId"]')?.value;

describe("ProductPicker", () => {
  it("carries its own label, rather than letting one rename its buttons", () => {
    // Pointed at the Choose button by a surrounding label, that button is
    // announced as "Main photo" and no longer says what pressing it does.
    setup();

    expect(screen.getByRole("group", { name: "Main photo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Choose" })).toBeInTheDocument();
  });

  it("shows a hint and a problem where it is given them", () => {
    setup({ hint: "Pick the piece that leads the page.", error: "That piece has gone." });

    expect(screen.getByText("Pick the piece that leads the page.")).toBeInTheDocument();
    expect(screen.getByText("That piece has gone.")).toBeInTheDocument();
  });

  it("posts nothing when nothing is chosen, and says what that means", () => {
    const { container } = render(
      <ProductPicker name="heroProductId" label="Main photo" products={products} value={null} emptyLabel="The newest piece with a photo" />,
    );

    expect(screen.getByText("The newest piece with a photo")).toBeInTheDocument();
    expect(posted(container)).toBe("");
  });

  it("shows the chosen piece by its photo and its name, not by an id", () => {
    const { container } = render(
      <ProductPicker name="heroProductId" label="Main photo" products={products} value="p1" emptyLabel="Automatic" />,
    );

    expect(screen.getByText("Green Cardigan")).toBeInTheDocument();
    expect(container.querySelector("img")).toHaveAttribute("alt", "");
    expect(posted(container)).toBe("p1");
  });

  it("keeps a chosen id that is no longer in the list, rather than silently dropping it", () => {
    // The list is filtered to what can lead the page; a piece archived since
    // it was chosen must not be cleared by merely opening the form.
    const { container } = render(
      <ProductPicker name="heroProductId" label="Main photo" products={products} value="gone" emptyLabel="Automatic" />,
    );

    expect(posted(container)).toBe("gone");
  });

  it("opens a chooser rather than making you read a list of names", async () => {
    const { user } = setup();

    await user.click(screen.getByRole("button", { name: /choose/i }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("button", { name: /green cardigan/i })).toBeInTheDocument();
  });

  it("narrows the choices as you type", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: /choose/i }));

    await user.type(screen.getByRole("searchbox"), "snow");

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("button", { name: /snowflake/i })).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: /green cardigan/i })).not.toBeInTheDocument();
  });

  it("takes the choice and shuts", async () => {
    const { container } = render(
      <ProductPicker name="heroProductId" label="Main photo" products={products} value={null} emptyLabel="Automatic" />,
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /choose/i }));
    await user.click(screen.getByRole("button", { name: /snowflake card/i }));

    expect(posted(container)).toBe("p2");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("Snowflake Card")).toBeInTheDocument();
  });

  it("can be put back to automatic once something has been chosen", async () => {
    const { container } = render(
      <ProductPicker name="heroProductId" label="Main photo" products={products} value="p1" emptyLabel="Automatic" />,
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /clear/i }));

    expect(posted(container)).toBe("");
    expect(screen.getByText("Automatic")).toBeInTheDocument();
  });

  it("offers nothing to clear when nothing is chosen", () => {
    setup();

    expect(screen.queryByRole("button", { name: /clear/i })).not.toBeInTheDocument();
  });

  it("still offers a piece that has no photo of its own", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: /choose/i }));

    expect(screen.getByRole("button", { name: /bud vase/i })).toBeInTheDocument();
  });

  it("closes without choosing when called off", async () => {
    const { container } = render(
      <ProductPicker name="heroProductId" label="Main photo" products={products} value={null} emptyLabel="Automatic" />,
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /choose/i }));
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(posted(container)).toBe("");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
