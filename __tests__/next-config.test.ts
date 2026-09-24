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

