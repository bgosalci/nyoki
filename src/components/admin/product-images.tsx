"use client";

import { ui } from "@/lib/brand/ui";
import { useActionState } from "react";

export interface ProductImageItem {
  id: string;
  url: string;
  alt: string | null;
  position: number;
}

export interface UploadState {
  error: string | null;
}

export interface ProductImageActions {
  upload: (state: UploadState, formData: FormData) => Promise<UploadState>;
  remove: (imageId: string) => Promise<void>;
  move: (imageId: string, direction: "up" | "down") => Promise<void>;
}

const EMPTY: UploadState = { error: null };

const ACCEPT = "image/jpeg,image/png,image/webp";

const buttonClass = `rounded-md px-2.5 py-1 text-xs disabled:opacity-40 ${ui.buttonSecondary}`;

export function ProductImages({
  images,
  actions,
  initialUploadState = EMPTY,
}: {
  productId: string;
  images: ProductImageItem[];
  actions: ProductImageActions;
  initialUploadState?: UploadState;
}) {
  const [state, uploadAction, isUploading] = useActionState(
    actions.upload,
    initialUploadState,
  );

  const ordered = [...images].sort((a, b) => a.position - b.position);

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-sm font-semibold">Photos</h2>

      {ordered.length === 0 ? (
        <p className={`text-sm ${ui.mutedOnPage}`}>
          No photos yet. The first one you add becomes the main photo.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {ordered.map((image, index) => (
            <li
              key={image.id}
              className={`flex flex-col gap-2 rounded-lg border p-2 ${ui.panel} ${ui.rule}`}
            >
              <div className="relative aspect-square overflow-hidden rounded-md bg-nyoki-soft-ash">
                {/* alt="" marks a photo without a description as decorative, so a
                    screen reader skips it instead of reading the filename. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url}
                  alt={image.alt ?? ""}
                  className="size-full object-cover"
                />
                {index === 0 ? (
                  <span className={`absolute top-1.5 left-1.5 rounded px-1.5 py-0.5 text-[10px] font-medium ${ui.badgeDark}`}>
                    Main photo
                  </span>
                ) : null}
              </div>

              <div className="flex items-center justify-between gap-1">
                <div className="flex gap-1">
                  <form action={actions.move.bind(null, image.id, "up")}>
                    <button
                      type="submit"
                      disabled={index === 0}
                      aria-label={`Move up: ${image.alt ?? `photo ${index + 1}`}`}
                      className={buttonClass}
                    >
                      ↑
                    </button>
                  </form>
                  <form action={actions.move.bind(null, image.id, "down")}>
                    <button
                      type="submit"
                      disabled={index === ordered.length - 1}
                      aria-label={`Move down: ${image.alt ?? `photo ${index + 1}`}`}
                      className={buttonClass}
                    >
                      ↓
                    </button>
                  </form>
                </div>

                <form
                  action={actions.remove.bind(null, image.id)}
                  onSubmit={(event) => {
                    if (!window.confirm("Remove this photo? This cannot be undone.")) {
                      event.preventDefault();
                    }
                  }}
                >
                  <button type="submit" className={buttonClass}>
                    Remove
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form action={uploadAction} className="flex flex-col gap-3">
        {state.error ? (
          <p
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
          >
            {state.error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="product-photos" className="text-sm font-medium">
            Add photos
          </label>
          <input
            id="product-photos"
            name="files"
            type="file"
            multiple
            accept={ACCEPT}
            required
            className="text-sm"
          />
          <button
            type="submit"
            disabled={isUploading}
            className={`rounded-md px-3.5 py-1.5 text-sm font-medium ${ui.buttonPrimary}`}
          >
            {isUploading ? "Uploading…" : "Upload"}
          </button>
        </div>
        <p className={`text-xs ${ui.mutedOnPage}`}>
          JPEG, PNG or WebP, up to 10MB each. Up to 10 photos per product.
        </p>
      </form>
    </section>
  );
}
