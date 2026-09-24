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

describe("SaleForm, when a save is rejected", () => {
  it("keeps what was typed", async () => {
    render(<SaleForm action={async () => ({ errors: { value: "Write the amount as a whole number." } })} products={products} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/^name/i), "Summer sale");
    await user.type(screen.getByLabelText(/^amount/i), "15");
    await user.click(screen.getByRole("button", { name: /save sale/i }));
    await screen.findByText("Write the amount as a whole number.");

    expect(screen.getByLabelText(/^name/i)).toHaveValue("Summer sale");
    expect(screen.getByLabelText(/^amount/i)).toHaveValue("15");
  });
});

describe("SaleForm, finding products by category", () => {
  const catalogue = [
    { id: "p_snow", name: "Snowflake Card", pricePence: 600, categories: ["Cards › Christmas Cards"] },
    { id: "p_stars", name: "Three Stars", pricePence: 799, categories: ["Cards › Christmas Cards"] },
    { id: "p_bunny", name: "Bunny Card", pricePence: 550, categories: ["Cards › Easter Card"] },
    { id: "p_vase", name: "Bud Vase", pricePence: 1800, categories: ["Home › Vases"] },
  ];
  // The product boxes shown; the sale's own "Live" box is not one of them.
  const shown = () =>
    screen
      .getAllByRole("checkbox")
      .filter((box) => box.getAttribute("name") === "productIds")
      .map((box) => box.getAttribute("value"));

  function setup() {
    const { container } = render(<SaleForm action={noopAction} products={catalogue} />);
    const posted = () => new FormData(container.querySelector("form")!).getAll("productIds");
    return { posted, user: userEvent.setup() };
  }

  it("finds products by their category - even one not named for it", async () => {
    const { user } = setup();

    await user.type(screen.getByLabelText(/find products/i), "christmas");

    expect(shown()).toEqual(["p_snow", "p_stars"]);
  });

  it("matches every word typed, in any order, across name and category", async () => {
    const { user } = setup();

    await user.type(screen.getByLabelText(/find products/i), "card easter");

    expect(shown()).toEqual(["p_bunny"]);
  });

  it("shows each product's categories beside its name", () => {
    setup();

    expect(screen.getByText("Cards › Easter Card")).toBeInTheDocument();
  });

  it("selects just the products found, not the whole shop", async () => {
    const { user, posted } = setup();

    await user.type(screen.getByLabelText(/find products/i), "christmas");
    await user.click(screen.getByRole("button", { name: "Select these 2" }));

    expect(posted()).toEqual(["p_snow", "p_stars"]);
    expect(screen.getByText(/2 of 4 selected/i)).toBeInTheDocument();
  });

  it("clears just the products found, keeping the rest", async () => {
    const { user, posted } = setup();
    await user.click(screen.getByRole("button", { name: "Select all" }));

    await user.type(screen.getByLabelText(/find products/i), "christmas");
    await user.click(screen.getByRole("button", { name: "Clear these 2" }));

    expect(posted()).toEqual(["p_bunny", "p_vase"]);
  });

  it("does not save the sale when Enter is pressed in the search", async () => {
    const action = jest.fn(async () => ({ errors: {} }));
    render(<SaleForm action={action} products={catalogue} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/find products/i), "christmas{Enter}");

    expect(action).not.toHaveBeenCalled();
  });
});

