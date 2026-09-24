import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Link from "next/link";

import { ProductForm } from "@/components/admin/product-form";
import { SaveSlot } from "@/components/admin/save-slot";

const noopAction = async () => ({ errors: {} });

const categories = [
  { id: "cat_tableware", name: "Tableware", parentId: null },
  { id: "cat_mugs", name: "Mugs", parentId: "cat_tableware" },
  { id: "cat_vases", name: "Vases", parentId: null },
];

const mug = {
  name: "Hand-thrown Mug",
  slug: "hand-thrown-mug",
  description: null,
  status: "ACTIVE" as const,
  sku: null,
  stock: 3,
  weightGrams: null,
  featured: false,
  dimensions: null,
  materials: null,
  careInstructions: null,
  oneOfAKind: false,
  madeToOrder: false,
  leadTimeDays: null,
  categoryIds: ["cat_mugs"],
};

describe("ProductForm", () => {
  it("renders the fields needed to create a product", () => {
    render(<ProductForm action={noopAction} />);

    expect(screen.getByLabelText(/^name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^stock$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
  });

  it("offers the craft fields", () => {
    render(<ProductForm action={noopAction} />);

    expect(screen.getByLabelText(/materials/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/dimensions/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/care/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/one of a kind/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/made to order/i)).toBeInTheDocument();
  });

  it("has no box for a price, which is set on the Price tab", () => {
    render(<ProductForm action={noopAction} product={mug} pricing={{ productId: "p1", pricePence: 2400, compareAtPence: 3000 }} />);

    // The price is shown, and labelled - but nothing about it can be typed in.
    expect(screen.queryByRole("textbox", { name: /price/i })).not.toBeInTheDocument();
    expect(document.querySelector('input[name="price"]')).toBeNull();
    expect(document.querySelector('input[name="compareAtPrice"]')).toBeNull();
  });

  it("shows the price as it stands, and where to change it", () => {
    render(<ProductForm action={noopAction} product={mug} pricing={{ productId: "p1", pricePence: 2400, compareAtPence: 3000 }} />);

    const price = screen.getByRole("group", { name: /price/i });
    expect(price).toHaveTextContent("£24.00");
    expect(price).toHaveTextContent(/was £30\.00/i);
    expect(screen.getByRole("link", { name: /change it on the price tab/i })).toHaveAttribute("href", "/admin/products/p1/price");
  });

  it("mentions no was-price when there is not one", () => {
    render(<ProductForm action={noopAction} product={mug} pricing={{ productId: "p1", pricePence: 2400, compareAtPence: null }} />);

    expect(screen.getByRole("group", { name: /price/i })).not.toHaveTextContent(/was/i);
  });

  it("says a piece has no price yet, rather than showing £0.00 as though it were one", () => {
    render(<ProductForm action={noopAction} product={mug} pricing={{ productId: "p1", pricePence: 0, compareAtPence: null }} />);

    const price = screen.getByRole("group", { name: /price/i });
    expect(price).toHaveTextContent(/not priced yet/i);
    expect(price).not.toHaveTextContent("£0.00");
  });

  it("tells a new product it is priced once it has been saved", () => {
    render(<ProductForm action={noopAction} />);

    expect(screen.getByRole("group", { name: /price/i })).toHaveTextContent(/price tab once/i);
  });

  it("lists every category as a checkbox, nested ones indented under their parent", () => {
    render(<ProductForm action={noopAction} categories={categories} />);

    const mugs = screen.getByRole("checkbox", { name: /mugs/i });
    expect(mugs).toHaveAttribute("name", "categoryIds");
    expect(mugs).toHaveAttribute("value", "cat_mugs");
    expect(screen.getByRole("checkbox", { name: /tableware/i })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /vases/i })).toBeInTheDocument();
    // The child sits after its parent, not in plain alphabetical order.
    const order = screen.getAllByRole("checkbox", { name: /tableware|mugs|vases/i }).map((c) => c.getAttribute("value"));
    expect(order.indexOf("cat_mugs")).toBe(order.indexOf("cat_tableware") + 1);
  });

  it("pre-ticks the categories the product is already in", () => {
    render(<ProductForm action={noopAction} categories={categories} product={mug} />);

    expect(screen.getByRole("checkbox", { name: /mugs/i })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /tableware/i })).not.toBeChecked();
  });

  it("says so when there are no categories yet, instead of an empty fieldset", () => {
    render(<ProductForm action={noopAction} categories={[]} />);

    expect(screen.getByText(/no categories yet/i)).toBeInTheDocument();
  });

  it("shows an error next to the field it belongs to", () => {
    render(
      <ProductForm
        action={noopAction}
        initialState={{ errors: { name: "Give the product a name." } }}
      />,
    );

    const nameField = screen.getByLabelText(/^name/i);
    const errorId = nameField.getAttribute("aria-describedby");

    expect(errorId).toBeTruthy();
    expect(document.getElementById(errorId!)).toHaveTextContent("Give the product a name.");
    expect(nameField).toHaveAttribute("aria-invalid", "true");
  });

  it("does not mark a field invalid when it has no error", () => {
    render(<ProductForm action={noopAction} />);

    expect(screen.getByLabelText(/^name/i)).not.toHaveAttribute("aria-invalid");
  });

  it("asks before a link takes away changes not yet saved", async () => {
    HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
    const follow = jest.fn();
    render(
      <>
        <ProductForm action={noopAction} product={mug} categories={categories} />
        <Link
 href="/admin/products/p3" onClick={(event) => { event.preventDefault(); follow(); }}>Next</Link>
      </>,
    );
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/^name/i), " - Blue");
    await user.click(screen.getByRole("link", { name: "Next" }));

    expect(screen.getByRole("dialog", { name: /leave without saving/i })).toBeInTheDocument();
    expect(follow).not.toHaveBeenCalled();
  });
});

describe("ProductForm, when a save is rejected", () => {
  const rejected = async () => ({ errors: { sku: "Another product already uses that code." } });

  it("keeps everything typed, rather than putting the saved values back", async () => {
    render(<ProductForm action={rejected} product={mug} categories={categories} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/^name/i), " - Blue");
    await user.type(screen.getByLabelText(/product code/i), "MUG-01");
    await user.click(screen.getByRole("checkbox", { name: /vases/i }));
    await user.selectOptions(screen.getByLabelText(/status/i), "DRAFT");
    await user.click(screen.getByRole("button", { name: /save/i }));
    await screen.findByText("Another product already uses that code.");

    expect(screen.getByLabelText(/^name/i)).toHaveValue("Hand-thrown Mug - Blue");
    expect(screen.getByLabelText(/product code/i)).toHaveValue("MUG-01");
    expect(screen.getByRole("checkbox", { name: /vases/i })).toBeChecked();
    expect(screen.getByLabelText(/status/i)).toHaveValue("DRAFT");
  });

  it("keeps a new product's fields, so one mistake does not wipe the form", async () => {
    render(<ProductForm action={async () => ({ errors: { name: "Give the product a name." } })} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/description/i), "Crocheted by hand.");
    await user.click(screen.getByRole("button", { name: /save/i }));
    await screen.findByText("Give the product a name.");

    expect(screen.getByLabelText(/description/i)).toHaveValue("Crocheted by hand.");
  });

  it("still asks before leaving, since the typed changes are still unsaved", async () => {
    HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
    render(
      <>
        <ProductForm action={rejected} product={mug} categories={categories} />
        <Link href="/admin/products/p3" onClick={(event) => event.preventDefault()}>Next</Link>
      </>,
    );
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/^name/i), " - Blue");
    await user.click(screen.getByRole("button", { name: /save/i }));
    await screen.findByText("Another product already uses that code.");
    await user.click(screen.getByRole("link", { name: "Next" }));

    expect(screen.getByRole("dialog", { name: /leave without saving/i })).toBeInTheDocument();
  });
});

describe("ProductForm, when a save goes through", () => {
  it("shows what was saved, as the server tidied it - a web address built from the name", async () => {
    const saved = async () => ({ errors: {} });
    const { rerender } = render(<ProductForm action={saved} product={{ ...mug, slug: "" }} categories={categories} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /save/i }));
    // The page re-renders with the saved row, as revalidation does.
    rerender(<ProductForm action={saved} product={mug} categories={categories} />);

    expect(await screen.findByDisplayValue("hand-thrown-mug")).toBe(screen.getByLabelText(/web address/i));
  });
});

describe("ProductForm, saving from the top of the page", () => {
  it("puts Save beside the page's title as well as at the bottom, so a long form need not be scrolled", () => {
    render(
      <>
        <SaveSlot />
        <ProductForm action={noopAction} product={mug} categories={categories} submitLabel="Save changes" />
      </>,
    );

    const saves = screen.getAllByRole("button", { name: "Save changes" });
    expect(saves).toHaveLength(2);
    expect(document.getElementById("page-save")).toContainElement(saves[0]);
  });

  it("saves the form from the top button, and both say so while it saves", async () => {
    let finish: (state: { errors: object }) => void = () => {};
    const action = jest.fn(() => new Promise<{ errors: object }>((resolve) => (finish = resolve)));
    render(
      <>
        <SaveSlot />
        <ProductForm action={action} product={mug} categories={categories} submitLabel="Save changes" />
      </>,
    );
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/^name/i), " - Blue");
    await user.click(screen.getAllByRole("button", { name: "Save changes" })[0]);

    expect(action).toHaveBeenCalledTimes(1);
    const posted = (action.mock.calls[0] as unknown[])[1] as FormData;
    expect(posted.get("name")).toBe("Hand-thrown Mug - Blue");
    const saving = await screen.findAllByRole("button", { name: "Saving…" });
    expect(saving).toHaveLength(2);
    saving.forEach((button) => expect(button).toBeDisabled());
    await act(async () => finish({ errors: {} }));
  });

  it("keeps a single Save where the page has no place for one at the top", () => {
    render(<ProductForm action={noopAction} product={mug} categories={categories} submitLabel="Save changes" />);

    expect(screen.getAllByRole("button", { name: "Save changes" })).toHaveLength(1);
  });
});

