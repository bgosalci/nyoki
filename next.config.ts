import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // jose ships ESM only, with no CommonJS build. Listing it here is what lets
  // `next/jest` transform it for the test runner: next/jest PREPENDS its own
  // transformIgnorePatterns, so an appended override can never un-ignore a
  // package - it reads this field instead.
  transpilePackages: ["jose"],

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
