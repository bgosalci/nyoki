import type { Metadata } from "next";

import { PolicyLink, PolicyList, PolicyPage, type PolicySection } from "@/components/shop/policy-page";
import { BUSINESS, addressLine } from "@/lib/policies/business";

export const metadata: Metadata = {
  title: "Privacy notice",
  description: "What Nyoki Handmade knows about you, why, who helps us, how long we keep it, and your rights.",
};

/**
 * The privacy notice UK GDPR article 13 asks for, as amended by the Data
 * (Use and Access) Act 2025: each purpose with its lawful basis, everyone the
 * data goes to by name, real retention periods, and the right to complain to
 * us first (DPA 2018 s.164A, from 19 June 2026) as well as to the regulator -
 * the Information Commission since 30 September 2026.
 */
export default function PrivacyPage() {
  return (
    <PolicyPage
      slug="privacy"
      intro={
        <p>
          We ask only for what we need to make and send your order, and we look after it. This notice says what we
          collect, why, who helps us with it, how long we keep it and what you can ask of us.
        </p>
      }
      sections={SECTIONS}
    />
  );
}

const SECTIONS: PolicySection[] = [
  {
    id: "who-we-are",
    heading: "Who we are",
    body: (
      <p>
        {BUSINESS.legalName} (trading as {BUSINESS.tradingName}) is responsible for your personal information - in the
        law&apos;s words, the &quot;controller&quot;. To ask us anything about it, use our{" "}
        <PolicyLink href="/contact">Contact page</PolicyLink>
        {BUSINESS.email ? (
          <>
            {" "}
            or email <PolicyLink href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</PolicyLink>
          </>
        ) : null}
        {BUSINESS.address ? <>, or write to us at {addressLine(BUSINESS.address)}</> : null}.
      </p>
    ),
  },
  {
    id: "what-we-collect",
    heading: "What we collect and why",
    body: (
      <>
        <PolicyList>
          <li>
            <strong className="font-medium text-nyoki-navy">When you order</strong>: your name, email address, phone
            number if you give one, and delivery address; for a gift, the name and address of the person it&apos;s for
            and your note; the words for anything personalised; and what you bought and paid. We use them to make, send
            and look after your order, and to answer you about it, because that is our contract with you.
          </li>
          <li>
            <strong className="font-medium text-nyoki-navy">When you pay</strong>: your card details go straight to
            Stripe, who handle our payments. We see that you&apos;ve paid, and perhaps the type of card and its last four
            digits - never the whole number. Stripe also checks payments for fraud, which is in both our interests.
          </li>
          <li>
            <strong className="font-medium text-nyoki-navy">If you open an account</strong>: your name, email address and
            password (kept only in a scrambled form that can&apos;t be read back), the addresses you save, the pieces you
            save with a heart, and your basket. We keep them to give you the account you asked for.
          </li>
          <li>
            <strong className="font-medium text-nyoki-navy">When you ask a question</strong>: your name, email address,
            your question and the piece it&apos;s about, so we can answer you. That is our legitimate interest, and
            yours.
          </li>
          <li>
            <strong className="font-medium text-nyoki-navy">Records the law asks for</strong>: we keep order and payment
            records for our accounts and for tax, because the law requires it.
          </li>
          <li>
            <strong className="font-medium text-nyoki-navy">Visiting the site</strong>: the company that hosts our
            website keeps a short record of visits, such as internet addresses and browsers, to keep the site running and
            safe. That is our legitimate interest in a shop that works and can&apos;t be attacked.
          </li>
        </PolicyList>
        <p>
          You don&apos;t have to give us anything, but we can&apos;t take an order without a name, an email address and
          somewhere to send it.
        </p>
        <p>
          If you give us someone else&apos;s details - the person a gift is for, or a name to go on a piece - we use them
          only for your order. Please give them only if you believe they&apos;d be happy for you to. Our shop is for
          adults; a child&apos;s name for a piece is used only to make it.
        </p>
        <p>
          We don&apos;t send marketing emails. If we ever do, it will only be to people who have asked for them, or to
          customers about pieces like the ones they&apos;ve bought, always with a simple way to stop them. We make no
          decisions about you by automated means.
        </p>
      </>
    ),
  },
  {
    id: "sharing",
    heading: "Who we share it with",
    body: (
      <>
        <p>Only the companies that help us run the shop, each only with what it needs, and each bound to keep it safe:</p>
        <PolicyList>
          <li>Stripe, who take card payments;</li>
          <li>Royal Mail, who deliver: your name and address, and your email or phone number if they need it to tell you about your parcel;</li>
          <li>Vercel, who host our website and the photos on it;</li>
          <li>Neon, who host the database our orders and accounts are kept in;</li>
          <li>our email provider, when we write to you;</li>
          <li>our accountant, and HMRC, as the law requires.</li>
        </PolicyList>
        <p>
          We would share it with the police or a court only if the law required us to. We never sell your information, or
          share it for anyone else&apos;s marketing.
        </p>
      </>
    ),
  },
  {
    id: "abroad",
    heading: "Outside the UK",
    body: (
      <p>
        Vercel and Neon are American companies and Stripe works worldwide, so your information may be stored or handled
        outside the UK, including in the US and the EU. Where it is, it&apos;s protected as UK law requires: by the UK&apos;s
        rulings that a country protects data adequately (the UK-US data bridge among them), or by the contract terms
        approved for UK data protection.
      </p>
    ),
  },
  {
    id: "keeping",
    heading: "How long we keep it",
    body: (
      <PolicyList>
        <li>Orders and payments: six years after the end of the financial year they belong to, as tax and company law require.</li>
        <li>An order you start but don&apos;t pay for: until it&apos;s clear you won&apos;t come back to it, and six months at most.</li>
        <li>Your account: for as long as it&apos;s open. Ask us to close it and we delete your password, saved addresses, saved pieces and basket, keeping only your past orders, for the time above.</li>
        <li>Questions: until they&apos;re answered and no longer needed, and a year at most.</li>
        <li>Visit records at our host: a few days.</li>
      </PolicyList>
    ),
  },
  {
    id: "safety",
    heading: "Keeping it safe",
    body: (
      <p>
        The site is only ever reached over a secure connection. Passwords are kept scrambled, the cookies that keep you
        signed in can&apos;t be read by other scripts on the page, and only the people who run the shop can see orders.
      </p>
    ),
  },
  {
    id: "rights",
    heading: "Your rights",
    body: (
      <>
        <p>You can ask us:</p>
        <PolicyList>
          <li>for a copy of the information we hold about you;</li>
          <li>to correct anything that&apos;s wrong;</li>
          <li>to delete it, where we don&apos;t need to keep it;</li>
          <li>to stop or limit how we use it, or object to our using it;</li>
          <li>for your information in a form you can take elsewhere.</li>
        </PolicyList>
        <p>
          Ask through our <PolicyLink href="/contact">Contact page</PolicyLink>
          {BUSINESS.email ? (
            <>
              {" "}
              or by email to <PolicyLink href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</PolicyLink>
            </>
          ) : null}
          . It&apos;s free, and we&apos;ll answer within one month. We may ask you to show it&apos;s you first.
        </p>
      </>
    ),
  },
  {
    id: "complaints",
    heading: "Complaints",
    body: (
      <p>
        If you&apos;re unhappy with how we&apos;ve handled your information, please tell us first, through our{" "}
        <PolicyLink href="/contact">Contact page</PolicyLink>: we&apos;ll acknowledge it within 30 days and tell you what
        we&apos;ve done. You can also complain to the Information Commission, the UK&apos;s data protection regulator,
        which took over from the ICO in 2026, at{" "}
        <PolicyLink href="https://ico.org.uk/make-a-complaint/">ico.org.uk/make-a-complaint</PolicyLink>.
      </p>
    ),
  },
  {
    id: "cookies",
    heading: "Cookies",
    body: (
      <p>
        The shop uses three small cookies it can&apos;t work without, and nothing that tracks you. Our{" "}
        <PolicyLink href="/policies/cookies">Cookies</PolicyLink> page lists them.
      </p>
    ),
  },
  {
    id: "changes",
    heading: "Changes to this notice",
    body: <p>If we change how we use your information, we&apos;ll update this notice and the date at the top.</p>,
  },
];
