import { render, screen } from "@testing-library/react";

import { BusinessDetails } from "@/components/shop/business-details";
import { BUSINESS } from "@/lib/policies/business";

describe("BusinessDetails", () => {
  it("names the company, its number and its VAT number", () => {
    render(<BusinessDetails business={BUSINESS} />);

    const about = screen.getByRole("region", { name: "Business details" });
    expect(about).toHaveTextContent(
      "Nyoki Handmade is the trading name of Nyoki Limited, registered in England and Wales, company number 06758218. VAT number GB 979 8673 25.",
    );
  });

  it("gives the registered office, as a company's website must", () => {
    render(<BusinessDetails business={BUSINESS} />);

    expect(screen.getByRole("region", { name: "Business details" })).toHaveTextContent(
      "Registered office: 82 Containerville, 1 Emma Street, London E2 9FP.",
    );
  });

  it("gives the address and email to write to, once there are some", () => {
    render(<BusinessDetails business={{ ...BUSINESS, address: ["1 Mill Yard", "Ilkley", "LS29 9AA"], email: "hello@nyoki.co.uk" }} />);

    expect(screen.getByText("1 Mill Yard, Ilkley LS29 9AA")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "hello@nyoki.co.uk" })).toHaveAttribute("href", "mailto:hello@nyoki.co.uk");
  });

  it("points to the Contact page while there is neither", () => {
    render(<BusinessDetails business={{ ...BUSINESS, address: null, email: null }} />);

    expect(screen.getByRole("link", { name: "Contact page" })).toHaveAttribute("href", "/contact");
    expect(screen.queryByRole("link", { name: /@/ })).not.toBeInTheDocument();
  });
});
