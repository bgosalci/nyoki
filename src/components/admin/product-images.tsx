"use client";

import { ui } from "@/lib/brand/ui";
import { useRef, useState, useTransition, type FormEvent } from "react";

import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { FilePicker } from "@/components/admin/file-picker";
import { validateImageUpload } from "@/lib/images/validate";

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

/** Enough of a file to tell what it really is; the server reads the same. */
const SNIFF_BYTES = 16;

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
  const [error, setError] = useState(initialUploadState.error);
  const [isUploading, startUpload] = useTransition();
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const chosenFiles = useRef<File[]>([]);

  const ordered = [...images].sort((a, b) => a.position - b.position);
  const [removing, setRemoving] = useState<ProductImageItem | null>(null);
  const [chosen, setChosen] = useState(0);

  /**
   * Photos go up one per request. Several phone photos in one request broke
   * the server's size limit, and a request can only be so large (Vercel
   * refuses anything over 4.5MB). The whole batch is checked here first,
   * with the server's own rules, so one bad file still adds none of them;
   * the server checks each again as it arrives.
   */
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const files = chosenFiles.current;
    setError(null);

    for (const [index, file] of files.entries()) {
      const head = new Uint8Array(await file.slice(0, SNIFF_BYTES).arrayBuffer());
      const check = validateImageUpload({ name: file.name, type: file.type, size: file.size, head, existingCount: images.length + index });
      if (!check.ok) {
        setError(check.error);
        return;
      }
    }

    setProgress({ current: 1, total: files.length });
    startUpload(async () => {
      for (const [index, file] of files.entries()) {
        setProgress({ current: index + 1, total: files.length });
        const one = new FormData();
        one.append("files", file);
        const result = await actions.upload({ error: null }, one);
        if (result.error) {
          setError(index > 0 ? `${index} of ${files.length} uploaded. ${file.name}: ${result.error}` : result.error);
          break;
        }
      }
      setProgress(null);
      form.reset();
    });
  }


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

                <button type="button" onClick={() => setRemoving(image)} className={buttonClass}>
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form id="remove-photo" action={removing ? actions.remove.bind(null, removing.id) : undefined} hidden />
      <ConfirmDialog
        open={removing !== null}
        title="Remove this photo?"
        description={removing?.alt ? `"${removing.alt}" will be taken off the product. This cannot be undone.` : "It will be taken off the product. This cannot be undone."}
        confirmLabel="Remove photo"
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          (document.getElementById("remove-photo") as HTMLFormElement | null)?.requestSubmit();
          setRemoving(null);
        }}
      />

      <form onSubmit={upload} className="flex flex-col gap-3">
        {error ? (
          <p
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
          >
            {error}
          </p>
        ) : null}

        <FilePicker
          id="product-photos"
          name="files"
          label="Add photos"
          prompt="Choose photos"
          hint="JPEG, PNG or WebP, up to 10MB each. Up to 10 photos per product."
          accept={ACCEPT}
          multiple
          onFiles={(files) => {
            chosenFiles.current = files;
            setChosen(files.length);
          }}
        />
        <button
          type="submit"
          // Nothing chosen, nothing to upload: the button says so rather than
          // posting an empty form for the server to refuse.
          disabled={isUploading || progress !== null || chosen === 0}
          className={`self-start rounded-md px-3.5 py-1.5 text-sm font-medium ${ui.buttonPrimary}`}
        >
          {progress
            ? `Uploading ${progress.current} of ${progress.total}…`
            : isUploading
              ? "Uploading…"
              : chosen > 0
                ? `Upload ${chosen} ${chosen === 1 ? "photo" : "photos"}`
                : "Upload"}
        </button>
      </form>
    </section>
  );
}
