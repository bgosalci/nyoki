import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PricingFilterForm } from "@/components/admin/pricing-filter-form";

const replace = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/admin/pricing",
}));

beforeEach(() => replace.mockClear());

describe("PricingFilterForm", () => {
  it("narrows straight away to what is not yet costed", async () => {
    const user = userEvent.setup();
    render(<PricingFilterForm initialQ="" initialView="all" />);

    await user.selectOptions(screen.getByLabelText(/show/i), "uncosted");

    expect(replace).toHaveBeenCalledWith("/admin/pricing?view=uncosted", { scroll: false });
  });

  it("offers the pieces selling at a loss as a view of their own", () => {
    render(<PricingFilterForm initialQ="" initialView="all" />);

    expect(screen.getByRole("option", { name: /at a loss/i })).toHaveValue("loss");
  });

  it("searches once the typing pauses, keeping the view", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<PricingFilterForm initialQ="" initialView="loss" />);

    await user.type(screen.getByLabelText(/find/i), "snail");
    expect(replace).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(300));
    expect(replace).toHaveBeenLastCalledWith("/admin/pricing?q=snail&view=loss", { scroll: false });
    jest.useRealTimers();
  });

  it("leaves the address clean when showing everything", async () => {
    const user = userEvent.setup();
    render(<PricingFilterForm initialQ="" initialView="loss" />);

    await user.selectOptions(screen.getByLabelText(/show/i), "all");

    expect(replace).toHaveBeenCalledWith("/admin/pricing", { scroll: false });
  });
});
