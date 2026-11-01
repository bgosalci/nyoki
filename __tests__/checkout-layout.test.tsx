import { render, screen, within } from "@testing-library/react";

import CheckoutLayout from "@/app/(checkout)/layout";
import { POLICIES, policyHref } from "@/lib/policies/pages";

describe("checkout's own chrome", () => {
  it("keeps the policies a link away, though the shop's footer stays behind", () => {
    render(<CheckoutLayout>{null}</CheckoutLayout>);

    const footer = screen.getByRole("contentinfo");
    const links = within(footer).getAllByRole("link").map((link) => [link.textContent, link.getAttribute("href")]);
    expect(links).toEqual([["Contact us", "/contact"], ...POLICIES.map((policy) => [policy.short, policyHref(policy)])]);
  });
});
