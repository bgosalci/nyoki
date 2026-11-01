/**
 * Who the shop is, as the law asks a shop's website to say: the company's
 * registered name, number and where it is registered, its VAT number, and an
 * address and email a shopper can reach it at (the E-Commerce Regulations
 * 2002, reg 6, and the trading disclosure rules for companies). The footer,
 * every policy and the cancellation form read it from here.
 *
 * The name, number and registered office are Companies House's; the VAT
 * number is HMRC's.
 */

export interface BusinessDetails {
  tradingName: string;
  legalName: string;
  companyNumber: string;
  registeredIn: string;
  /** Shown because a company's website must show it; not where shoppers write. */
  registeredOffice: readonly string[];
  /** Digits only, as HMRC issues it; written out by formatVatNumber. */
  vatNumber: string;
  /**
   * A real postal address, a line to an entry, where post and returns go -
   * not a PO box. While null the pages send shoppers to the Contact page;
   * ordering cannot open without one.
   */
  address: readonly string[] | null;
  /** Needed before ordering opens: a contact form alone does not satisfy the regulations. */
  email: string | null;
}

export const BUSINESS: BusinessDetails = {
  tradingName: "Nyoki Handmade",
  legalName: "Nyoki Limited",
  companyNumber: "06758218",
  registeredIn: "England and Wales",
  registeredOffice: ["82 Containerville", "1 Emma Street", "London", "E2 9FP"],
  vatNumber: "979867325",
  address: ["Unit 302", "3A Howick Place", "London", "SW1P 1WG"],
  email: null,
};

/** A UK VAT number as HMRC writes it: "GB 979 8673 25". */
export function formatVatNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return `GB ${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`;
}

/** An address on one line, the postcode beside its town: "Unit 302, 3A Howick Place, London SW1P 1WG". */
export function addressLine(lines: readonly string[]): string {
  if (lines.length < 2) return lines.join("");
  return `${lines.slice(0, -1).join(", ")} ${lines[lines.length - 1]}`;
}

/** The sentence every page's footer carries: whose shop this is. */
export function legalLine(business: BusinessDetails): string {
  return (
    `${business.tradingName} is the trading name of ${business.legalName}, registered in ${business.registeredIn}, ` +
    `company number ${business.companyNumber}. VAT number ${formatVatNumber(business.vatNumber)}.`
  );
}

/** Given with the business details at the foot of every policy, rather than in every footer. */
export function registeredOfficeLine(business: BusinessDetails): string {
  return `Registered office: ${addressLine(business.registeredOffice)}.`;
}
