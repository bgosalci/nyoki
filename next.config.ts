import type { NextConfig } from "next";

/**
 * The host the shop's own Vercel Blob store serves photos from. The store is
 * named in its token (vercel_blob_rw_<store>_<secret>), and the Blob SDK
 * builds every photo's address from it the same way. No token, no store:
 * local photos live under public/uploads, the shop's own address.
 */
function blobHost(token = process.env.BLOB_READ_WRITE_TOKEN): string | null {
  const store = token?.split("_")[3];
  return store ? `${store.toLowerCase()}.public.blob.vercel-storage.com` : null;
}

const BLOB_HOST = blobHost();

/**
 * Sent with every page and file, the shop's and the CMS's alike.
 *
 * The Content-Security-Policy carries only what cannot break a page: no
 * framing by other websites (the CMS's buttons could otherwise be laid under
 * someone else's), no <base> tag or plugin slipped in, and forms that post
 * only here. Limiting scripts as well needs a nonce on every one Next writes,
 * a bigger change than this. When payment is built, a form that hands over to
 * a payment page elsewhere needs that page's origin in form-action.
 */
const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
  // frame-ancestors for browsers too old to read it.
  { key: "X-Frame-Options", value: "DENY" },
  // A file is what its type says, never what a browser guesses from its bytes.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Other websites learn the shop sent someone, never which page.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Two years; browsers ignore it over plain http, so local and LAN testing are untouched.
  { key: "Strict-Transport-Security", value: "max-age=63072000" },
  // Nothing on the shop uses these. Payment is left alone: Apple Pay and
  // Google Pay go through the Payment Request API.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
];

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

  experimental: {
    serverActions: {
      // Photos go up one per request, so one photo of the largest size the
      // upload takes (MAX_IMAGE_BYTES, 10MB) has to fit, with room for the
      // multipart around it. Next's default is 1MB, at which three phone
      // photos failed outright. Kept near that rather than raised to fit
      // a whole batch: every action accepts a body this large before any
      // check runs. Vercel refuses request bodies over 4.5MB regardless.
      bodySizeLimit: "11mb",
    },
  },

  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },

  images: {
    // Product photos are served from Vercel Blob in production; only the
    // shop's own store is let through. A wildcard over the Blob domain let
    // any stranger's store through the image optimiser, on the shop's quota.
    // Local development writes to public/uploads, which is same-origin and
    // needs no entry here.
    remotePatterns: BLOB_HOST ? [{ protocol: "https", hostname: BLOB_HOST }] : [],
  },

  devIndicators: {
    // Defaults to bottom-left, which is exactly where the CMS sidebar puts the
    // account block and sign-out button. Kept rather than disabled so compile
    // status is still visible.
    position: "bottom-right",
  },
};

export default nextConfig;
