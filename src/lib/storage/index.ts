import {
  LOCAL_UPLOAD_PUBLIC_BASE,
  LOCAL_UPLOAD_ROOT,
  LocalDiskStorage,
} from "@/lib/storage/local";
import type { ImageStorage } from "@/lib/storage/types";
import { VercelBlobStorage } from "@/lib/storage/vercel-blob";

export type { ImageStorage } from "@/lib/storage/types";

/**
 * Pick the image backend for this environment.
 *
 * A Blob token wins wherever it is present. Without one, development falls
 * back to local disk; production refuses to start rather than quietly writing
 * photos to Vercel's ephemeral filesystem, where they vanish on the next
 * deploy.
 */
export function createImageStorage(): ImageStorage {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return new VercelBlobStorage();
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN is not set. Enable Vercel Blob for this project and add the token to the environment.",
    );
  }

  return new LocalDiskStorage({
    root: LOCAL_UPLOAD_ROOT,
    publicBase: LOCAL_UPLOAD_PUBLIC_BASE,
  });
}
