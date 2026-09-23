import { render, screen } from "@testing-library/react";

import { HomeForm } from "@/components/admin/home-form";
import { HOME_DEFAULTS } from "@/lib/home/content";

const products = [
  { id: "p1", name: "Green Cardigan" },
  { id: "p2", name: "Snowflake Card" },
];

function setup(overrides: Partial<React.ComponentProps<typeof HomeForm>> = {}) {
  const action = jest.fn(async () => ({ errors: {} }));
  render(<HomeForm content={HOME_DEFAULTS} products={products} action={action} {...overrides} />);
  return { action };
}

describe("HomeForm", () => {
  it("opens with what the page currently says", () => {
    setup();

    expect(screen.getByLabelText(/headline/i)).toHaveValue(HOME_DEFAULTS.headline);
    expect(screen.getByLabelText(/^button/i)).toHaveValue(HOME_DEFAULTS.ctaLabel);
  });

  it("offers every piece for the main photo, and choosing none as an option", () => {
    setup();

    const hero = screen.getByLabelText(/main photo/i);
    expect(hero).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /green cardigan/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /newest/i })).toBeInTheDocument();
  });

  it("gives each promise its own box, so one can be emptied to drop it", () => {
    setup();

    expect(screen.getAllByLabelText(/promise/i)).toHaveLength(3);
  });

  it("fills the promise boxes with what the strip says now", () => {
    setup();

    const [first] = screen.getAllByLabelText(/promise/i);
    expect(first).toHaveValue(HOME_DEFAULTS.promises[0]);
  });

  it("leaves a promise box empty where there is no promise to show", () => {
    setup({ content: { ...HOME_DEFAULTS, promises: ["Only this one"] } });

    const boxes = screen.getAllByLabelText(/promise/i);
    expect(boxes[0]).toHaveValue("Only this one");
    expect(boxes[1]).toHaveValue("");
  });

  it("puts a problem beside the box it belongs to", () => {
    setup({ initialState: { errors: { headline: "Give the page a headline." } } });

    expect(screen.getByText("Give the page a headline.")).toBeInTheDocument();
    expect(screen.getByLabelText(/headline/i)).toHaveAttribute("aria-invalid", "true");
  });

  it("says when it has saved", () => {
    setup({ initialState: { errors: {}, saved: true } });

    expect(screen.getByRole("status")).toHaveTextContent(/saved/i);
  });
});
