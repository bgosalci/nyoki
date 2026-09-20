"use client";

import { useId } from "react";

import { ui } from "@/lib/brand/ui";

/**
 * A labelled box on the storefront.
 *
 * The admin has its own; this one is light only, because the admin's carries
 * dark-mode colours that render as a near-black box on the shop's warm pages.
 */
export const shopInputClass =
  "w-full rounded border border-nyoki-light-slate bg-nyoki-white px-3 py-2.5 text-sm text-nyoki-navy outline-none focus:border-nyoki-navy aria-[invalid]:border-red-500";

export function ShopField({
  label,
  name,
  error,
  hint,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  children: (props: {
    id: string;
    name: string;
    "aria-invalid"?: "true";
    "aria-describedby"?: string;
  }) => React.ReactNode;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ");

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>

      {children({
        id,
        name,
        ...(error ? { "aria-invalid": "true" as const } : {}),
        ...(describedBy ? { "aria-describedby": describedBy } : {}),
      })}

      {hint ? (
        <p id={hintId} className={`text-xs ${ui.shopMuted}`}>
          {hint}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} className="text-xs text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
