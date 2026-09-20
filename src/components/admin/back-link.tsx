import Link from "next/link";

import { ui } from "@/lib/brand/ui";

/** Sits directly above a page title, leading back to the list the item came from. */
export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={`inline-flex items-center gap-1.5 text-sm ${ui.link}`}>
      <span aria-hidden="true">←</span>
      {children}
    </Link>
  );
}
