"use client";

import { useId, useState } from "react";

import { PhotoChooser, type ChooserItem } from "@/components/admin/photo-chooser";
import { ProductThumbnail } from "@/components/admin/product-thumbnail";
import { ui } from "@/lib/brand/ui";

/**
 * A form field whose value is chosen by photograph: a box showing what is
 * chosen, a Choose button that opens the shared PhotoChooser, and Clear.
 *
 * Every choose-by-photo field in the admin is one of these - the home page's
 * main photo, a piece's row of the old price lists - so they look and behave
 * alike. It holds no value of its own: the caller keeps it, since choosing
 * can mean more than recording an id (a price-list row fills a piece's costs
 * in). Given a `name`, it also posts the id in a hidden input.
 */
export function PhotoField({
  label,
  name,
  items,
  value,
  onChange,
  emptyLabel,
  missingLabel,
  chooserTitle,
  lead,
  hint,
  error,
}: {
  label: string;
  name?: string;
  items: ChooserItem[];
  value: string | null;
  onChange: (id: string | null) => void;
  /** What it means to choose nothing - "the newest piece", "none chosen", … */
  emptyLabel: string;
  /** What to call a chosen id no longer among the items. */
  missingLabel: string;
  chooserTitle: string;
  /** Shown in the chooser above its search - what is being matched. */
  lead?: React.ReactNode;
  hint?: string;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const labelId = useId();

  // Something chosen before it dropped out of the list keeps its id, so the
  // absence shows as a name rather than quietly reverting the choice.
  const current = items.find((item) => item.id === value) ?? null;

  return (
    // A group rather than a labelled control: this is a preview, a button and
    // a hidden input working together. Pointed at the button instead, the
    // label renames it and "Choose" stops being announced at all.
    <div role="group" aria-labelledby={labelId} className="flex flex-col gap-1.5">
      <p id={labelId} className="text-sm font-medium">
        {label}
      </p>

      {name ? <input type="hidden" name={name} value={value ?? ""} /> : null}

      <div className={`flex items-center gap-3 rounded-md border p-2 ${ui.rule}`}>
        {value ? (
          <>
            <ProductThumbnail image={current?.imageUrl ? { url: current.imageUrl, alt: null } : null} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{current?.title ?? missingLabel}</p>
              {current && current.details.length > 0 ? (
                <p className={`truncate text-xs ${ui.mutedOnPage}`}>{current.details.join(" · ")}</p>
              ) : null}
            </div>
          </>
        ) : (
          <p className={`min-w-0 flex-1 truncate px-1 text-sm ${ui.mutedOnPage}`}>{emptyLabel}</p>
        )}

        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={`rounded-md px-3 py-1.5 text-sm ${ui.buttonSecondary}`}
          >
            Choose
          </button>

          {value ? (
            <button
              type="button"
              onClick={() => onChange(null)}
              className={`rounded-md px-3 py-1.5 text-sm underline underline-offset-4 ${ui.mutedOnPage}`}
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>

      {hint ? <p className={`text-xs ${ui.mutedOnPage}`}>{hint}</p> : null}
      {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}

      <PhotoChooser
        open={open}
        title={chooserTitle}
        items={items}
        selectedId={value}
        lead={lead}
        onChoose={(id) => {
          setOpen(false);
          onChange(id);
        }}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}
