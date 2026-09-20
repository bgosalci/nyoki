import { render, screen } from "@testing-library/react";

import { ProductImages } from "@/components/admin/product-images";

const actions = {
  upload: async () => ({ error: null }),
  remove: async () => {},
  move: async () => {},
};

const images = [
  { id: "img_1", url: "/uploads/products/p1/one.jpg", alt: "Front of the mug", position: 0 },
  { id: "img_2", url: "/uploads/products/p1/two.jpg", alt: null, position: 1 },
  { id: "img_3", url: "/uploads/products/p1/three.jpg", alt: "Base stamp", position: 2 },
];

describe("ProductImages", () => {
  it("explains what to do when there are no photos", () => {
    render(<ProductImages productId="p1" images={[]} actions={actions} />);

    expect(screen.getByText(/no photos yet/i)).toBeInTheDocument();
  });

  it("renders every image with its alt text", () => {
    render(<ProductImages productId="p1" images={images} actions={actions} />);

    expect(screen.getByRole("img", { name: "Front of the mug" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Base stamp" })).toBeInTheDocument();
  });

  it("gives an image with no alt text an empty alt, not a missing one", () => {
    // alt="" marks the image decorative; a missing alt makes screen readers
    // read the filename aloud.
    render(<ProductImages productId="p1" images={images} actions={actions} />);

    const imgs = screen.getAllByRole("presentation");
    expect(imgs).toHaveLength(1);
    expect(imgs[0]).toHaveAttribute("src", "/uploads/products/p1/two.jpg");
  });

  it("marks the first image as the main photo", () => {
    render(<ProductImages productId="p1" images={images} actions={actions} />);

    expect(screen.getByText(/main photo/i)).toBeInTheDocument();
  });

  it("cannot move the first image up or the last image down", () => {
    render(<ProductImages productId="p1" images={images} actions={actions} />);

    const ups = screen.getAllByRole("button", { name: /move up/i });
    const downs = screen.getAllByRole("button", { name: /move down/i });

    expect(ups[0]).toBeDisabled();
    expect(ups[2]).toBeEnabled();
    expect(downs[2]).toBeDisabled();
    expect(downs[0]).toBeEnabled();
  });

  it("accepts several image files at once", () => {
    render(<ProductImages productId="p1" images={[]} actions={actions} />);

    const input = screen.getByLabelText(/add photos/i);
    expect(input).toHaveAttribute("type", "file");
    expect(input).toHaveAttribute("multiple");
    expect(input).toHaveAttribute("accept", "image/jpeg,image/png,image/webp");
  });

  it("announces an upload error", () => {
    render(
      <ProductImages
        productId="p1"
        images={[]}
        actions={actions}
        initialUploadState={{ error: "mug.gif is not an image we can use." }}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("mug.gif is not an image we can use.");
  });
});
