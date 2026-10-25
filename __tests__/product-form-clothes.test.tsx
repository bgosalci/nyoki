import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ProductForm } from "@/components/admin/product-form";
import { stockFieldName } from "@/lib/clothes/settings";

const categories = [
  { id: "cat_clothes", name: "Clothes", slug: "clothes", parentId: null },
  { id: "cat_dresses", name: "Dresses", slug: "dresses", parentId: "cat_clothes" },
  { id: "cat_mugs", name: "Mugs", slug: "mugs", parentId: null },
];

const piece = (categoryIds: string[]) => ({
  name: "Flower Dress",
  slug: "flower-dress",
  description: null,
  status: "ACTIVE" as const,
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
  categoryIds,
});

const dress = piece(["cat_dresses"]);

/** Two colours in two sizes: 2 Lupin and 1 Gypsum in 3-4 years, none in 4-5 years. */
const saved = {
  colours: ["Lupin", "Gypsum"],
  sizes: ["3-4 years", "4-5 years"],
  variants: [
    { colour: "Lupin", size: "3-4 years", stock: 2 },
    { colour: "Lupin", size: "4-5 years", stock: 0 },
    { colour: "Gypsum", size: "3-4 years", stock: 1 },
  ],
};

const noop = async () => ({ errors: {} });
const dimensions = () => screen.queryByRole("textbox", { name: /dimensions/i });
const colours = () => screen.queryByRole("group", { name: "Colours" });
const stockBox = () => screen.queryByRole("textbox", { name: /^stock$/i });

describe("ProductForm, for clothes", () => {
  it("describes anything that is not clothing by its dimensions", () => {
    render(<ProductForm action={noop} product={piece(["cat_mugs"])} categories={categories} />);

    expect(dimensions()).toBeInTheDocument();
    expect(colours()).not.toBeInTheDocument();
  });

  it("asks for colours and sizes in place of the dimensions for clothing", () => {
    render(<ProductForm action={noop} product={dress} categories={categories} />);

    expect(dimensions()).not.toBeInTheDocument();
    expect(colours()).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Sizes" })).toBeInTheDocument();
  });

  it("keeps the dimensions in the form while they are out of sight, so saving does not lose them", () => {
    render(<ProductForm action={noop} product={{ ...dress, dimensions: "40cm long" }} categories={categories} />);

    expect(document.querySelector('input[name="dimensions"]')).toHaveValue("40cm long");
  });

  it("switches over as soon as a Clothes category is ticked", async () => {
    render(<ProductForm action={noop} product={piece(["cat_mugs"])} categories={categories} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Change categories" }));
    await user.click(screen.getByRole("checkbox", { name: "Dresses" }));

    expect(dimensions()).not.toBeInTheDocument();
    expect(colours()).toBeInTheDocument();
  });

  it("adds a colour and a size, and a box for the stock of that colour in that size", async () => {
    render(<ProductForm action={noop} product={dress} categories={categories} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Add a colour" }));
    expect(screen.getByRole("textbox", { name: "Colour 1" })).toHaveFocus();
    await user.keyboard("Lupin");
    await user.click(screen.getByRole("button", { name: "Add a size" }));
    expect(screen.getByRole("textbox", { name: "Size 1" })).toHaveFocus();
    await user.keyboard("3-4 years");

    expect(screen.getByRole("textbox", { name: "Stock of Lupin in 3-4 years" })).toHaveAttribute("name", stockFieldName(0, 0));
  });

  it("does not save the form when Enter is pressed in a colour or size", async () => {
    const action = jest.fn(noop);
    render(<ProductForm action={action} product={dress} categories={categories} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Add a size" }));
    await user.keyboard("S{Enter}");

    expect(action).not.toHaveBeenCalled();
  });

  it("starts from what is saved", () => {
    render(<ProductForm action={noop} product={dress} categories={categories} clothing={saved} />);

    expect(screen.getByRole("textbox", { name: "Colour 2" })).toHaveValue("Gypsum");
    expect(screen.getByRole("textbox", { name: "Size 1" })).toHaveValue("3-4 years");
    expect(screen.getByRole("textbox", { name: "Stock of Lupin in 3-4 years" })).toHaveValue("2");
    expect(screen.getByRole("textbox", { name: "Stock of Gypsum in 4-5 years" })).toHaveValue("");
  });

  it("puts the total in place of the Stock box once there are colours or sizes, and keeps it up to date", async () => {
    render(<ProductForm action={noop} product={dress} categories={categories} clothing={saved} />);
    const user = userEvent.setup();

    expect(stockBox()).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Stock" })).toHaveTextContent("3 in all");

    await user.type(screen.getByRole("textbox", { name: "Stock of Gypsum in 4-5 years" }), "4");
    expect(screen.getByRole("group", { name: "Stock" })).toHaveTextContent("7 in all");
  });

  it("keeps the Stock box for clothes in no colours or sizes yet", () => {
    render(<ProductForm action={noop} product={dress} categories={categories} />);

    expect(stockBox()).toBeInTheDocument();
  });

  it("moves a size up or down, and removes a colour", async () => {
    render(<ProductForm action={noop} product={dress} categories={categories} clothing={saved} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Move 4-5 years up" }));
    expect(screen.getByRole("textbox", { name: "Size 1" })).toHaveValue("4-5 years");

    await user.click(screen.getByRole("button", { name: "Remove Lupin" }));
    expect(screen.getAllByRole("textbox", { name: /^Colour \d+$/ }).map((box) => (box as HTMLInputElement).value)).toEqual(["Gypsum"]);
  });

  it("posts each colour and size with the name it was saved under, and the stock of each", async () => {
    const action = jest.fn(async (_state: unknown, _data: FormData) => ({ errors: {} }));
    render(<ProductForm action={action} product={dress} categories={categories} clothing={saved} />);
    const user = userEvent.setup();

    await user.clear(screen.getByRole("textbox", { name: "Colour 1" }));
    await user.type(screen.getByRole("textbox", { name: "Colour 1" }), "Sage");
    await user.click(screen.getAllByRole("button", { name: /save/i })[0]);

    const posted = action.mock.calls[0][1];
    expect(posted.getAll("colour")).toEqual(["Sage", "Gypsum"]);
    expect(posted.getAll("colourWas")).toEqual(["Lupin", "Gypsum"]);
    expect(posted.getAll("size")).toEqual(["3-4 years", "4-5 years"]);
    expect(posted.get(stockFieldName(0, 0))).toBe("2");
    expect(posted.get(stockFieldName(1, 1))).toBe("");
    expect(posted.get("stock")).toBeNull();
  });

  it("shows what is wrong beside the colours, the sizes and the stock", () => {
    render(
      <ProductForm
        action={noop}
        product={dress}
        categories={categories}
        clothing={saved}
        initialState={{
          errors: {
            colours: "There are two colours called “Red”.",
            sizes: "Name every size, or remove the empty one.",
            variantStock: "Stock has to be a whole number, zero or more.",
          },
        }}
      />,
    );

    expect(colours()).toHaveTextContent("There are two colours called “Red”.");
    expect(screen.getByRole("group", { name: "Sizes" })).toHaveTextContent("Name every size, or remove the empty one.");
    expect(screen.getByRole("region", { name: "Stock of each colour in each size" })).toHaveTextContent(
      "Stock has to be a whole number, zero or more.",
    );
  });
});
