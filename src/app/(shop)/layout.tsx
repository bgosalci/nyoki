import Image from "next/image";
import Link from "next/link";

import { TopNav } from "@/components/shop/top-nav";
import { db } from "@/lib/db";
import { ui } from "@/lib/brand/ui";

/**
 * Storefront chrome. Deliberately light-only: the shop commits to one warm
 * look rather than following the viewer's theme, which is the admin's job.
 *
 * The header is two tiers, split by a sage rule: everything that is not
 * shopping above it, the departments themselves below.
 */
export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const groups = await db.category.findMany({
    where: { parentId: null },
    orderBy: { name: "asc" },
    select: { slug: true, name: true },
  });

  return (
    <div className={`flex min-h-dvh flex-col ${ui.shopPage}`}>
      <header className={`sticky top-0 z-30 border-b ${ui.shopRule} ${ui.shopPage}`}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 py-4">
            <TopNav />

            <Link href="/" aria-label="Nyoki Handmade, home" className="justify-self-center">
              <Image
                src="/brand/nyoki-logo.png"
                alt="Nyoki Handmade"
                width={959}
                height={600}
                priority
                className="h-24 w-auto md:h-30"
              />
            </Link>

            {/* Reserved for search, account and basket once they exist. Keeping
                the column holds the logo centred in the meantime. */}
            <div aria-hidden="true" />
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="border-t border-nyoki-sage" />
          <nav aria-label="Departments" className="py-3">
            <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 md:justify-start">
              {groups.map((group) => (
                <li key={group.slug}>
                  <Link href={`/shop/${group.slug}`} className="text-base text-nyoki-navy hover:underline hover:underline-offset-4">
                    {group.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/shop" className="text-base text-nyoki-navy hover:underline hover:underline-offset-4">
                  Everything
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className={`mt-20 border-t ${ui.shopRule} ${ui.shopSurface}`}>
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-3">
          <div className="flex flex-col gap-3">
            <p className={`text-sm font-medium tracking-[0.12em] uppercase ${ui.shopHeading}`}>Nyoki Handmade</p>
            <p className={`max-w-prose text-sm leading-relaxed ${ui.shopMuted}`}>
              Where tradition meets modern, the kind way. Handmade in the UK from UK-sourced materials,
              with biodegradable packaging and water-based, solvent-free adhesives.
            </p>
            <Link href="/about" className={`text-sm hover:underline hover:underline-offset-4 ${ui.shopMuted}`}>
              More about us
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            <p className={`text-sm font-medium tracking-[0.12em] uppercase ${ui.shopHeading}`}>Shop</p>
            <ul className="flex flex-col gap-2">
              {groups.map((group) => (
                <li key={group.slug}>
                  <Link href={`/shop/${group.slug}`} className={`text-sm hover:underline hover:underline-offset-4 ${ui.shopMuted}`}>
                    {group.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-3">
            <p className={`text-sm font-medium tracking-[0.12em] uppercase ${ui.shopHeading}`}>Our promise</p>
            <ul className={`flex flex-col gap-2 text-sm ${ui.shopMuted}`}>
              <li>Every piece touched by human hands</li>
              <li>Eco-friendly, organic and recyclable materials</li>
              <li>Materials sourced in the UK</li>
            </ul>
          </div>
        </div>
        <p className={`border-t px-4 py-5 text-center text-xs sm:px-6 ${ui.shopRule} ${ui.shopMuted}`}>
          © {new Date().getFullYear()} Nyoki Handmade
        </p>
      </footer>
    </div>
  );
}
