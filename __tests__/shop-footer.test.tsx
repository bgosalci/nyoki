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

  it("ends with whose shop it is, and nothing more", () => {
    render(<ShopFooter groups={groups} />);

    const legal = screen.getByText(/trading name of Nyoki Limited/);
    expect(legal).toHaveTextContent(
      "Nyoki Handmade is the trading name of Nyoki Limited, registered in England and Wales, company number 06758218. VAT number GB 979 8673 25.",
    );
    expect(legal.parentElement!.children).toHaveLength(1);
  });

  it("leaves the registered office, the address and the copyright line to the policies", () => {
    // Every policy ends with them in full (BusinessDetails), which is where a
    // company's website shows its registered office.
    render(<ShopFooter groups={groups} />);

    expect(screen.queryByText(/Registered office/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Howick Place/)).not.toBeInTheDocument();
    expect(screen.queryByText(/©/)).not.toBeInTheDocument();
  });
});
