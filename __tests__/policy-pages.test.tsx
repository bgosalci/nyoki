import { render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";

import { ADMIN_SESSION_DAYS, SESSION_COOKIE } from "@/lib/auth/cookie";
import { CUSTOMER_SESSION_COOKIE, CUSTOMER_SESSION_DAYS } from "@/lib/account/cookie";
import { BASKET_COOKIE, BASKET_COOKIE_DAYS } from "@/lib/basket/cookie";
import { POLICIES, POLICIES_UPDATED, policyHref } from "@/lib/policies/pages";
import type { RateSource } from "@/lib/delivery/parcel";

const rateSources = jest.fn();

jest.mock("server-only", () => ({}));
// jest.mock() does not go through the @/ alias, so this is relative.
jest.mock("../src/lib/delivery/store", () => ({ rateSources: (args: unknown) => rateSources(args) }));

import CookiesPage from "@/app/(shop)/policies/cookies/page";
import DeliveryPage from "@/app/(shop)/policies/delivery/page";
import PoliciesPage from "@/app/(shop)/policies/page";
import PrivacyPage from "@/app/(shop)/policies/privacy/page";
import ReturnsPage from "@/app/(shop)/policies/returns/page";
import TermsPage from "@/app/(shop)/policies/terms/page";

const tracked48: RateSource = {
  id: "t48",
  name: "Royal Mail Tracked 48",
  pricePence: 0,
  byWeight: true,
  freeOverPence: 0,
  minDays: 2,
  maxDays: 3,
  bands: [{ size: "LARGE_LETTER", upToGrams: 1000, pricePence: 290 }],
};
const tracked24: RateSource = {
  id: "t24",
  name: "Royal Mail Tracked 24",
  pricePence: 0,
  byWeight: true,
  freeOverPence: null,
  minDays: 1,
  maxDays: 2,
  bands: [
    { size: "LARGE_LETTER", upToGrams: 1000, pricePence: 390 },
    { size: "SMALL_PARCEL", upToGrams: 2000, pricePence: 480 },
  ],
};

beforeEach(() => {
  rateSources.mockReset().mockResolvedValue([tracked48, tracked24]);
});

/** The text of the section a heading opens. */
function section(name: string | RegExp): HTMLElement {
  return screen.getByRole("heading", { level: 2, name }).closest("section")!;
}

const PAGES: { slug: string; render: () => ReactElement | Promise<ReactElement> }[] = [
  { slug: "delivery", render: () => DeliveryPage() },
  { slug: "returns", render: () => ReturnsPage() },
  { slug: "terms", render: () => TermsPage() },
  { slug: "privacy", render: () => PrivacyPage() },
  { slug: "cookies", render: () => CookiesPage() },
];

describe.each(PAGES)("the $slug page", ({ slug, render: page }) => {
  const policy = POLICIES.find((each) => each.slug === slug)!;

  it("is titled as the footer names it, and says when it was last changed", async () => {
    render(await page());

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(policy.title);
    expect(screen.getByText(`Last updated ${POLICIES_UPDATED}`)).toBeInTheDocument();
  });

  it("opens with contents whose every link lands on a heading of the page", async () => {
    const { container } = render(await page());

    const contents = screen.getByRole("navigation", { name: "On this page" });
    const links = within(contents).getAllByRole("link");
    expect(links.length).toBeGreaterThanOrEqual(4);
    for (const link of links) {
      const id = link.getAttribute("href")!.replace(/^#/, "");
      const target = container.querySelector(`[id="${id}"]`);
      expect(target).not.toBeNull();
      expect(within(target as HTMLElement).getByRole("heading", { level: 2 })).toHaveTextContent(link.textContent!);
    }
  });

  it("leads to the other policies", async () => {
    render(await page());

    const others = screen.getByRole("navigation", { name: "Our other policies" });
    expect(within(others).getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(
      POLICIES.filter((each) => each.slug !== slug).map(policyHref),
    );
  });

  it("names the business behind the shop", async () => {
    render(await page());

    const about = screen.getByRole("region", { name: "Business details" });
    expect(about).toHaveTextContent("Nyoki Handmade is the trading name of Nyoki Limited");
    expect(about).toHaveTextContent("company number 06758218");
    expect(about).toHaveTextContent("VAT number GB 979 8673 25");
  });
});

describe("the policies page", () => {
  it("lists every policy with a line on what it covers", () => {
    render(<PoliciesPage />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Policies");
    for (const policy of POLICIES) {
      const link = screen.getByRole("link", { name: policy.title });
      expect(link).toHaveAttribute("href", policyHref(policy));
      expect(screen.getByText(policy.summary)).toBeInTheDocument();
    }
  });
});

describe("returns and refunds", () => {
  it("gives 14 days from delivery to change your mind, and 14 more to send it back", () => {
    render(<ReturnsPage />);

    const text = section("Changing your mind");
    expect(text).toHaveTextContent(/14 days, starting the day after it arrives/);
    expect(text).toHaveTextContent(/send it back within 14 days of telling us/);
  });

  it("keeps personalised pieces back, but not pieces made to order exactly as shown", () => {
    render(<ReturnsPage />);

    const text = section("Personalised pieces");
    expect(text).toHaveTextContent(/can't be returned because you've changed your mind/);
    expect(text).toHaveTextContent(/made to order .* exactly as it is on the shop, .* can be returned/);
    expect(text).toHaveTextContent(/if we haven't started making it, we'll cancel it and refund you in full/);
  });

  it("asks the shopper to pay for a change-of-mind return, and refunds delivery only up to the least expensive way", () => {
    render(<ReturnsPage />);

    expect(section("Sending it back")).toHaveTextContent(/you pay for sending it back/);
    const refunds = section("Your refund");
    expect(refunds).toHaveTextContent(/least expensive delivery we offer/);
    expect(refunds).toHaveTextContent(/within 14 days of the piece reaching us, or of your proof of postage if that comes first/);
  });

  it("says where to send a return", () => {
    render(<ReturnsPage />);

    expect(section("Sending it back")).toHaveTextContent("Send it to Nyoki Limited, Unit 302, 3A Howick Place, London SW1P 1WG");
  });

  it("takes something off for wear, rather than refusing the return", () => {
    render(<ReturnsPage />);

    expect(section("Sending it back")).toHaveTextContent(/we may take something off the refund/);
  });

  it("sets out the legal rights for a fault, and asks for no deadline shorter than the law's", () => {
    render(<ReturnsPage />);

    const text = section("Faulty, damaged or not as described");
    expect(text).toHaveTextContent("Consumer Rights Act 2015");
    expect(text).toHaveTextContent(/within 30 days/);
    expect(text).toHaveTextContent(/doesn't shorten your legal rights/);
    expect(text).toHaveTextContent(/we pay to send it back/);
  });

  it("puts right a mistake in the printed words that is ours, and not one that was typed", () => {
    render(<ReturnsPage />);

    const text = section("Mistakes in printed words");
    expect(text).toHaveTextContent(/we print exactly what you type/i);
    expect(text).toHaveTextContent(/remake it free or refund you in full/);
  });

  it("lets a gift be returned by the person it was sent to, with the refund going to whoever paid", () => {
    render(<ReturnsPage />);

    expect(section("Gifts")).toHaveTextContent(/refund goes to the person who paid/);
  });

  it("carries the model cancellation form, addressed to the business", () => {
    render(<ReturnsPage />);

    const form = section("Cancellation form");
    expect(form).toHaveTextContent("To: Nyoki Limited, trading as Nyoki Handmade, Unit 302, 3A Howick Place, London SW1P 1WG");
    expect(form).toHaveTextContent("I hereby give notice that I cancel my contract of sale of the following goods");
  });
});

describe("delivery", () => {
  it("lists the ways checkout offers, with what each costs and how long it takes", async () => {
    render(await DeliveryPage());

    expect(rateSources).toHaveBeenCalledWith({ activeOnly: true });
    const rows = within(screen.getByRole("table")).getAllByRole("row").slice(1);
    expect(rows.map((row) => within(row).getAllByRole("cell").map((cell) => cell.textContent))).toEqual([
      ["Royal Mail Tracked 48", "Free on every order", "2 to 3 working days"],
      ["Royal Mail Tracked 24", "From £3.90, by size and weight", "1 to 2 working days"],
    ]);
  });

  it("says where it sends, and where not yet", async () => {
    render(await DeliveryPage());

    const text = section("Where we deliver");
    expect(text).toHaveTextContent(/Highlands and islands/);
    expect(text).toHaveTextContent(/can't yet send to the Channel Islands/);
  });

  it("takes responsibility for a parcel until it arrives", async () => {
    render(await DeliveryPage());

    const text = section("If it hasn't arrived");
    expect(text).toHaveTextContent(/our responsibility until it reaches you/);
    expect(text).toHaveTextContent(/send another or refund you in full/);
  });

  it("does not answer for an address given wrongly", async () => {
    render(await DeliveryPage());

    expect(section("Checking your address")).toHaveTextContent(/address you gave us was wrong or incomplete/);
  });

  it("says plainly when there is no way to send yet", async () => {
    rateSources.mockResolvedValue([]);
    render(await DeliveryPage());

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(section("Ways to send and what they cost")).toHaveTextContent(/checkout shows the ways/i);
  });
});

describe("terms and conditions", () => {
  it("sells only to adults buying for themselves", () => {
    render(<TermsPage />);

    expect(section("Ordering from us")).toHaveTextContent(/18 or over/);
  });

  it("makes the contract when the order is confirmed, and lets an obvious price mistake be cancelled", () => {
    render(<TermsPage />);

    const text = section("Ordering from us");
    expect(text).toHaveTextContent(/contract between us is made when we confirm your order/);
    expect(text).toHaveTextContent(/obvious mistake in a price/);
  });

  it("says a handmade difference is not a fault", () => {
    render(<TermsPage />);

    expect(section("Handmade pieces")).toHaveTextContent(/part of its character, not a fault/);
  });

  it("prints what is typed, and may refuse words that are offensive, refunding in full", () => {
    render(<TermsPage />);

    const text = section("Personalised pieces");
    expect(text).toHaveTextContent(/print exactly what you type/);
    expect(text).toHaveTextContent(/offensive/);
    expect(text).toHaveTextContent(/refund you in full/);
  });

  it("never limits what the law does not let a shop limit", () => {
    render(<TermsPage />);

    const text = section("Our responsibility to you");
    expect(text).toHaveTextContent(/death or personal injury/);
    expect(text).toHaveTextContent(/your legal rights as a consumer/);
  });

  it("lets an order delayed beyond our control be cancelled for a full refund", () => {
    render(<TermsPage />);

    expect(section("Things outside our control")).toHaveTextContent(/cancel it for a full refund/);
  });

  it("is under the law of England and Wales, with a shopper's own courts kept", () => {
    render(<TermsPage />);

    const text = section("Complaints and the law");
    expect(text).toHaveTextContent(/laws of England and Wales/);
    expect(text).toHaveTextContent(/Scotland or Northern Ireland/);
  });
});

describe("privacy", () => {
  it("names who looks after the data", () => {
    render(<PrivacyPage />);

    expect(section("Who we are")).toHaveTextContent(/Nyoki Limited .* is responsible for your personal information/);
  });

  it("names everyone the data goes to, and says it is never sold", () => {
    render(<PrivacyPage />);

    const text = section("Who we share it with");
    for (const name of ["Stripe", "Royal Mail", "Vercel", "Neon"]) expect(text).toHaveTextContent(name);
    expect(text).toHaveTextContent(/never sell/);
  });

  it("says how long it is kept, order records for six years", () => {
    render(<PrivacyPage />);

    expect(section("How long we keep it")).toHaveTextContent(/six years/);
  });

  it("sets out the shopper's rights and the way to the ICO", () => {
    render(<PrivacyPage />);

    expect(section("Your rights")).toHaveTextContent(/within one month/);
    expect(within(section("Complaints")).getByRole("link", { name: /ico\.org\.uk/ })).toHaveAttribute(
      "href",
      "https://ico.org.uk/make-a-complaint/",
    );
  });
});

describe("cookies", () => {
  it("lists each cookie the site sets and how long it lasts", () => {
    render(<CookiesPage />);

    const rows = within(screen.getByRole("table")).getAllByRole("row").slice(1);
    expect(rows.map((row) => [within(row).getAllByRole("cell")[0].textContent, within(row).getAllByRole("cell")[2].textContent])).toEqual([
      [BASKET_COOKIE, `${BASKET_COOKIE_DAYS} days`],
      [CUSTOMER_SESSION_COOKIE, `${CUSTOMER_SESSION_DAYS} days`],
      [SESSION_COOKIE, `${ADMIN_SESSION_DAYS} days`],
    ]);
  });

  it("explains why there is no cookie banner", () => {
    render(<CookiesPage />);

    const text = section("The cookies we use");
    expect(text).toHaveTextContent(/no advertising cookies/);
    expect(text).toHaveTextContent(/no cookie banner/);
  });

  it("says the fonts come from our own site", () => {
    render(<CookiesPage />);

    expect(section("Nothing else watching")).toHaveTextContent(/fonts come from our own site/);
  });
});
