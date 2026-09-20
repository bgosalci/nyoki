import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SaleForm } from "@/components/admin/sale-form";

const noopAction = async () => ({ errors: {} });

const products = [
  { id: "p_mug", name: "Hand-thrown Mug", pricePence: 2400 },
  { id: "p_bowl", name: "Serving Bowl", pricePence: 4800 },
  { id: "p_vase", name: "Bud Vase", pricePence: 1800 },
];

describe("SaleForm", () => {
  it("renders the sale fields", () => {
    render(<SaleForm action={noopAction} products={products} />);

    expect(screen.getByLabelText(/^name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/starts/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/ends/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^live/i)).toBeInTheDocument();
  });

  it("offers percent off and pounds off", () => {
    render(<SaleForm action={noopAction} products={products} />);

    expect(screen.getByLabelText(/percent off/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/pounds off/i)).toBeInTheDocument();
  });

  it("lists every product as a checkbox with its price", () => {
    render(<SaleForm action={noopAction} products={products} />);

    const mug = screen.getByRole("checkbox", { name: /hand-thrown mug/i });
    expect(mug).toHaveAttribute("name", "productIds");
    expect(mug).toHaveAttribute("value", "p_mug");
    expect(screen.getByText("£24.00")).toBeInTheDocument();
  });

  it("pre-selects the products already in the sale", () => {
    render(
      <SaleForm
        action={noopAction}
        products={products}
        sale={{
          name: "Spring sale",
          type: "PERCENTAGE",
          value: 20,
          startsAt: new Date("2026-06-01T09:00:00"),
          endsAt: null,
          active: true,
          productIds: ["p_bowl"],
        }}
      />,
    );

    expect(screen.getByRole("checkbox", { name: /serving bowl/i })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /hand-thrown mug/i })).not.toBeChecked();
  });

  it("is live by default when creating", () => {
    render(<SaleForm action={noopAction} products={products} />);

    expect(screen.getByLabelText(/^live/i)).toBeChecked();
  });

  it("selects every product at once", async () => {
    const user = userEvent.setup();
    render(<SaleForm action={noopAction} products={products} />);

    await user.click(screen.getByRole("button", { name: /select all/i }));

    for (const product of products) {
      expect(screen.getByRole("checkbox", { name: new RegExp(product.name, "i") })).toBeChecked();
    }
  });

  it("clears every product at once", async () => {
    const user = userEvent.setup();
    render(<SaleForm action={noopAction} products={products} />);

    await user.click(screen.getByRole("button", { name: /select all/i }));
    await user.click(screen.getByRole("button", { name: /clear/i }));

    for (const product of products) {
      expect(screen.getByRole("checkbox", { name: new RegExp(product.name, "i") })).not.toBeChecked();
    }
  });

  it("filters the product list as you type", async () => {
    const user = userEvent.setup();
    render(<SaleForm action={noopAction} products={products} />);

    await user.type(screen.getByLabelText(/find products/i), "bowl");

    expect(screen.getByRole("checkbox", { name: /serving bowl/i })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /hand-thrown mug/i })).not.toBeInTheDocument();
  });

  it("keeps a hidden selection when it is filtered out of view", async () => {
    // Selecting the mug, then searching "bowl", must still submit the mug.
    const user = userEvent.setup();
    render(<SaleForm action={noopAction} products={products} />);

    await user.click(screen.getByRole("checkbox", { name: /hand-thrown mug/i }));
    await user.type(screen.getByLabelText(/find products/i), "bowl");

    const hidden = document.querySelector('input[name="productIds"][value="p_mug"]');
    expect(hidden).not.toBeNull();
    expect(hidden).toBeChecked();
  });

  it("shows how many products are selected", async () => {
    const user = userEvent.setup();
    render(<SaleForm action={noopAction} products={products} />);

    await user.click(screen.getByRole("checkbox", { name: /bud vase/i }));
    await user.click(screen.getByRole("checkbox", { name: /serving bowl/i }));

    expect(screen.getByText(/2 of 3 selected/i)).toBeInTheDocument();
  });

  it("shows a field error where it belongs", () => {
    render(
      <SaleForm
        action={noopAction}
        products={products}
        initialState={{ errors: { productIds: "Pick at least one product for the sale." } }}
      />,
    );

    expect(screen.getByText("Pick at least one product for the sale.")).toBeInTheDocument();
  });
});
