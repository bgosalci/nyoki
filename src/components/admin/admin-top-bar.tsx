"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ThemeToggle } from "@/components/admin/theme-toggle";
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
      <Link href="/admin" className="flex shrink-0 items-center">
        <Image
          src="/brand/nyoki-logo-small.png"
          alt="Nyoki Handmade"
          width={227}
          height={142}
          priority
          className="h-9 w-auto"
        />
      </Link>
      <span aria-hidden="true" className={ui.mutedOnPanel}>/</span>
      <h2 className="text-sm font-medium">{sectionTitle(pathname)}</h2>

      <div className="ml-auto">
        <ThemeToggle />
      </div>
    </header>
  );
}
