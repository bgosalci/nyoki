import { render, screen } from "@testing-library/react";

import { RichText } from "@/components/shop/rich-text";

describe("RichText", () => {
  it("shows each paragraph Njomza typed as its own paragraph", () => {
    const { container } = render(<RichText text={"Send heavenly wishes.\r\n\r\nA 2-in-1 keepsake."} />);

    expect([...container.querySelectorAll("p")].map((p) => p.textContent)).toEqual([
      "Send heavenly wishes.",
      "A 2-in-1 keepsake.",
    ]);
  });

  it("keeps a single line break where she put one", () => {
    const { container } = render(<RichText text={"Card\nEnvelope"} />);

    expect(container.querySelector("p")?.innerHTML).toBe("Card<br>Envelope");
  });

  it("shows bold and italic", () => {
    render(<RichText text="Send **heavenly** wishes, *gently*." />);

    expect(screen.getByText("heavenly").tagName).toBe("STRONG");
    expect(screen.getByText("gently").tagName).toBe("EM");
  });

  it("shows text that is both, bold and italic", () => {
    render(<RichText text="***Handmade***" />);

    const word = screen.getByText("Handmade");
    expect(word.tagName).toBe("EM");
    expect(word.parentElement?.tagName).toBe("STRONG");
  });

  it("shows bullets as a list", () => {
    render(<RichText text={"Includes:\n- **Recycled** card\n- Envelope"} />);

    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual(["Recycled card", "Envelope"]);
    expect(screen.getByText("Recycled").tagName).toBe("STRONG");
  });

  it("shows the markers' characters when they are not formatting", () => {
    render(<RichText text={"5 * 3, and \\*not italic\\*"} />);

    expect(screen.getByText("5 * 3, and *not italic*")).toBeInTheDocument();
  });

  it("styles the block it is given", () => {
    const { container } = render(<RichText text="One." className="text-sm" />);

    expect(container.firstChild).toHaveClass("text-sm");
  });
});
