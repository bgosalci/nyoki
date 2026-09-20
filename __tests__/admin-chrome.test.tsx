import { render, screen, within } from "@testing-library/react";

import { AdminFooter } from "@/components/admin/admin-footer";
import { AdminTopBar } from "@/components/admin/admin-top-bar";
import { sectionTitle } from "@/lib/admin/nav";

let pathname = "/admin";
jest.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

describe("sectionTitle", () => {
  it.each([
    ["/admin", "Overview"],
    ["/admin/products", "Products"],
    ["/admin/products/abc/edit", "Products"],
    ["/admin/settings/team/abc", "Settings"],
    ["/admin/sales/new", "Sales"],
  ])("%s is titled %s", (path, title) => {
    expect(sectionTitle(path)).toBe(title);
  });

  it("falls back to the shop name off the map", () => {
    expect(sectionTitle("/admin/whatever")).toBe("Nyoki");
  });
});

describe("AdminTopBar", () => {
  it("is a fixed banner naming the current section", () => {
    pathname = "/admin/products/abc";
    render(<AdminTopBar />);

    const banner = screen.getByRole("banner");
    expect(banner).toHaveClass("fixed");
    expect(banner).toHaveTextContent("Products");
  });

  it("carries the Nyoki mark, which is the shop's name in the shop's own hand", () => {
    pathname = "/admin/products";
    render(<AdminTopBar />);

    const banner = screen.getByRole("banner");
    expect(within(banner).getByAltText(/nyoki/i)).toBeInTheDocument();
  });

  it("takes the mark home to the overview", () => {
    pathname = "/admin/products";
    render(<AdminTopBar />);

    expect(within(screen.getByRole("banner")).getByRole("link")).toHaveAttribute("href", "/admin");
  });
});

describe("AdminFooter", () => {
  const signOut = async () => {};

  it("is fixed to the bottom and shows who is signed in", () => {
    render(<AdminFooter email="njomza@nyoki.co.uk" role="OWNER" signOut={signOut} />);

    const footer = screen.getByRole("contentinfo");
    expect(footer).toHaveClass("fixed");
    expect(footer).toHaveTextContent("njomza@nyoki.co.uk");
    expect(footer).toHaveTextContent(/owner/i);
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
  });
});
