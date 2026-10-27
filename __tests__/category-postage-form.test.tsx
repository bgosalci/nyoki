import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CategoryPostageForm } from "@/components/admin/category-postage-form";

const noop = async () => ({ errors: {} });

describe("CategoryPostageForm", () => {
  it("shows the category's usual postage, each part in its own box", () => {
    render(<CategoryPostageForm categoryName="Cards" usual={{ grams: 40, size: "LARGE_LETTER", mm: 5 }} users={28} weighed={2} action={noop} />);

    expect(screen.getByRole("heading", { name: "Usual postage" })).toBeInTheDocument();
    expect(screen.getByLabelText(/^weight/i)).toHaveValue("40");
    expect(screen.getByLabelText(/goes in the post as/i)).toHaveValue("LARGE_LETTER");
    expect(screen.getByLabelText(/^thickness/i)).toHaveValue("5");
  });

  it("says it is read live, not copied, and how many pieces go by it", () => {
    render(<CategoryPostageForm categoryName="Cards" usual={{ grams: 40, size: "LARGE_LETTER", mm: 5 }} users={28} weighed={2} action={noop} />);

    expect(screen.getByText(/not copied/i)).toBeInTheDocument();
    expect(screen.getByText(/used by 28 pieces/i)).toBeInTheDocument();
    expect(screen.getByText(/2 have a weight of their own/i)).toBeInTheDocument();
  });

  it("starts empty for a category without one", () => {
    render(<CategoryPostageForm categoryName="Accessories" usual={{ grams: null, size: null, mm: null }} users={0} weighed={0} action={noop} />);

    expect(screen.getByLabelText(/^weight/i)).toHaveValue("");
    expect(screen.getByLabelText(/goes in the post as/i)).toHaveValue("");
    expect(screen.queryByText(/used by/i)).not.toBeInTheDocument();
  });

  it("shows the size as it was saved, so the next save does not clear it", async () => {
    const action = jest.fn(async (_state: unknown, _data: FormData) => ({ errors: {} }));
    render(<CategoryPostageForm categoryName="Cards" usual={{ grams: 40, size: null, mm: 5 }} users={28} weighed={2} action={action} />);
    const user = userEvent.setup();

    await user.selectOptions(screen.getByLabelText(/goes in the post as/i), "LARGE_LETTER");
    await user.click(screen.getByRole("button", { name: /save/i }));
    await act(async () => {});

    expect(screen.getByLabelText(/goes in the post as/i)).toHaveValue("LARGE_LETTER");

    await user.click(screen.getByRole("button", { name: /save/i }));
    expect(action.mock.calls[1][1].get("usualParcelSize")).toBe("LARGE_LETTER");
  });

  it("shows what is wrong beside each box", () => {
    render(
      <CategoryPostageForm
        categoryName="Cards"
        usual={{ grams: null, size: null, mm: null }}
        users={0}
        weighed={0}
        action={noop}
        initialState={{ errors: { usualGrams: "Weight has to be a whole number of grams." } }}
      />,
    );

    expect(screen.getByLabelText(/^weight/i)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Weight has to be a whole number of grams.")).toBeInTheDocument();
  });
});
