import { render, screen } from "@testing-library/react";

import { PlainText } from "@/components/shop/plain-text";

describe("PlainText", () => {
  it("shows the text exactly as typed, asterisks, dashes and backslashes included", () => {
    render(<PlainText text={"10*15*20cm \\- folded"} />);

    expect(screen.getByText("10*15*20cm \\- folded")).toBeInTheDocument();
  });

  it("keeps a line starting with a dash as a line, not a bullet", () => {
    const { container } = render(<PlainText text={"- Hand wash\n- Dry flat"} />);

    expect(container.querySelector("ul")).toBeNull();
    expect(container.querySelector("p")?.textContent).toBe("- Hand wash\n- Dry flat");
    expect(container.querySelector("p")).toHaveClass("whitespace-pre-line");
  });

  it("splits paragraphs at a blank line, whatever line endings were saved", () => {
    const { container } = render(<PlainText text={"Hand wash.\r\n\r\nDry flat."} />);

    expect([...container.querySelectorAll("p")].map((p) => p.textContent)).toEqual(["Hand wash.", "Dry flat."]);
  });

  it("styles the block it is given", () => {
    const { container } = render(<PlainText text="One." className="text-sm" />);

    expect(container.firstChild).toHaveClass("text-sm");
  });
});
