import { render } from "@testing-library/react";

import { ProductLayout } from "@/components/shop/product-layout";

function renderLayout(morePhotos: React.ReactNode = <p>More photos</p>) {
  const { container } = render(
    <ProductLayout mainPhoto={<p>Main photo</p>} morePhotos={morePhotos}>
      <p>Description</p>
    </ProductLayout>,
  );
  const slot = (text: string) => [...container.querySelectorAll("p")].find((p) => p.textContent === text)!.parentElement!;
  return { container, slot };
}

describe("ProductLayout", () => {
  it("on a phone, puts the details - and so the description - straight after the main photo", () => {
    const { container } = renderLayout();

    expect([...container.querySelectorAll("p")].map((p) => p.textContent)).toEqual([
      "Main photo",
      "Description",
      "More photos",
    ]);
  });

  it("from md up, sets the photos down the left and the details down the right", () => {
    const { container, slot } = renderLayout();

    expect(container.firstChild).toHaveClass("grid", "md:grid-cols-2");
    expect(slot("Main photo")).toHaveClass("md:col-start-1", "md:row-start-1");
    expect(slot("More photos")).toHaveClass("md:col-start-1", "md:row-start-2");
    expect(slot("Description")).toHaveClass("md:col-start-2", "md:row-span-2", "md:row-start-1");
  });

  it("keeps the details in view while the photos scroll past, from md up", () => {
    const { slot } = renderLayout();

    expect(slot("Description")).toHaveClass("md:sticky", "md:self-start");
  });

  it("leaves no empty slot when there is only the one photo", () => {
    const { container } = renderLayout(null);

    expect(container.firstChild?.childNodes).toHaveLength(2);
  });
});
