import {
  LOCAL_UPLOAD_PUBLIC_BASE,
  LOCAL_UPLOAD_ROOT,
  LocalDiskStorage,
} from "@/lib/storage/local";
import { stripLocation } from "@/lib/images/metadata";
import type { ImageContentType } from "@/lib/images/validate";
import type { ImageStorage } from "@/lib/storage/types";
import { VercelBlobStorage } from "@/lib/storage/vercel-blob";

export type { ImageStorage } from "@/lib/storage/types";

const PHOTO_TYPES: readonly string[] = ["image/jpeg", "image/png", "image/webp"] satisfies ImageContentType[];

/**
 * Every photo is stored without the location a phone wrote into it - see
 * src/lib/images/metadata.ts. Done here, around whichever backend is chosen,
 * so no way of storing a photo (an upload, an import script) can miss it.
 */
function withoutLocations(storage: ImageStorage): ImageStorage {
  return {
    kind: storage.kind,
    put: (key, body, contentType) =>
      storage.put(key, PHOTO_TYPES.includes(contentType) ? stripLocation(body, contentType as ImageContentType) : body, contentType),
    remove: (url) => storage.remove(url),
  };
}

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
    return withoutLocations(new VercelBlobStorage());
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN is not set. Enable Vercel Blob for this project and add the token to the environment.",
    );
  }

  return withoutLocations(
    new LocalDiskStorage({
      root: LOCAL_UPLOAD_ROOT,
      publicBase: LOCAL_UPLOAD_PUBLIC_BASE,
    }),
  );
}
