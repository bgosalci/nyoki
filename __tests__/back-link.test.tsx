import { render, screen } from "@testing-library/react";

import { BackLink } from "@/components/admin/back-link";

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
});
