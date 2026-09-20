import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, normalize, resolve, sep } from "node:path";

import type { ImageStorage } from "@/lib/storage/types";

/**
 * Development-only storage that writes into the Next `public/` directory so
 * the files are served by the dev server at their public path.
 *
 * Never used in production: Vercel's filesystem is ephemeral and would lose
 * every photo on the next deploy. The factory enforces that.
 */
export class LocalDiskStorage implements ImageStorage {
  readonly kind = "local-disk" as const;

  private readonly root: string;
  private readonly publicBase: string;

  constructor(options: { root: string; publicBase: string }) {
    this.root = resolve(options.root);
    this.publicBase = options.publicBase.replace(/\/+$/, "");
  }

  // The content type is not needed on disk: the dev server infers it from the
  // extension, which the key already carries.
  async put(key: string, body: Uint8Array): Promise<{ url: string }> {
    const path = this.pathFor(key);

    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, body);

    return { url: `${this.publicBase}/${key}` };
  }

  async remove(url: string): Promise<void> {
    const prefix = `${this.publicBase}/`;

    if (!url.startsWith(prefix)) {
      throw new Error(`Refusing to remove a URL this storage did not produce: ${url}`);
    }

    await rm(this.pathFor(url.slice(prefix.length)), { force: true });
  }

  /**
   * Resolve a key inside the root, refusing anything that would land outside
   * it. Keys are built from ids we generate, but this is the last line of
   * defence if that ever changes.
   */
  private pathFor(key: string): string {
    const path = resolve(this.root, normalize(key));

    if (path !== this.root && !path.startsWith(this.root + sep)) {
      throw new Error(`Refusing key that escapes the upload root: ${key}`);
    }

    return path;
  }
}

/** The location the factory uses for local development. */
export const LOCAL_UPLOAD_ROOT = join(process.cwd(), "public", "uploads");
export const LOCAL_UPLOAD_PUBLIC_BASE = "/uploads";
