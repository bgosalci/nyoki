import Link from "next/link";

import { BusinessDetails } from "@/components/shop/business-details";
import { ui } from "@/lib/brand/ui";
import { POLICIES, POLICIES_UPDATED, policyHref } from "@/lib/policies/pages";

export interface PolicySection {
  /** The address of its heading, for the contents and for links from elsewhere (/policies/returns#personalised). */
  id: string;
  heading: string;
  body: React.ReactNode;
}

/**
 * One policy, laid out as every policy is: its title and when it last
 * changed, a few lines on what it is for, contents leading to each section,
 * the sections, then the other policies and whose shop it is. A narrow
 * measure, as the About page keeps, since this is reading.
 */
export function PolicyPage({ slug, intro, sections }: { slug: string; intro: React.ReactNode; sections: readonly PolicySection[] }) {
  const policy = POLICIES.find((each) => each.slug === slug)!;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-14 sm:px-6">
      <Link href="/policies" className={`text-xs font-semibold tracking-[0.14em] uppercase hover:underline hover:underline-offset-4 ${ui.shopAccent}`}>
        Policies
      </Link>
      <h1 className={`mt-3 text-4xl leading-tight tracking-tight ${ui.shopHeading}`}>{policy.title}</h1>
      <p className={`mt-3 text-sm ${ui.shopMuted}`}>Last updated {POLICIES_UPDATED}</p>

      <div className={`mt-6 flex flex-col gap-4 leading-relaxed ${ui.shopMuted}`}>{intro}</div>

      <nav aria-label="On this page" className={`mt-8 rounded-md px-5 py-4 ${ui.shopBandQuiet}`}>
        <p className="text-sm font-medium">On this page</p>
        <ol className="mt-2 flex flex-col gap-1.5 text-sm">
          {sections.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`} className="underline-offset-4 hover:underline">
                {section.heading}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-12 flex flex-col gap-12">
        {sections.map((section) => (
          // Clear of the shop's sticky header, which is 206px tall.
          <section key={section.id} id={section.id} aria-labelledby={`${section.id}-heading`} className="scroll-mt-60">
            <h2 id={`${section.id}-heading`} className={`text-2xl leading-snug tracking-tight ${ui.shopHeading}`}>
              {section.heading}
            </h2>
            <div className={`mt-4 flex flex-col gap-4 leading-relaxed ${ui.shopMuted}`}>{section.body}</div>
          </section>
        ))}
      </div>

      <nav aria-label="Our other policies" className={`mt-16 border-t pt-8 ${ui.shopRule}`}>
        <p className={`text-sm font-medium tracking-[0.12em] uppercase ${ui.shopHeading}`}>Our other policies</p>
        <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {POLICIES.filter((each) => each.slug !== slug).map((each) => (
            <li key={each.slug}>
              <Link href={policyHref(each)} className="underline underline-offset-4">
                {each.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <BusinessDetails className="mt-8" />
    </div>
  );
}

/** A list within a policy. */
export function PolicyList({ children }: { children: React.ReactNode }) {
  return <ul className="flex list-disc flex-col gap-2 pl-5 marker:text-nyoki-sage-deep">{children}</ul>;
}

/** A link within a policy's words. */
export function PolicyLink({ href, children }: { href: string; children: React.ReactNode }) {
  const external = href.startsWith("https://");
  return (
    <Link href={href} className="text-nyoki-navy underline underline-offset-4 hover:text-nyoki-ink" {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>
      {children}
    </Link>
  );
}
