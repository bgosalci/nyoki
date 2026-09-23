import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // jose ships ESM only, with no CommonJS build. Listing it here is what lets
  // `next/jest` transform it for the test runner: next/jest PREPENDS its own
  // transformIgnorePatterns, so an appended override can never un-ignore a
  // package - it reads this field instead.
  transpilePackages: ["jose"],

  // Hosts allowed to fetch the dev server's own resources - /_next/hmr, the
  // client chunks, the fonts. Without this Next serves the HTML to anything
  // on the network but blocks those, so a page opened from another device
  // renders correctly and then never hydrates: no bulk actions, no hearts,
  // no live filtering. It reads as "the buttons do nothing on her laptop",
  // and the only clue is a warning in the dev server's own log.
  //
  // Private addresses only. This is a safety check, and dev has no auth in
  // front of it. Development-only setting: it does not exist in a build.
  allowedDevOrigins: ["*.local", "192.168.*.*", "10.*.*.*"],

  images: {
    // Product photos are served from Vercel Blob in production. Local
    // development writes to public/uploads, which is same-origin and needs no
    // entry here.
    remotePatterns: [
      { protocol: "https", hostname: "**.public.blob.vercel-storage.com" },
    ],
  },

  devIndicators: {
    // Defaults to bottom-left, which is exactly where the CMS sidebar puts the
    // account block and sign-out button. Kept rather than disabled so compile
    // status is still visible.
    position: "bottom-right",
  },
};

export default nextConfig;
