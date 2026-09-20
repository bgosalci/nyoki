import { del, put } from "@vercel/blob";

import type { ImageStorage } from "@/lib/storage/types";

/**
 * Production storage on Vercel Blob.
 *
 * The SDK reads BLOB_READ_WRITE_TOKEN from the environment itself; the
 * factory has already checked it is present before constructing this.
 */
export class VercelBlobStorage implements ImageStorage {
  readonly kind = "vercel-blob" as const;

  async put(key: string, body: Uint8Array, contentType: string): Promise<{ url: string }> {
    // The SDK accepts Buffer but not a bare Uint8Array. This view shares the
    // underlying memory rather than copying it.
    const buffer = Buffer.from(body.buffer, body.byteOffset, body.byteLength);

    const result = await put(key, buffer, {
      access: "public",
      contentType,
      // Keys already carry a generated id, so a random suffix would only make
      // the URLs longer.
      addRandomSuffix: false,
    });

    return { url: result.url };
  }

  async remove(url: string): Promise<void> {
    // del() is a no-op for a blob that no longer exists, which is the
    // behaviour the interface asks for.
    await del(url);
  }
}
