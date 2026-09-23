import nextConfig from "../next.config";

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
