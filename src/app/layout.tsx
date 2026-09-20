import type { Metadata } from "next";
import { Geist_Mono, Jost } from "next/font/google";
import "./globals.css";

// Jost carries the geometric caps of the Nyoki wordmark into the site.
const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
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
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
