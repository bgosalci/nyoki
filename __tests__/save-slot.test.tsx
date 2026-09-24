import { act, render, screen } from "@testing-library/react";
import Link from "next/link";

import { ProductHeader } from "@/components/admin/product-header";
import { SaveSlot, SaveSlotProvider, TopSaveButton } from "@/components/admin/save-slot";

jest.mock("next/navigation", () => ({ usePathname: () => "/admin/products/p1/price" }));

const slot = () => document.querySelector("[data-save-slot]");

describe("SaveSlot and TopSaveButton", () => {
  it("draw the form's Save beside the title", () => {
    render(
      <SaveSlotProvider>
        <SaveSlot />
        <form id="f" />
        <TopSaveButton form="f" pending={false} label="Save" />
      </SaveSlotProvider>,
    );

    expect(slot()).toContainElement(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute("form", "f");
  });

  it("follow the slot when the header is replaced, as it is on moving to another product", () => {
    // The whole header is swapped for the next product's. Found by searching
    // the page instead, the button could be drawn into the header on its way
    // out and left with no place in the one that replaced it.
    function Page({ product }: { product: string }) {
      return (
        <SaveSlotProvider>
          <SaveSlot key={product} />
          <form id="f" />
          <TopSaveButton form="f" pending={false} label="Save" />
        </SaveSlotProvider>
      );
    }
    const { rerender } = render(<Page product="a" />);
    const first = slot();

    act(() => rerender(<Page product="b" />));

    expect(slot()).not.toBe(first);
    expect(slot()).toContainElement(screen.getByRole("button", { name: "Save" }));
  });

  it("show nothing where there is no slot", () => {
    render(
      <>
        <form id="f" />
        <TopSaveButton form="f" pending={false} label="Save" />
      </>,
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("ProductHeader", () => {
  it("keeps the name, Save and the Details and Price tabs pinned while the page scrolls", () => {
    render(
      <SaveSlotProvider>
        <ProductHeader productId="p1" name="Handmade Three Christmas Stars" />
      </SaveSlotProvider>,
    );

    const header = screen.getByRole("heading", { name: "Handmade Three Christmas Stars" }).closest("[data-pinned]")!;
    expect(header).toHaveClass("sticky", "top-14");
    expect(header).toContainElement(screen.getByRole("navigation", { name: "Product" }));
    expect(header).toContainElement(slot() as HTMLElement);
  });

  it("pins the way back, Previous and Next with them, as part of the header", () => {
    render(
      <SaveSlotProvider>
        <ProductHeader
          productId="p1"
          name="Handmade Three Christmas Stars"
          steps={
            <nav aria-label="Other products">
              <Link href="/admin/products">Back to all products</Link> <Link href="/admin/products/p2/price">Next</Link>
            </nav>
          }
        />
      </SaveSlotProvider>,
    );

    const header = screen.getByRole("heading", { name: "Handmade Three Christmas Stars" }).closest("[data-pinned]")!;
    expect(header).toContainElement(screen.getByRole("link", { name: "Back to all products" }));
    expect(header).toContainElement(screen.getByRole("link", { name: "Next" }));
  });
});
