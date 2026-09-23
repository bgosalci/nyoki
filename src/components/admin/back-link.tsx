import Link from "next/link";

import { ui } from "@/lib/brand/ui";

/**
 * Sits directly above a page title, leading back to the list the item came
 * from. A button rather than a line of underlined text: it is the way out of
 * every item in the admin, used constantly, and a small target is a slow one.
 */
export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 self-start rounded-md px-3 py-2 text-sm font-medium ${ui.buttonSecondary}`}
    >
      <span aria-hidden="true">←</span>
      {children}
    </Link>
  );
}
