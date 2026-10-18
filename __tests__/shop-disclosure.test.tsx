import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Disclosure } from "@/components/shop/disclosure";

function renderDisclosure() {
  render(
    <Disclosure title="Need to know">
      <p>147mm x 104mm</p>
    </Disclosure>,
  );
  const title = screen.getByText("Need to know");
  const summary = title.closest("summary")!;
  return {
    title,
    summary,
    content: screen.getByText("147mm x 104mm"),
    icon: summary.querySelector('[data-mark="plus-minus"]'),
    upright: summary.querySelector('[data-bar="upright"]'),
    across: summary.querySelector('[data-bar="across"]'),
  };
}

describe("Disclosure", () => {
  it("starts closed, showing only its title", () => {
    const { title, content } = renderDisclosure();

    expect(title.closest("details")).not.toHaveAttribute("open");
    expect(content).not.toBeVisible();
  });

  it("opens when its title is clicked", async () => {
    const { title, content } = renderDisclosure();

    await userEvent.setup().click(title);

    expect(title.closest("details")).toHaveAttribute("open");
    expect(content).toBeVisible();
  });

  it("is marked with a + in a circle like the Save heart's, not the browser's triangle", () => {
    const { summary, icon, upright, across } = renderDisclosure();
    const circle = icon?.closest('[aria-hidden="true"]');

    // list-none and the webkit marker rule are what hide the triangle.
    expect(summary).toHaveClass("list-none", "gap-3");
    // The heart's button: size-9, round, a light-slate border.
    expect(circle).toHaveClass("size-9", "rounded-full", "border-nyoki-light-slate");
    expect(icon).toHaveClass("text-black");
    expect(upright).not.toBeNull();
    expect(across).not.toBeNull();
  });

  it("rolls the + over into a − as it opens", () => {
    const { title, icon, upright } = renderDisclosure();

    expect(title.closest("details")).toHaveClass("group");
    // The whole mark turns half over while its upright bar lies down, so
    // it ends as a − - and closing rolls it back up into a +.
    expect(icon).toHaveClass("transition-transform", "group-open:rotate-180");
    expect(upright).toHaveClass("rotate-90", "group-open:rotate-0");
  });

  it("changes without rolling for anyone who asks for less motion", () => {
    const { icon, upright } = renderDisclosure();

    expect(icon).toHaveClass("motion-reduce:transition-none");
    expect(upright).toHaveClass("motion-reduce:transition-none");
  });
});
