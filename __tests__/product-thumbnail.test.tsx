import { render, screen } from "@testing-library/react";

import { ProductThumbnail } from "@/components/admin/product-thumbnail";

describe("ProductThumbnail", () => {
  it("shows the product's first photo", () => {
    render(<ProductThumbnail image={{ url: "/uploads/products/p1/front.jpg", alt: "Front of the card" }} />);

    // next/image rewrites the src through its optimiser, so the original
    // filename survives inside the encoded url rather than as the whole value.
    expect(screen.getByRole("presentation")).toHaveAttribute("src", expect.stringContaining("front.jpg"));
  });

  it("gives the photo an empty alt, since the product name sits beside it in the row", () => {
    // A description here would be read out straight after the name, saying the
    // same thing twice.
    render(<ProductThumbnail image={{ url: "/uploads/products/p1/front.jpg", alt: "Front of the card" }} />);

    expect(screen.getByRole("presentation")).toHaveAttribute("alt", "");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("shows a placeholder rather than a broken image when there is no photo", () => {
    const { container } = render(<ProductThumbnail image={null} />);

    expect(container.querySelector("img")).toBeNull();
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("keeps a fixed square either way, so rows stay an even height", () => {
    const withPhoto = render(<ProductThumbnail image={{ url: "/a.jpg", alt: null }} />).container.firstElementChild;
    const without = render(<ProductThumbnail image={null} />).container.firstElementChild;

    expect(withPhoto).toHaveClass("size-11");
    expect(without).toHaveClass("size-11");
  });
});
