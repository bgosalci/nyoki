import type { Metadata } from "next";
import { Geist_Mono, Jost } from "next/font/google";

import { THEME_BOOTSTRAP } from "@/lib/admin/theme";
import "./globals.css";

// Jost carries the geometric caps of the Nyoki wordmark into the site.
const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  // The real italic, for italics in descriptions; without it the browser
  // slants the upright letters. Only downloaded where italic text is shown.
  style: ["normal", "italic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Nyoki Handmade",
    template: "%s · Nyoki Handmade",
  },
  description:
    "Handmade cards, clothes and accessories, made in the UK from UK-sourced materials. Where tradition meets modern, the kind way.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${jost.variable} ${geistMono.variable} h-full antialiased`}
      // The admin's theme script writes data-theme here before React
      // hydrates, which is the whole point of it - it has to beat the first
      // paint. Only this element's own attributes are exempted; nothing
      // inside it is.
      suppressHydrationWarning
    >
      {/* The admin's chosen theme, set before the page first paints. Here
          rather than in the admin's layout, which React draws afresh on a
          client-side arrival and warns that it will not run a script for;
          the root layout is drawn once, on a full load. The script checks
          the address itself, so the light-only storefront is never marked. */}
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      {/* Browser extensions write onto <body> before React hydrates -
          Grammarly's data-gr-ext-installed, for one - which the dev overlay
          reported as a hydration error on every page. Again only this
          element's own attributes. */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
