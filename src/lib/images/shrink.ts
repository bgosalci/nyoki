/**
 * Shrinking a large photo in the browser before it is uploaded.
 *
 * Vercel refuses a request body over 4.5MB whatever Next is configured to
 * take, and a phone photo is often more. So a photo over SHRINK_ABOVE_BYTES,
 * or larger than MAX_EDGE on its long side, is scaled to fit and saved again
 * at high quality. Anything smaller goes up exactly as it was - most of the
 * catalogue - so nothing is re-compressed that did not need to be.
 *
 * MAX_EDGE is well above anything the shop shows: next/image serves the
 * largest product view at a fraction of it.
 *
 * Nothing here can stop an upload. A photo the browser cannot read or write
 * is sent as it was, and the server's own checks decide.
 */

export const MAX_EDGE = 3000;

/** Under Vercel's 4.5MB, with room for the multipart around the file. */
export const SHRINK_ABOVE_BYTES = 3.5 * 1024 * 1024;

/** Tried in turn until the photo is light enough to send. */
const QUALITIES = [0.9, 0.8, 0.7];

export interface DecodedPhoto {
  width: number;
  height: number;
  close(): void;
}

/** What the browser does, passed in so the rules above can be tested without a canvas. */
export interface PhotoCodec {
  decode(file: File): Promise<DecodedPhoto>;
  encode(image: DecodedPhoto, size: { width: number; height: number }, type: string, quality: number): Promise<Blob>;
}

export function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export function needsShrinking({ bytes, width, height }: { bytes: number; width: number; height: number }): boolean {
  return bytes > SHRINK_ABOVE_BYTES || Math.max(width, height) > MAX_EDGE;
}

function renamed(name: string, type: string): string {
  if (type === "image/jpeg" && /\.jpe?g$/i.test(name)) return name;
  const extension = type === "image/webp" ? "webp" : "jpg";
  return /\.[^.]+$/.test(name) ? name.replace(/\.[^.]+$/, `.${extension}`) : `${name}.${extension}`;
}

export const browserCodec: PhotoCodec = {
  // Turned the way the camera meant, from its orientation tag.
  decode: (file) => createImageBitmap(file, { imageOrientation: "from-image" }),
  encode: (image, { width, height }, type, quality) =>
    new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("No canvas to draw on."));
        return;
      }
      context.imageSmoothingQuality = "high";
      context.drawImage(image as ImageBitmap, 0, 0, width, height);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("The photo could not be saved again."))), type, quality);
    }),
};

export async function shrinkPhoto(file: File, codec: PhotoCodec = browserCodec): Promise<File> {
  let image: DecodedPhoto;
  try {
    image = await codec.decode(file);
  } catch {
    return file;
  }

  try {
    if (!needsShrinking({ bytes: file.size, width: image.width, height: image.height })) return file;

    const size = fitWithin(image.width, image.height, MAX_EDGE);
    // A PNG or WebP may have see-through parts, which JPEG would fill black.
    let type = file.type === "image/png" || file.type === "image/webp" ? "image/webp" : "image/jpeg";
    let best: Blob | null = null;

    for (const quality of QUALITIES) {
      let blob = await codec.encode(image, size, type, quality);
      if (blob.type !== type && type === "image/webp") {
        // A browser that cannot write WebP hands back something else.
        type = "image/jpeg";
        blob = await codec.encode(image, size, type, quality);
      }
      if (blob.type !== type) return file;
      best = blob;
      if (blob.size <= SHRINK_ABOVE_BYTES) break;
    }

    return best ? new File([best], renamed(file.name, type), { type, lastModified: file.lastModified }) : file;
  } catch {
    return file;
  } finally {
    image.close();
  }
}
