import { render, screen } from "@testing-library/react";

import { ExportLink } from "@/components/admin/export-link";

describe("ExportLink", () => {
  it("downloads the list as it is filtered", () => {
    render(<ExportLink q="card" status="ACTIVE" category="christmas-cards" count={21} />);

    const link = screen.getByRole("link", { name: /export csv/i });
    expect(link).toHaveAttribute("href", "/admin/products/export?q=card&status=ACTIVE&category=christmas-cards");
    expect(link).toHaveAttribute("download");
  });

  it("says how many pieces the file will hold", () => {
    render(<ExportLink q="" status="" category="" count={237} />);

    expect(screen.getByRole("link", { name: /export csv/i })).toHaveAttribute("title", "All 237 products, as a spreadsheet file");
    expect(screen.getByRole("link")).toHaveAttribute("href", "/admin/products/export");
  });
});
