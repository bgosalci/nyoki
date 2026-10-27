"use client";

import { useState } from "react";

import { ui } from "@/lib/brand/ui";

/**
 * Copies a piece of text, so words a shopper typed - a message to print, a
 * note for the parcel - are never retyped by hand. Says it worked, a while.
 */
export function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => {
        navigator.clipboard
          .writeText(text)
          .then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          })
          .catch(() => setCopied(false));
      }}
      className={`shrink-0 rounded px-2.5 py-0.5 text-xs font-medium ${ui.buttonSecondary}`}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
