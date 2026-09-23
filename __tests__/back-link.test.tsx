import { render, screen } from "@testing-library/react";

import { BackLink } from "@/components/admin/back-link";
import { ui } from "@/lib/brand/ui";

describe("BackLink", () => {
  it("links back to the list it names", () => {
    render(<BackLink href="/admin/products">Back to all products</BackLink>);

    const link = screen.getByRole("link", { name: /back to all products/i });
    expect(link).toHaveAttribute("href", "/admin/products");
  });

  it("carries an arrow the screen reader does not read out", () => {
    render(<BackLink href="/admin/products">Back to all products</BackLink>);

    expect(screen.getByText("←")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("link").textContent).toContain("Back to all products");
  });

  it("is a button with room to hit, not a line of small underlined text", () => {
    render(<BackLink href="/admin/products">Back to all products</BackLink>);

    const link = screen.getByRole("link");
    expect(link.className).toContain(ui.buttonSecondary);
    expect(link).toHaveClass("py-2");
    expect(link.className).not.toContain("underline");
  });
});
