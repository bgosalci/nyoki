import { render, screen } from "@testing-library/react";

import { AdminFooter } from "@/components/admin/admin-footer";

/**
 * The footer is a fixed bar 48px tall. At a phone's 375px the shop's name
 * wrapped onto four lines and spilled out of it, and the account squeezed
 * "Sign out" into "out" - seen once the admin stopped being wider than the
 * screen.
 */
describe("AdminFooter on a phone", () => {
  beforeEach(() => {
    render(<AdminFooter email="qa-owner@example.test" role="OWNER" signOut={async () => {}} />);
  });

  it("leaves the shop's name to wider screens", () => {
    expect(screen.getByText("Nyoki Handmade · shop admin")).toHaveClass("hidden", "sm:block");
  });

  it("shortens the account rather than wrapping it", () => {
    const account = screen.getByText("qa-owner@example.test", { exact: false });
    expect(account).toHaveClass("truncate", "min-w-0");
  });

  it("never squeezes Sign out", () => {
    expect(screen.getByRole("button", { name: "Sign out" })).toHaveClass("shrink-0", "whitespace-nowrap");
  });
});
