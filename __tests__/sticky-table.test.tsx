import { render, screen } from "@testing-library/react";

import { PinnedHeight } from "@/components/admin/pinned-height";
import { STICKY_TOP, Th } from "@/components/admin/th";

describe("Th", () => {
  it("is a sticky column header whose offset follows whatever is pinned above it", () => {
    render(<table><thead><tr><Th>Name</Th></tr></thead></table>);

    const th = screen.getByRole("columnheader", { name: "Name" });
    expect(th).toHaveClass("sticky");
    expect(th).toHaveAttribute("scope", "col");
    expect(th.style.top).toBe(STICKY_TOP);
    expect(STICKY_TOP).toContain("var(--pinned-height");
  });

  it("aligns numbers to the right when asked", () => {
    render(<table><thead><tr><Th align="right">Price</Th></tr></thead></table>);

    expect(screen.getByRole("columnheader", { name: "Price" })).toHaveClass("text-right");
  });

  it("can carry a label only screen readers see", () => {
    render(<table><thead><tr><Th srOnly>Actions</Th></tr></thead></table>);

    const th = screen.getByRole("columnheader", { name: "Actions" });
    expect(th.querySelector(".sr-only")).toHaveTextContent("Actions");
  });
});

describe("PinnedHeight", () => {
  const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetHeight");

  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", { configurable: true, get: () => 120 });
  });

  afterEach(() => {
    if (original) Object.defineProperty(HTMLElement.prototype, "offsetHeight", original);
  });

  it("renders its children", () => {
    render(<div><PinnedHeight className="sticky"><h1>Products</h1></PinnedHeight></div>);

    expect(screen.getByText("Products")).toBeInTheDocument();
  });

  it("publishes its height to the parent as --pinned-height, so a sticky table header can sit beneath it", () => {
    const { container } = render(<div><PinnedHeight className="sticky"><p>filters</p></PinnedHeight></div>);

    expect((container.firstElementChild as HTMLElement).style.getPropertyValue("--pinned-height")).toBe("120px");
  });

  it("copes without ResizeObserver, as jsdom and older browsers lack it", () => {
    expect(typeof ResizeObserver).toBe("undefined");
    expect(() => render(<PinnedHeight className="x">ok</PinnedHeight>)).not.toThrow();
  });
});
