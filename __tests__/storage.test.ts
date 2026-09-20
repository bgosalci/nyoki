/**
 * @jest-environment node
 */

import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createImageStorage, type ImageStorage } from "@/lib/storage";
import { LocalDiskStorage } from "@/lib/storage/local";

describe("LocalDiskStorage", () => {
  let root: string;
  // Typed as the interface, not the class: the tests exercise the contract
  // every backend must meet, and the class may legitimately take fewer
  // parameters than the interface declares.
  let storage: ImageStorage;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "nyoki-storage-"));
    storage = new LocalDiskStorage({ root, publicBase: "/uploads" });
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("writes the bytes and returns a public URL", async () => {
    const bytes = Uint8Array.from([1, 2, 3]);

    const { url } = await storage.put("products/abc/photo.png", bytes, "image/png");

    expect(url).toBe("/uploads/products/abc/photo.png");
    expect(await readFile(join(root, "products/abc/photo.png"))).toEqual(Buffer.from(bytes));
  });

  it("creates intermediate directories", async () => {
    await storage.put("deep/nested/key.png", Uint8Array.from([1]), "image/png");

    expect((await stat(join(root, "deep/nested"))).isDirectory()).toBe(true);
  });

  it("removes a file it wrote", async () => {
    const { url } = await storage.put("products/abc/photo.png", Uint8Array.from([1]), "image/png");

    await storage.remove(url);

    await expect(stat(join(root, "products/abc/photo.png"))).rejects.toThrow();
  });

  it("treats removing something already gone as success", async () => {
    await expect(storage.remove("/uploads/never/existed.png")).resolves.toBeUndefined();
  });

  it("refuses a key that escapes the root", async () => {
    // A key built from user input must never be able to write outside the
    // upload directory.
    await expect(
      storage.put("../../etc/passwd", Uint8Array.from([1]), "image/png"),
    ).rejects.toThrow(/key/i);
  });

  it("refuses to remove a URL it did not produce", async () => {
    await expect(storage.remove("/etc/passwd")).rejects.toThrow(/url/i);
  });
});

describe("createImageStorage", () => {
  const original = process.env;

  afterEach(() => {
    process.env = original;
  });

  it("uses Vercel Blob when a token is present", () => {
    process.env = { ...original, BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_test" };

    expect(createImageStorage().kind).toBe("vercel-blob");
  });

  it("falls back to local disk in development", () => {
    process.env = { ...original, NODE_ENV: "development" } as NodeJS.ProcessEnv;
    delete process.env.BLOB_READ_WRITE_TOKEN;

    expect(createImageStorage().kind).toBe("local-disk");
  });

  it("refuses to run without a token in production", () => {
    // Vercel's filesystem is ephemeral: files written to local disk vanish on
    // the next deploy. Silently using it in production would lose every photo.
    process.env = { ...original, NODE_ENV: "production" } as NodeJS.ProcessEnv;
    delete process.env.BLOB_READ_WRITE_TOKEN;

    expect(() => createImageStorage()).toThrow(/BLOB_READ_WRITE_TOKEN/);
  });
});
