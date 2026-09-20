import { render, screen } from "@testing-library/react";

import { ProductForm } from "@/components/admin/product-form";

const noopAction = async () => ({ errors: {} });

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
        }}
      />,
    );

    expect(screen.getByLabelText(/was.price|compare/i)).toHaveValue("");
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
