import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CategoryCostsForm } from "@/components/admin/category-costs-form";

const usual = [
  { label: "Card & envelope", unitPence: 22, quantityHundredths: 100 },
  { label: "Post & packaging", unitPence: 106, quantityHundredths: 100 },
];

function setup(overrides: Partial<React.ComponentProps<typeof CategoryCostsForm>> = {}) {
  const action = jest.fn(async (_state: unknown, _form: FormData) => ({ saved: true }));
  render(<CategoryCostsForm categoryName="Cards" lines={usual} action={action} {...overrides} />);
  return { action, user: userEvent.setup() };
}

describe("CategoryCostsForm", () => {
  it("shows the usual costs, and what they come to", () => {
    setup();

    expect(screen.getAllByLabelText<HTMLInputElement>("What").map((input) => input.value)).toEqual(["Card & envelope", "Post & packaging"]);
    expect(screen.getByText("Total cost").nextSibling).toHaveTextContent("£1.28");
  });

  it("says what they are for, and that changing them reprices nothing", () => {
    setup();

    expect(screen.getByText(/pieces in cards.*not costed yet.*start from these/i)).toBeInTheDocument();
    expect(screen.getByText(/changes nothing already priced/i)).toBeInTheDocument();
  });

  it("saves the lines as they are typed", async () => {
    const { user, action } = setup();

    await user.click(screen.getByRole("button", { name: /add a line/i }));
    const what = screen.getAllByLabelText("What");
    await user.type(what[what.length - 1], "Ink");
    const each = screen.getAllByLabelText("Cost each");
    await user.type(each[each.length - 1], "0.30");
    await user.click(screen.getByRole("button", { name: /save usual costs/i }));

    await waitFor(() => expect(action).toHaveBeenCalled());
    const posted = action.mock.calls[0][1];
    expect(posted.getAll("lineLabel")).toEqual(["Card & envelope", "Post & packaging", "Ink"]);
    expect(posted.getAll("lineUnit")).toEqual(["0.22", "1.06", "0.30"]);
    expect(await screen.findByRole("status")).toHaveTextContent(/saved\./i);
  });

  it("shows what was wrong with a line", async () => {
    const { user } = setup({ action: async () => ({ error: "Line 3 has a cost but no name. Say what it is." }) });

    await user.click(screen.getByRole("button", { name: /save usual costs/i }));

    expect(await screen.findByText("Line 3 has a cost but no name. Say what it is.")).toBeInTheDocument();
  });

  it("starts empty, and says so, for a category with none yet", () => {
    setup({ lines: [] });

    expect(screen.queryAllByLabelText("What")).toHaveLength(0);
    expect(screen.getByText(/no usual costs yet/i)).toBeInTheDocument();
  });
});

describe("CategoryCostsForm, when a save is rejected", () => {
  it("keeps the lines typed", async () => {
    const { user } = setup({ action: jest.fn(async () => ({ error: "Line 2: write the cost as pounds and pence, like 0.22." })) });

    await user.clear(screen.getAllByLabelText("Cost each")[1]);
    await user.type(screen.getAllByLabelText("Cost each")[1], "1.1p");
    await user.click(screen.getByRole("button", { name: /save usual costs/i }));
    await screen.findByText(/write the cost as pounds and pence/i);

    expect(screen.getAllByLabelText("Cost each")[1]).toHaveValue("1.1p");
  });
});
