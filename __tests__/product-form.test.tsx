import { render, screen } from "@testing-library/react";

import { ProductForm } from "@/components/admin/product-form";

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
});
