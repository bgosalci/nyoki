"use client";

import { usePathname } from "next/navigation";

import { sectionTitle } from "@/lib/admin/nav";
import { ui } from "@/lib/brand/ui";

/** Height shared with the layout's top padding and the sticky page headers. */
export const TOP_BAR_HEIGHT_CLASS = "h-14";

export function AdminTopBar() {
  const pathname = usePathname();

  return (
    <header
      role="banner"
      className={`fixed inset-x-0 top-0 z-30 flex ${TOP_BAR_HEIGHT_CLASS} items-center gap-4 border-b px-4 md:px-6 ${ui.panel} ${ui.rule}`}
    >
      <span className={`text-lg font-semibold tracking-tight ${ui.heading}`}>Nyoki</span>
      <span aria-hidden="true" className={ui.mutedOnPanel}>/</span>
      <h2 className="text-sm font-medium">{sectionTitle(pathname)}</h2>
    </header>
  );
}
