import Link from "next/link";

/**
 * A step back up the tree - to the department a product sits in, or the parent
 * of a department. A real link rather than browser history, so it works on a
 * first visit and says where it leads.
 */
export function ShopBackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 text-sm font-medium tracking-[0.1em] text-nyoki-navy uppercase hover:underline hover:underline-offset-4"
    >
      <span aria-hidden="true">←</span>
      Back to {children}
    </Link>
  );
}
