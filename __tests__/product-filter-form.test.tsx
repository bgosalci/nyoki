import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ProductFilterForm, filterHref } from "@/components/admin/product-filter-form";

const replace = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/admin/products",
}));

describe("filterHref", () => {
  it("drops empty values so the bare list has a clean address", () => {
    expect(filterHref("/admin/products", { q: "", status: "" })).toBe("/admin/products");
  });

  it("puts the search and status in the query string", () => {
    expect(filterHref("/admin/products", { q: "mug", status: "ACTIVE" })).toBe("/admin/products?q=mug&status=ACTIVE");
  });

  it("encodes what needs encoding", () => {
    expect(filterHref("/admin/products", { q: "tom's & jerry", status: "" })).toBe("/admin/products?q=tom%27s+%26+jerry");
  });
});

describe("ProductFilterForm", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    replace.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function setup(props: Partial<React.ComponentProps<typeof ProductFilterForm>> = {}) {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<ProductFilterForm initialQ="" initialStatus="" {...props} />);
    return user;
  }

  it("does nothing on first render", () => {
    setup({ initialQ: "mug" });

    jest.advanceTimersByTime(1000);
    expect(replace).not.toHaveBeenCalled();
  });

  it("searches as you type, once you pause", async () => {
    const user = setup();

    await user.type(screen.getByLabelText(/find/i), "mug");
    expect(replace).not.toHaveBeenCalled();

    jest.advanceTimersByTime(300);
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith("/admin/products?q=mug", { scroll: false });
  });

  it("goes back to the whole list when the box is emptied", async () => {
    const user = setup({ initialQ: "mug" });

    await user.clear(screen.getByLabelText(/find/i));
    jest.advanceTimersByTime(300);

    expect(replace).toHaveBeenLastCalledWith("/admin/products", { scroll: false });
  });

  it("applies a status change straight away", async () => {
    const user = setup({ initialQ: "mug" });

    await user.selectOptions(screen.getByLabelText(/status/i), "DRAFT");

    expect(replace).toHaveBeenCalledWith("/admin/products?q=mug&status=DRAFT", { scroll: false });
  });

  it("applies immediately on Enter rather than waiting for the pause", async () => {
    const user = setup();

    await user.type(screen.getByLabelText(/find/i), "vest{Enter}");

    expect(replace).toHaveBeenCalledWith("/admin/products?q=vest", { scroll: false });
  });

  it("has no Filter button, since filtering is live", () => {
    setup();

    expect(screen.queryByRole("button", { name: /^filter$/i })).not.toBeInTheDocument();
  });

  it("offers Clear only when something is filtered", async () => {
    const user = setup();
    expect(screen.queryByRole("button", { name: /clear/i })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/find/i), "x");
    expect(screen.getByRole("button", { name: /clear/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /clear/i }));
    expect(screen.getByLabelText(/find/i)).toHaveValue("");
    expect(replace).toHaveBeenLastCalledWith("/admin/products", { scroll: false });
  });
});
