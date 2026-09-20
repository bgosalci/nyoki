import type { Metadata } from "next";
import Link from "next/link";

import { ui } from "@/lib/brand/ui";

export const metadata: Metadata = {
  title: "About us",
  description:
    "The roots of Nyoki Handmade trace back to our childhood in Kosovo, where the tradition of handmade crafting runs deep.",
};

const STORY = [
  "The roots of Nyoki Handmade trace back to our childhood in Kosovo, where the tradition of handmade crafting runs deep. Raised in homes adorned with handcrafted treasures and adorned in handmade clothing, we inherited a passion for craftsmanship from our mothers and grandmothers. Now, we pass this legacy on to our own children.",
  "The Nyoki style is eclectic, blending vintage, traditional, and contemporary influences. Committed to ethical principles, our products meet stringent criteria for eco-friendliness, organic sourcing, recyclability and of high quality.",
  "Sustainability is central to our ethos, reflected in every aspect of our brand — even our packaging is biodegradable, and our adhesives are water-based and solvent-free. We proudly source all our materials from the UK.",
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <h1 className={`text-4xl leading-tight tracking-tight ${ui.shopHeading}`}>
        Where tradition meets modern, the kind way
      </h1>

      <div className={`mt-8 flex flex-col gap-5 leading-relaxed ${ui.shopMuted}`}>
        {STORY.map((paragraph) => (
          <p key={paragraph.slice(0, 32)}>{paragraph}</p>
        ))}
      </div>

      <Link href="/shop" className={`mt-10 inline-block px-6 py-3 text-xs tracking-[0.14em] uppercase ${ui.shopButton}`}>
        Shop everything
      </Link>
    </div>
  );
}
