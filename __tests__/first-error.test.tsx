import { render, screen } from "@testing-library/react";
import { useRef } from "react";

import { focusFirstError, useFocusFirstError } from "@/lib/forms/first-error";

// jsdom lays nothing out and has no scrollIntoView; a stand-in records where
// the page was asked to scroll.
const scrolled = jest.fn();
beforeEach(() => {
  scrolled.mockClear();
  Element.prototype.scrollIntoView = function (this: Element, options?: boolean | ScrollIntoViewOptions) {
    scrolled(this, options);
  };
});

describe("focusFirstError", () => {
  it("moves to the first field marked invalid, in page order, and brings it to the middle of the screen", () => {
    render(
      <form data-testid="form">
        <input aria-label="Name" />
        <input aria-label="Address" aria-invalid="true" />
        <input aria-label="Postcode" aria-invalid="true" />
      </form>,
    );

    focusFirstError(screen.getByTestId("form"));

    expect(screen.getByLabelText("Address")).toHaveFocus();
    // The middle keeps it clear of a sticky header above and a sticky bar below.
    expect(scrolled).toHaveBeenCalledWith(screen.getByLabelText("Address"), { block: "center" });
  });

  it("moves to the chosen radio of a set marked invalid, or the first, and shows the whole set", () => {
    render(
      <div data-testid="form">
        <div role="radiogroup" aria-label="Delivery" aria-invalid="true">
          <input type="radio" name="rate" aria-label="Tracked 48" />
          <input type="radio" name="rate" aria-label="Tracked 24" />
        </div>
      </div>,
    );

    focusFirstError(screen.getByTestId("form"));

    expect(screen.getByLabelText("Tracked 48")).toHaveFocus();
    expect(scrolled).toHaveBeenCalledWith(screen.getByRole("radiogroup"), { block: "center" });
  });

  it("moves into a group whose error belongs to the whole of it", () => {
    render(
      <div data-testid="form">
        <fieldset data-invalid="">
          <legend>Colours</legend>
          <input aria-label="Colour 1" />
        </fieldset>
      </div>,
    );

    focusFirstError(screen.getByTestId("form"));

    expect(screen.getByLabelText("Colour 1")).toHaveFocus();
  });

  it("falls back to what it is given when no field is marked, and does nothing without it", () => {
    render(
      <div data-testid="form">
        <input aria-label="Name" />
        <p tabIndex={-1} data-testid="notice">
          Your basket has changed.
        </p>
      </div>,
    );

    expect(focusFirstError(screen.getByTestId("form"))).toBeNull();
    expect(document.body).toHaveFocus();

    focusFirstError(screen.getByTestId("form"), screen.getByTestId("notice"));
    expect(screen.getByTestId("notice")).toHaveFocus();
  });
});

describe("useFocusFirstError", () => {
  function Form({ rejection }: { rejection: object | null }) {
    const ref = useRef<HTMLFormElement>(null);
    useFocusFirstError(ref, rejection);
    return (
      <form ref={ref}>
        <input aria-label="Name" aria-invalid={rejection ? "true" : undefined} />
      </form>
    );
  }

  it("moves only once a save is turned down, and again for each one", () => {
    const { rerender } = render(<Form rejection={null} />);
    expect(document.body).toHaveFocus();

    rerender(<Form rejection={{ errors: { name: "Give it a name." } }} />);
    expect(screen.getByLabelText("Name")).toHaveFocus();

    screen.getByLabelText("Name").blur();
    rerender(<Form rejection={{ errors: { name: "Give it a name." } }} />);
    expect(screen.getByLabelText("Name")).toHaveFocus();
  });
});
