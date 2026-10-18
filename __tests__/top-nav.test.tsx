import { render, screen } from "@testing-library/react";

import { TopNav } from "@/components/shop/top-nav";

jest.mock("next/navigation", () => ({ usePathname: () => "/shop" }));

describe("TopNav", () => {
  it("sets its links a size smaller and closer together on a phone, so the logo has room", () => {
    render(<TopNav />);

    expect(screen.getByRole("list")).toHaveClass("gap-4", "sm:gap-6");
    for (const link of screen.getAllByRole("link")) expect(link).toHaveClass("text-xs", "sm:text-sm");
  });
});
