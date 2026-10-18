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

  it("gives any spare height to the last row, so tall details never push the photos apart", () => {
    // The details span both rows; taller than the photos, their extra height
    // was shared between the rows, and a 12px gap between the first two
    // photos opened to 199px.
    const { container } = renderLayout();

    expect(container.firstChild).toHaveClass("md:grid-rows-[auto_1fr]");
  });

  it("keeps the details in view while the photos scroll past, from md up", () => {
    const { slot } = renderLayout();

    expect(slot("Description")).toHaveClass("md:sticky", "md:self-start");
  });

  it("lets long details scroll with the page instead, when asked", () => {
    // A card with its options to choose can be taller than the screen; held
    // in view, its last options would stay out of reach until the photos ran
    // out.
    const { container } = render(
      <ProductLayout mainPhoto={<p>Main photo</p>} pinDetails={false}>
        <p>Options</p>
      </ProductLayout>,
    );
    const details = [...container.querySelectorAll("p")].find((p) => p.textContent === "Options")!.parentElement!;

    expect(details).not.toHaveClass("md:sticky");
    expect(details).toHaveClass("md:col-start-2", "md:row-span-2", "md:row-start-1", "md:self-start");
  });

  it("leaves no empty slot when there is only the one photo", () => {
    const { container } = renderLayout(null);

    expect(container.firstChild?.childNodes).toHaveLength(2);
  });
});
