"use client";

import { useId } from "react";

import { inputClass } from "@/components/admin/field";
import { Select } from "@/components/admin/select";
import { ui } from "@/lib/brand/ui";
import { SHOP_PAGES } from "@/lib/home/links";

export interface LinkTarget {
  id: string;
  /** Its place in the tree: "Cards › Christmas Cards". */
  path: string;
}

/** What the chooser holds: its choice, and the address typed for somewhere else. */
export interface LinkDraft {
  choice: string;
  address: string;
}

/**
 * Where something leads: one of the shop's pages, a category by its place in
 * the tree, or somewhere else by address - another page of the shop, a
 * piece, another website.
 *
 * Controlled, and posting nothing itself: the caller keeps the value and
 * posts it, since a tile's fields go together with the rest of that tile.
 */
export function LinkField({
  label,
  value,
  onChange,
  categories,
  hint,
  error,
}: {
  label: string;
  value: LinkDraft;
  onChange: (value: LinkDraft) => void;
  categories: readonly LinkTarget[];
  hint?: string;
  error?: string;
}) {
  const id = useId();
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined;
  const invalid = error ? ("true" as const) : undefined;

  // A category chosen before it was deleted is no longer among the options.
  const lost = value.choice.startsWith("category:") && !categories.some((category) => `category:${category.id}` === value.choice);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`${id}-choice`} className="text-sm font-medium">
        {label}
      </label>
      <Select
        id={`${id}-choice`}
        value={value.choice}
        onChange={(event) => onChange({ ...value, choice: event.target.value })}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        className={inputClass}
      >
        {value.choice === "" ? <option value="">Choose where it leads</option> : null}
        {lost ? <option value={value.choice}>A category no longer there</option> : null}
        <optgroup label="Pages">
          {SHOP_PAGES.map((page) => (
            <option key={page.href} value={`page:${page.href}`}>
              {page.label}
            </option>
          ))}
        </optgroup>
        <optgroup label="Categories">
          {categories.map((category) => (
            <option key={category.id} value={`category:${category.id}`}>
              {category.path}
            </option>
          ))}
        </optgroup>
        <optgroup label="Somewhere else">
          <option value="other">A piece, another page or a website…</option>
        </optgroup>
      </Select>

      {value.choice === "other" ? (
        <>
          <label htmlFor={`${id}-address`} className="mt-1 text-sm font-medium">
            Address
          </label>
          <input
            id={`${id}-address`}
            type="text"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            value={value.address}
            onChange={(event) => onChange({ ...value, address: event.target.value })}
            placeholder="/product/let-it-snow or https://…"
            aria-invalid={invalid}
            aria-describedby={describedBy}
            className={inputClass}
          />
        </>
      ) : null}

      {hint ? (
        <p id={`${id}-hint`} className={`text-xs ${ui.mutedOnPage}`}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
