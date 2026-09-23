import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ProductThumbnail } from "@/components/admin/product-thumbnail";

const image = { url: "/uploads/card.jpg", alt: "Front of the card" };

const images = (container: HTMLElement) => [...container.querySelectorAll("img")];

describe("ProductThumbnail", () => {
  it("is big enough to tell two cream cards apart", () => {
    const { container } = render(<ProductThumbnail image={image} />);

    expect(container.querySelector("img")).toHaveClass("size-14");
  });

  it("can be twice that where the photographs are the point", () => {
    const { container } = render(<ProductThumbnail image={image} size="large" />);

    expect(container.querySelector("img")).toHaveClass("size-28");
  });

  it("asks for a photo the size it will draw it, not a thumbnail stretched", () => {
    const { container } = render(<ProductThumbnail image={image} size="large" />);

    expect(container.querySelector("img")).toHaveAttribute("width", "112");
  });

  it("leaves the photo out of the row's label, which the name already carries", () => {
    const { container } = render(<ProductThumbnail image={image} />);

    // Announced straight after the product name, a description here would say
    // the same thing twice.
    expect(container.querySelector("img")).toHaveAttribute("alt", "");
  });

  it("holds the space when a product has no photo yet", () => {
    const { container } = render(<ProductThumbnail image={null} />);

    expect(images(container)).toHaveLength(0);
    expect(container.querySelector("div")).toHaveClass("size-14");
  });

  it("shows only the thumbnail where a closer look is not on offer", async () => {
    const user = userEvent.setup();
    const { container } = render(<ProductThumbnail image={image} />);

    await user.hover(container.querySelector("img")!);

    expect(images(container)).toHaveLength(1);
  });

  it("shows a larger photo on hover where it is", async () => {
    const user = userEvent.setup();
    const { container } = render(<ProductThumbnail image={image} preview />);

    await user.hover(container.querySelector("img")!);

    // Bigger, and the same photograph - not a second one to load and choose.
    const shown = images(container);
    expect(shown).toHaveLength(2);
    expect(shown[1]).toHaveAttribute("alt", "");
  });

  it("takes the larger photo away again", async () => {
    const user = userEvent.setup();
    const { container } = render(<ProductThumbnail image={image} preview />);

    const thumbnail = container.querySelector("img")!;
    await user.hover(thumbnail);
    await user.unhover(thumbnail);

    expect(images(container)).toHaveLength(1);
  });

  it("lets the pointer through the larger photo, so it cannot flicker", async () => {
    // Under the cursor, a preview that captures the pointer ends the hover
    // that opened it, which closes it, which starts it again.
    const user = userEvent.setup();
    const { container } = render(<ProductThumbnail image={image} preview />);

    await user.hover(container.querySelector("img")!);

    expect(images(container)[1].closest("[class*='pointer-events-none']")).not.toBeNull();
  });

  it("offers no closer look at a product with no photo", async () => {
    const user = userEvent.setup();
    const { container } = render(<ProductThumbnail image={null} preview />);

    await user.hover(container.querySelector("div")!);

    expect(images(container)).toHaveLength(0);
  });
});

describe("the space held for a missing photo", () => {
  it("matches whatever size the row is drawing", () => {
    const { container } = render(<ProductThumbnail image={null} size="large" />);

    expect(container.querySelector("div")).toHaveClass("size-28");
  });
});
