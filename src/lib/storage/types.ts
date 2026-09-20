/**
 * Where uploaded product photos live.
 *
 * The CMS talks to this interface only, so the backend can change without
 * touching the upload screen or the image actions.
 */
export interface ImageStorage {
  readonly kind: "vercel-blob" | "local-disk";

  /** Store `body` under `key` and return the URL it is served from. */
  put(key: string, body: Uint8Array, contentType: string): Promise<{ url: string }>;

  /** Delete by the URL `put` returned. Already-gone is not an error. */
  remove(url: string): Promise<void>;
}
