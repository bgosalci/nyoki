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
  pricePence: 2400,
  compareAtPence: 3000,
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
    expect(screen.getByLabelText(/^price/i)).toBeInTheDocument();
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

  it("shows prices in pounds, not the pence we store", () => {
    render(
      <ProductForm
        action={noopAction}
        product={{
          name: "Hand-thrown Mug",
          slug: "hand-thrown-mug",
          description: null,
          status: "ACTIVE",
          pricePence: 2400,
          compareAtPence: 3000,
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
          categoryIds: [],
        }}
      />,
    );

    expect(screen.getByLabelText(/^price/i)).toHaveValue("24.00");
    expect(screen.getByLabelText(/was.price|compare/i)).toHaveValue("30.00");
    expect(screen.getByLabelText(/^name/i)).toHaveValue("Hand-thrown Mug");
  });

  it("leaves an unset compare-at price blank rather than showing £0.00", () => {
    render(
      <ProductForm
        action={noopAction}
        product={{
          name: "Mug",
          slug: "mug",
          description: null,
          status: "DRAFT",
          pricePence: 2400,
          compareAtPence: null,
          sku: null,
          stock: 0,
          weightGrams: null,
          featured: false,
          dimensions: null,
          materials: null,
          careInstructions: null,
          oneOfAKind: false,
          madeToOrder: false,
          leadTimeDays: null,
          categoryIds: [],
        }}
      />,
    );

    expect(screen.getByLabelText(/was.price|compare/i)).toHaveValue("");
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
        initialState={{ errors: { price: "Give the product a price." } }}
      />,
    );

    const priceField = screen.getByLabelText(/^price/i);
    const errorId = priceField.getAttribute("aria-describedby");

    expect(errorId).toBeTruthy();
    expect(document.getElementById(errorId!)).toHaveTextContent(
      "Give the product a price.",
    );
    expect(priceField).toHaveAttribute("aria-invalid", "true");
  });

  it("does not mark a field invalid when it has no error", () => {
    render(<ProductForm action={noopAction} />);

    expect(screen.getByLabelText(/^name/i)).not.toHaveAttribute("aria-invalid");
  });
});
