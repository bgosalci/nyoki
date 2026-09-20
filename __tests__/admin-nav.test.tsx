import { isCurrent } from "@/components/admin/admin-nav";

describe("isCurrent", () => {
  it("marks the overview current only on an exact match", () => {
    expect(isCurrent("/admin", "/admin")).toBe(true);
  });

  it("does not mark the overview current on a child page", () => {
    // The whole reason the overview is special-cased: startsWith would light
    // up "Overview" on every page in the CMS.
    expect(isCurrent("/admin/products", "/admin")).toBe(false);
  });

  it("marks a section current on its own page", () => {
    expect(isCurrent("/admin/products", "/admin/products")).toBe(true);
  });

  it("marks a section current on a page beneath it", () => {
    expect(isCurrent("/admin/products/abc123/edit", "/admin/products")).toBe(true);
  });

  it("does not match a sibling with a shared prefix", () => {
    expect(isCurrent("/admin/products-archive", "/admin/products")).toBe(false);
  });

  it("does not mark an unrelated section current", () => {
    expect(isCurrent("/admin/orders", "/admin/products")).toBe(false);
  });
});
