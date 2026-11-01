import type { Metadata } from "next";

import { PolicyLink, PolicyPage, type PolicySection } from "@/components/shop/policy-page";
import { ui } from "@/lib/brand/ui";
import { SITE_COOKIES, lasts } from "@/lib/policies/cookies";

export const metadata: Metadata = {
  title: "Cookies",
  description: "The three small cookies the Nyoki Handmade shop needs to work, and why there is no cookie banner.",
};

/**
 * The cookies page. Every cookie the site sets is strictly necessary, which
 * PECR exempts from consent (Schedule A1, from 5 February 2026), so there is
 * no banner; the page still names each one, what it does and how long it
 * lasts, from the constants that set it.
 */
export default function CookiesPage() {
  return (
    <PolicyPage
      slug="cookies"
      intro={<p>The short version: three small cookies the shop needs to work, and nothing that follows you around.</p>}
      sections={SECTIONS}
    />
  );
}

const SECTIONS: PolicySection[] = [
  {
    id: "what-we-use",
    heading: "The cookies we use",
    body: (
      <>
        <p>
          A cookie is a small file a website keeps in your browser. We use only three, and only because the shop
          can&apos;t work without them: one remembers your basket, one keeps you signed in, and one is for our own team.
        </p>
        <p>
          There are no advertising cookies, no tracking and no analytics. The law doesn&apos;t ask for your consent to
          cookies a site can&apos;t work without, which is why there&apos;s no cookie banner.
        </p>
      </>
    ),
  },
  {
    id: "each",
    heading: "Each cookie",
    body: (
      <>
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className={`border-b ${ui.shopRule}`}>
              <th scope="col" className={`py-2 pr-4 font-medium ${ui.shopHeading}`}>
                Name
              </th>
              <th scope="col" className={`py-2 pr-4 font-medium ${ui.shopHeading}`}>
                What it does
              </th>
              <th scope="col" className={`py-2 font-medium whitespace-nowrap ${ui.shopHeading}`}>
                Lasts
              </th>
            </tr>
          </thead>
          <tbody>
            {SITE_COOKIES.map((cookie) => (
              <tr key={cookie.name} className={`border-b align-top ${ui.shopRule}`}>
                <td className="py-3 pr-4 font-mono text-xs break-all text-nyoki-navy sm:break-normal sm:whitespace-nowrap">{cookie.name}</td>
                <td className="py-3 pr-4">{cookie.purpose}</td>
                <td className="py-3 whitespace-nowrap">{lasts(cookie.days)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          All three are our own, sent only to nyoki.co.uk, and can&apos;t be read by scripts on the page. Signing out
          removes the sign-in cookie straight away.
        </p>
      </>
    ),
  },
  {
    id: "paying",
    heading: "When you pay",
    body: (
      <p>
        On the payment page, Stripe, who take our card payments, sets cookies of its own to recognise your browser and
        stop fraud. They&apos;re needed to pay safely, and set only once you reach that page. Stripe explains them, and
        how long each lasts, in its <PolicyLink href="https://stripe.com/legal/cookies-policy">cookie policy</PolicyLink>.
      </p>
    ),
  },
  {
    id: "nothing-else",
    heading: "Nothing else watching",
    body: (
      <p>
        Our fonts come from our own site, not from Google or anyone else, so loading a page tells no one else that you
        visited. There are no social media buttons or embedded videos setting cookies of their own. Our team&apos;s admin
        pages remember a few settings, such as dark mode, in their own browsers; that never applies to shoppers.
      </p>
    ),
  },
  {
    id: "control",
    heading: "Turning cookies off",
    body: (
      <p>
        You can block or delete cookies in your browser&apos;s settings. If you block ours, the basket and signing in
        won&apos;t work.
      </p>
    ),
  },
  {
    id: "changes",
    heading: "If this changes",
    body: (
      <p>
        If we ever want to use cookies for anything else, such as counting visits, we&apos;ll update this page first, and
        ask you where the law requires it.
      </p>
    ),
  },
];
