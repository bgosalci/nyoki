import { render } from "@testing-library/react";

import { ProductThumbnail } from "@/components/admin/product-thumbnail";

const image = { url: "/uploads/card.jpg", alt: "Front of the card" };

describe("ProductThumbnail", () => {
  it("is big enough to tell two cream cards apart", () => {
    const { container } = render(<ProductThumbnail image={image} />);

    expect(container.querySelector("img")).toHaveClass("size-14");
  });

  it("can be twice that where the photographs are the point", () => {
    const { container } = render(<ProductThumbnail image={image} size="large" />);

    expect(container.querySelector("img")).toHaveClass("size-28");
  });

  it("can be half that on a phone and twice it from sm up, for the products list", () => {
    const { container } = render(<ProductThumbnail image={image} size="list" />);

    expect(container.querySelector("img")).toHaveClass("size-14", "sm:size-28");
    // Asked for at the larger, so it is sharp at both.
    expect(container.querySelector("img")).toHaveAttribute("width", "112");
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

    expect(container.querySelectorAll("img")).toHaveLength(0);
    expect(container.querySelector("div")).toHaveClass("size-14");
  });

  it("holds it at whatever size the row is drawing", () => {
    const { container } = render(<ProductThumbnail image={null} size="large" />);

    expect(container.querySelector("div")).toHaveClass("size-28");
  });
});
