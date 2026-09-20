import type { Metadata } from "next";
import Link from "next/link";

import { requireCustomer } from "@/lib/account/dal";
import { ui } from "@/lib/brand/ui";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const shopper = await requireCustomer();

  const orders = await db.order.count({ where: { customerId: shopper.id } });

  const cards = [
    {
      href: "/account/orders",
      title: "Orders",
      note: orders === 0 ? "Nothing ordered yet" : `${orders} ${orders === 1 ? "order" : "orders"}`,
    },
    { href: "/account/details", title: "Your details", note: "Name, email and password" },
  ];

  return (
    <div className="mx-auto max-w-shop px-4 py-12 sm:px-6">
      <h1 className={`text-3xl tracking-tight ${ui.shopHeading}`}>
        {shopper.name ? `Hello, ${shopper.name.split(" ")[0]}` : "Your account"}
      </h1>
      <p className={`mt-2 text-sm ${ui.shopMuted}`}>{shopper.email}</p>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {cards.map((card) => (
          <li key={card.href}>
            <Link href={card.href} className={`flex h-full flex-col gap-1 p-5 ${ui.shopCard}`}>
              <span className={`font-medium ${ui.shopHeading}`}>{card.title}</span>
              <span className={`text-sm ${ui.shopMuted}`}>{card.note}</span>
            </Link>
          </li>
        ))}
      </ul>

      <a href="/account/sign-out" className={`mt-8 inline-block text-sm underline underline-offset-4 ${ui.shopMuted}`}>
        Sign out
      </a>
    </div>
  );
}
