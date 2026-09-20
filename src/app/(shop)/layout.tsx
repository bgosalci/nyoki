import Image from "next/image";
import Link from "next/link";

import { db } from "@/lib/db";
import { ui } from "@/lib/brand/ui";

/**
 * Storefront chrome. Deliberately light-only: the shop commits to one warm
 * look rather than following the viewer's theme, which is the admin's job.
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
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-4 sm:px-6">
          <Link href="/" aria-label="Nyoki Handmade, home">
            <Image src="/brand/nyoki-logo.png" alt="Nyoki Handmade" width={959} height={600} priority className="h-12 w-auto" />
          </Link>
          <nav aria-label="Departments">
            <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              {groups.map((group) => (
                <li key={group.slug}>
                  <Link
                    href={`/shop/${group.slug}`}
                    className="text-xs tracking-[0.14em] text-nyoki-navy uppercase hover:underline hover:underline-offset-4"
                  >
                    {group.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/shop" className="text-xs tracking-[0.14em] text-nyoki-navy uppercase hover:underline hover:underline-offset-4">
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
            <p className={`text-xs tracking-[0.14em] uppercase ${ui.shopHeading}`}>Nyoki Handmade</p>
            <p className={`max-w-prose text-sm leading-relaxed ${ui.shopMuted}`}>
              Where tradition meets modern, the kind way. Handmade in the UK from UK-sourced materials,
              with biodegradable packaging and water-based, solvent-free adhesives.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <p className={`text-xs tracking-[0.14em] uppercase ${ui.shopHeading}`}>Shop</p>
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
            <p className={`text-xs tracking-[0.14em] uppercase ${ui.shopHeading}`}>Our promise</p>
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
