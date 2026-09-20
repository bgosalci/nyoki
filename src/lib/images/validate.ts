/**
 * Product image upload rules.
 *
 * The format is decided by sniffing the first bytes, never by the declared
 * MIME type or the filename. Both of those come from the client and can say
 * anything; an HTML file relabelled image/png would otherwise be stored and
 * served from our own domain, where it can run script.
 */

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_IMAGES_PER_PRODUCT = 10;

export type ImageContentType = "image/jpeg" | "image/png" | "image/webp";

const EXTENSION: Record<ImageContentType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export interface ImageUploadCandidate {
  name: string;
  /** Declared by the client. Ignored for the decision, kept for messages. */
  type: string;
  size: number;
  /** The first bytes of the file - a dozen is enough for every format here. */
  head: Uint8Array;
  existingCount: number;
}

export type ImageUploadValidation =
  | { ok: true; contentType: ImageContentType; extension: string }
  | { ok: false; error: string };

function startsWith(bytes: Uint8Array, offset: number, signature: number[]): boolean {
  if (bytes.byteLength < offset + signature.length) return false;
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

/** The image format the bytes actually are, or null for anything else. */
export function sniffImageType(head: Uint8Array): ImageContentType | null {
  if (startsWith(head, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  if (startsWith(head, 0, [0xff, 0xd8, 0xff])) {
    return "image/jpeg";
  }
  // RIFF....WEBP - four bytes of file size sit between the two markers.
  if (startsWith(head, 0, [0x52, 0x49, 0x46, 0x46]) && startsWith(head, 8, [0x57, 0x45, 0x42, 0x50])) {
    return "image/webp";
  }
  return null;
}

export function validateImageUpload(candidate: ImageUploadCandidate): ImageUploadValidation {
  if (candidate.existingCount >= MAX_IMAGES_PER_PRODUCT) {
    return {
      ok: false,
      error: `A product can have up to ${MAX_IMAGES_PER_PRODUCT} photos. Remove one first.`,
    };
  }

  if (candidate.size === 0) {
    return { ok: false, error: `${candidate.name} is empty.` };
  }

  if (candidate.size > MAX_IMAGE_BYTES) {
    const limitMb = Math.round(MAX_IMAGE_BYTES / (1024 * 1024));
    return { ok: false, error: `${candidate.name} is over ${limitMb}MB. Try a smaller copy.` };
  }

  const contentType = sniffImageType(candidate.head);

  if (contentType === null) {
    return {
      ok: false,
      error: `${candidate.name} is not an image we can use. Upload a JPEG, PNG or WebP.`,
    };
  }

  return { ok: true, contentType, extension: EXTENSION[contentType] };
}
