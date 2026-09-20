/**
 * @jest-environment node
 */

import {
  MAX_IMAGE_BYTES,
  MAX_IMAGES_PER_PRODUCT,
  validateImageUpload,
} from "@/lib/images/validate";

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0]);
const WEBP = Uint8Array.from([
  0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0, 0,
]);
const HTML = new TextEncoder().encode("<!doctype html><script>alert(1)</script>");

function upload(overrides: Partial<Parameters<typeof validateImageUpload>[0]> = {}) {
  return validateImageUpload({
    name: "mug.png",
    type: "image/png",
    size: PNG.byteLength,
    head: PNG,
    existingCount: 0,
    ...overrides,
  });
}

describe("validateImageUpload", () => {
  it("accepts a PNG", () => {
    expect(upload()).toEqual({ ok: true, contentType: "image/png", extension: "png" });
  });

  it("accepts a JPEG", () => {
    expect(upload({ name: "mug.jpg", type: "image/jpeg", head: JPEG, size: 10 })).toEqual({
      ok: true,
      contentType: "image/jpeg",
      extension: "jpg",
    });
  });

  it("accepts a WebP", () => {
    expect(upload({ name: "mug.webp", type: "image/webp", head: WEBP, size: 14 })).toEqual({
      ok: true,
      contentType: "image/webp",
      extension: "webp",
    });
  });

  it("trusts the bytes, not the declared type", () => {
    // A browser-supplied MIME type is whatever the client says it is. An HTML
    // file renamed to .png with a spoofed type must still be rejected, or it
    // could be served from our domain and run script.
    const result = upload({ type: "image/png", head: HTML, size: HTML.byteLength });

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toMatch(/not an image/i);
  });

  it("uses the sniffed type when it disagrees with the declared one", () => {
    // A JPEG mislabelled as PNG is still a fine JPEG.
    const result = upload({ name: "mug.png", type: "image/png", head: JPEG, size: 10 });

    expect(result).toEqual({ ok: true, contentType: "image/jpeg", extension: "jpg" });
  });

  it("rejects an unsupported image format", () => {
    const gif = Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0, 0, 0]);
    const result = upload({ name: "mug.gif", type: "image/gif", head: gif, size: 10 });

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toMatch(/jpeg|png|webp/i);
  });

  it("rejects a file over the size limit", () => {
    const result = upload({ size: MAX_IMAGE_BYTES + 1 });

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toMatch(/MB/);
  });

  it("accepts a file exactly at the size limit", () => {
    expect(upload({ size: MAX_IMAGE_BYTES }).ok).toBe(true);
  });

  it("rejects an empty file", () => {
    const result = upload({ size: 0, head: new Uint8Array() });

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toMatch(/empty/i);
  });

  it("rejects an upload once the product has enough images", () => {
    const result = upload({ existingCount: MAX_IMAGES_PER_PRODUCT });

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toMatch(String(MAX_IMAGES_PER_PRODUCT));
  });

  it("allows the upload that reaches the limit", () => {
    expect(upload({ existingCount: MAX_IMAGES_PER_PRODUCT - 1 }).ok).toBe(true);
  });
});
