import Link from "next/link";

import { ui } from "@/lib/brand/ui";
import { BUSINESS, addressLine, legalLine, registeredOfficeLine, type BusinessDetails as Details } from "@/lib/policies/business";

/**
 * Whose shop this is and how to reach it, at the foot of every policy: the
 * company, its number, VAT number and registered office - which a company's
 * website must show, and the footer leaves to here - then the address and
 * email once there are some. Until then the Contact page is the way to write.
 */
export function BusinessDetails({ business = BUSINESS, className = "" }: { business?: Details; className?: string }) {
  return (
    <section aria-label="Business details" className={`flex flex-col gap-2 rounded-md px-5 py-4 text-sm leading-relaxed ${ui.shopBandQuiet} ${className}`}>
      <p>
        {legalLine(business)} {registeredOfficeLine(business)}
      </p>
      {business.address ? (
        <p>
          Post: <span>{addressLine(business.address)}</span>
        </p>
      ) : null}
      {business.email ? (
        <p>
          Email:{" "}
          <a href={`mailto:${business.email}`} className="underline underline-offset-4">
            {business.email}
          </a>
        </p>
      ) : null}
      <p>
        You can also write to us through our{" "}
        <Link href="/contact" className="underline underline-offset-4">
          Contact page
        </Link>
        .
      </p>
    </section>
  );
}
