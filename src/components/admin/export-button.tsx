"use client";

import { useRef, useState } from "react";

import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { ui } from "@/lib/brand/ui";
import type { ExportFormat } from "@/lib/export/products";
import { filterHref } from "@/lib/products/filter-href";

const FORMATS: { format: ExportFormat; name: string; use: string }[] = [
  { format: "csv", name: "CSV", use: "a spreadsheet, for Excel or Numbers" },
  { format: "json", name: "JSON", use: "for other software" },
  { format: "xml", name: "XML", use: "for other software" },
];

/**
 * Exports the products - as the list is filtered, so a file of just the
 * Christmas cards is one click from the Christmas cards - as CSV, JSON or
 * XML. All three hold the same products and figures and can be imported
 * back.
 *
 * It asks first, and the format is chosen there: the file holds every cost
 * and margin in the shop, and once downloaded it lives wherever the browser
 * puts it. The download itself is a hidden link with `download`, clicked once
 * confirmed: the file is served as an attachment, so the page stays put.
 */
export function ExportButton({ q, status, category, count }: { q: string; status: string; category: string; count: number }) {
  const [asking, setAsking] = useState(false);
  const [format, setFormat] = useState<ExportFormat>("csv");
  const link = useRef<HTMLAnchorElement>(null);

  const filtered = q.length > 0 || status.length > 0 || category.length > 0;
  const products = `${count} ${count === 1 ? "product" : "products"}`;
  const which = filtered ? (count === 1 ? "this" : "these") : "all";
  const name = FORMATS.find((option) => option.format === format)!.name;

  const base = filterHref("/admin/products/export", { q, status, category });
  const href = format === "csv" ? base : `${base}${base.includes("?") ? "&" : "?"}format=${format}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setAsking(true)}
        className={`rounded-md px-3.5 py-2 text-sm font-medium ${ui.buttonSecondary}`}
      >
        Export
      </button>

      <a ref={link} href={href} download hidden aria-hidden="true" tabIndex={-1} />

      <ConfirmDialog
        open={asking}
        tone="primary"
        title={`Export ${which} ${products}?`}
        description="A file of every product in this list: details, photo links, prices, and your costs and margins. Keep it somewhere private."
        confirmLabel={`Export ${products} as ${name}`}
        onCancel={() => setAsking(false)}
        onConfirm={() => {
          setAsking(false);
          link.current?.click();
        }}
      >
        <div role="radiogroup" aria-labelledby="export-format" className="flex flex-col gap-2">
          <p id="export-format" className="text-sm font-medium">
            Format
          </p>
          {FORMATS.map((option) => (
            <label key={option.format} className="flex items-center gap-2.5 text-sm">
              <input
                type="radio"
                name="export-format"
                value={option.format}
                checked={format === option.format}
                onChange={() => setFormat(option.format)}
                className={`size-4 ${ui.checkbox}`}
              />
              <span>
                <span className="font-medium">{option.name}</span> - {option.use}
              </span>
            </label>
          ))}
        </div>
      </ConfirmDialog>
    </>
  );
}
