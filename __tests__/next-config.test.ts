import nextConfig from "../next.config";

import { MAX_IMAGE_BYTES } from "@/lib/images/validate";

describe("allowedDevOrigins", () => {
  const origins = nextConfig.allowedDevOrigins ?? [];

  it("is set at all, or the dev server is localhost-only", () => {
    // Next blocks its own dev resources - /_next/hmr, the client chunks, the
    // fonts - from any host but localhost unless that host is listed. The
    // page still server-renders, so it LOOKS right and simply never
    // hydrates: no bulk bar, no hearts, no live filtering. It reads as
    // "the buttons do nothing on her laptop".
    expect(origins.length).toBeGreaterThan(0);
  });

  it("covers this machine's Bonjour name, which is what a phone resolves", () => {
    expect(origins.some((origin) => origin.endsWith(".local"))).toBe(true);
  });

  it("covers a private network address, since DHCP moves the IP about", () => {
    expect(origins.some((origin) => /^(10\.|192\.168\.|172\.)/.test(origin))).toBe(true);
  });

  it("lets nothing public in - this is a hole in a dev safety check", () => {
    for (const origin of origins) {
      const private_ = /^(10\.|192\.168\.|172\.)/.test(origin) || origin.endsWith(".local");
      expect({ origin, private_ }).toMatchObject({ private_: true });
    }
  });
});

describe("serverActions.bodySizeLimit", () => {
  /** "11mb" in bytes, as Next reads it. */
  const bytes = (limit: string | number | undefined) => {
    if (typeof limit === "number") return limit;
    const match = /^(\d+(?:\.\d+)?)\s*(b|kb|mb)$/i.exec(limit ?? "");
    if (!match) return 1024 * 1024; // Next's default when unset
    const unit = { b: 1, kb: 1024, mb: 1024 * 1024 }[match[2].toLowerCase() as "b" | "kb" | "mb"];
    return Number(match[1]) * unit;
  };
  const limit = bytes(nextConfig.experimental?.serverActions?.bodySizeLimit as string | undefined);

  it("takes one photo of the largest size the upload allows, with room for the form around it", () => {
    // At Next's default of 1MB, choosing three phone photos failed outright:
    // "Body exceeded 1 MB limit". Photos go one per request, so one is what
    // has to fit - plus the multipart boundaries and headers.
    expect(limit).toBeGreaterThanOrEqual(MAX_IMAGE_BYTES + 64 * 1024);
  });

  it("stays near that, since every action accepts a body this large before any check runs", () => {
    expect(limit).toBeLessThanOrEqual(MAX_IMAGE_BYTES * 1.25);
  });
});


describe("security headers", () => {
  async function headersFor(path: string): Promise<Record<string, string>> {
    const rules = (await nextConfig.headers?.()) ?? [];
    const rule = rules.find((r) => r.source === "/:path*");
    expect(rule).toBeDefined();
    expect(path.startsWith("/")).toBe(true);
    return Object.fromEntries(rule!.headers.map(({ key, value }) => [key.toLowerCase(), value]));
  }

  // No page of the shop or the CMS is meant to sit inside someone else's.
  it("keeps every page out of other websites' frames", async () => {
    const headers = await headersFor("/admin/products");

    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(headers["x-frame-options"]).toBe("DENY");
  });

  it("stops a <base> tag, a plugin or a form posting elsewhere from being slipped in", async () => {
    const policy = (await headersFor("/"))["content-security-policy"];

    expect(policy).toContain("base-uri 'self'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("form-action 'self'");
  });

  it("asks browsers not to guess file types, to keep addresses to the shop, and to stay on https", async () => {
    const headers = await headersFor("/");

    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["strict-transport-security"]).toMatch(/^max-age=\d{8,}/);
    expect(headers["permissions-policy"]).toContain("camera=()");
  });

  // Apple Pay and Google Pay in a card form go through the Payment Request API.
  it("leaves payments allowed, for when payment is built", async () => {
    expect((await headersFor("/"))["permissions-policy"]).not.toContain("payment=()");
  });
});

describe("images.remotePatterns", () => {
  const originalToken = process.env.BLOB_READ_WRITE_TOKEN;

  afterEach(() => {
    if (originalToken === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
    else process.env.BLOB_READ_WRITE_TOKEN = originalToken;
    jest.resetModules();
  });

  async function patternsWith(token: string | undefined) {
    if (token === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
    else process.env.BLOB_READ_WRITE_TOKEN = token;
    jest.resetModules();
    const { default: config } = await import("../next.config");
    return config.images?.remotePatterns ?? [];
  }

  // Every Vercel Blob store answers under that domain, anyone's included: a
  // wildcard let any stranger's images through the shop's image optimiser.
  it("lets through only the shop's own Blob store, named in its token", async () => {
    const patterns = await patternsWith("vercel_blob_rw_AbC123xyz_SecretPartHere");

    expect(patterns).toEqual([{ protocol: "https", hostname: "abc123xyz.public.blob.vercel-storage.com" }]);
  });

  it("lets nothing remote through without a store (local photos are the shop's own address)", async () => {
    expect(await patternsWith(undefined)).toEqual([]);
  });
});
