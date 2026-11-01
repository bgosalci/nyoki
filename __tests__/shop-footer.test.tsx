import { render, screen, within } from "@testing-library/react";

import { ShopFooter } from "@/components/shop/shop-footer";
import { POLICIES, policyHref } from "@/lib/policies/pages";

const groups = [
  { slug: "cards", name: "Cards" },
  { slug: "clothing", name: "Clothing" },
];

describe("the shop's footer", () => {
  it("lists the shop's departments", () => {
    render(<ShopFooter groups={groups} />);

    const shop = screen.getByRole("navigation", { name: "Shop" });
    expect(within(shop).getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(["/shop/cards", "/shop/clothing"]);
  });

  it("leads to every policy and to Contact, under Help", () => {
    render(<ShopFooter groups={groups} />);

    const help = screen.getByRole("navigation", { name: "Help" });
    expect(within(help).getAllByRole("link").map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ...POLICIES.map((policy) => [policy.title, policyHref(policy)]),
      ["Contact us", "/contact"],
    ]);
  });

  it("says whose shop it is, as a company's website must", () => {
    render(<ShopFooter groups={groups} />);

    const legal = screen.getByText(/trading name of Nyoki Limited/);
    expect(legal).toHaveTextContent(/registered in England and Wales, company number 06758218/);
    expect(legal).toHaveTextContent(/VAT number GB 979 8673 25/);
    expect(legal).toHaveTextContent(/Registered office: 82 Containerville, 1 Emma Street, London E2 9FP/);
  });

  it("gives the address to write to on every page, as the law asks of a page selling anything", () => {
    render(<ShopFooter groups={groups} />);

    expect(screen.getByText("Unit 302, 3A Howick Place, London SW1P 1WG")).toBeInTheDocument();
  });
});
