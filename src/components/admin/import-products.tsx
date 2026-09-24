"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";

import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { FilePicker } from "@/components/admin/file-picker";
import { ui } from "@/lib/brand/ui";
import type { ImportPreview } from "@/lib/import/products";

export type { ImportPreview } from "@/lib/import/products";

export interface ImportResult {
  error: string | null;
  added: number;
  changed: number;
}

/** Well inside the server's limit on a request; a whole catalogue is well under 1MB in any format. */
const MAX_CSV_BYTES = 5 * 1024 * 1024;

const FORMAT_NAME = { csv: "CSV", json: "JSON", xml: "XML" } as const;

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/**
 * Importing products from a CSV, JSON or XML file - told apart by what it
 * holds, not what it is called: choose it, see exactly what it would change,
 * then import - or not.
 *
 * The file is checked the moment it is chosen. Nothing is written until the
 * preview has been seen and the import confirmed, and then the server works
 * the plan out afresh and applies it only if it still matches what was
 * shown. A file with any problem imports nothing: half an import is harder
 * to reason about than none.
 */
export function ImportProducts({
  check,
  apply,
}: {
  check: (csv: string) => Promise<ImportPreview>;
  apply: (csv: string, signature: string) => Promise<ImportResult>;
}) {
  const [csv, setCsv] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [message, setMessage] = useState<{ tone: "done" | "error"; text: string } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, startBusy] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function read(files: File[]) {
    const [file] = files;
    // A reset hands back no files; it is not a new choice.
    if (!file) return;
    setPreview(null);
    setMessage(null);

    if (file.size > MAX_CSV_BYTES) {
      setMessage({ tone: "error", text: `${file.name} is over 5MB. Import it in parts.` });
      return;
    }

    startBusy(async () => {
      const text = await file.text();
      const checked = await check(text);
      setCsv(text);
      setPreview(checked);
    });
  }

  function importNow() {
    setConfirming(false);
    if (!csv || !preview) return;
    const { signature } = preview;

    startBusy(async () => {
      const result = await apply(csv, signature);
      setPreview(null);
      setCsv(null);
      if (result.error) {
        setMessage({ tone: "error", text: result.error });
        return;
      }
      setMessage({ tone: "done", text: `Imported: ${result.added} added, ${result.changed} changed.` });
      formRef.current?.reset();
    });
  }

  const counts = preview?.counts;
  const toImport = counts ? counts.added + counts.changed : 0;
  const problemRows = preview?.rows.filter((row) => row.problems.length > 0) ?? [];
  const changingRows = preview?.rows.filter((row) => row.problems.length === 0 && row.kind !== "unchanged") ?? [];

  return (
    <form ref={formRef} onSubmit={(event) => event.preventDefault()} className="flex max-w-3xl flex-col gap-6">
      <FilePicker
        id="import-file"
        name="file"
        label="Product file"
        prompt="Choose a CSV, JSON or XML file"
        accept=".csv,.json,.xml,text/csv,application/json,application/xml,text/xml"
        hint="The file Export makes is the easiest to start from, in any of the three: export, change it, and bring it back. Nothing changes until you have seen what will."
        onFiles={read}
      />

      {busy && !preview ? <p className={`text-sm ${ui.mutedOnPage}`}>Working…</p> : null}

      {message?.tone === "done" ? (
        <p role="status" className={`rounded-md border px-3 py-2 text-sm ${ui.card} ${ui.rule}`}>
          {message.text}{" "}
          <Link href="/admin/products" className={ui.link}>
            See the products
          </Link>
        </p>
      ) : null}

      {message?.tone === "error" || preview?.error ? (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {preview?.error ?? message?.text}
        </p>
      ) : null}

      {preview && !preview.error && counts ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-base font-semibold">What the file would do</h2>
          <p className="text-sm">
            {counts.added} new, {counts.changed} to change, {counts.unchanged} unchanged.
          </p>
          {preview.format ? <p className={`text-xs ${ui.mutedOnPage}`}>Read as {FORMAT_NAME[preview.format]}.</p> : null}

          <div className={`flex flex-col gap-1 text-xs ${ui.mutedOnPage}`}>
            {preview.columns.workedOut.length > 0 ? <p>Worked out, so not imported: {preview.columns.workedOut.join(", ")}.</p> : null}
            {preview.columns.notImported.length > 0 ? <p>Not imported: {preview.columns.notImported.join(", ")}.</p> : null}
            {preview.columns.unknown.length > 0 ? <p>Not recognised, so ignored: {preview.columns.unknown.join(", ")}.</p> : null}
          </div>

          {problemRows.length > 0 ? (
            <div role="alert" className="flex flex-col gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
              <p className="font-medium">
                {plural(problemRows.length, "row needs", "rows need")} fixing first. Nothing has been imported.
              </p>
              <ul className="flex list-disc flex-col gap-1 pl-5">
                {problemRows.flatMap((row) =>
                  row.problems.map((problem) => (
                    <li key={`${row.row}-${problem}`}>
                      {preview.unit} {row.row} ({row.name}): {problem}
                    </li>
                  )),
                )}
              </ul>
              <p>Fix them in the file and choose it again.</p>
            </div>
          ) : null}

          {toImport === 0 && problemRows.length === 0 ? (
            <p className="text-sm">Everything in the file matches the shop already. Nothing to import.</p>
          ) : null}

          {changingRows.length > 0 ? (
            <ul aria-label="What would change" className={`flex flex-col divide-y rounded-md border text-sm ${ui.rule}`}>
              {changingRows.map((row) => (
                <li key={row.row} className="flex flex-col gap-1 px-3 py-2">
                  <p className="flex flex-wrap items-baseline gap-x-2">
                    <strong className="font-medium">{row.name}</strong>
                    <span className={`text-xs ${ui.mutedOnPage}`}>
                      {preview.unit} {row.row}
                    </span>
                  </p>
                  {row.kind === "new" ? <p className="text-xs font-medium">New</p> : null}
                  <ul className={`flex flex-col text-xs ${ui.mutedOnPage}`}>
                    {row.changes.map((change) => (
                      <li key={change.label}>
                        {row.kind === "new" ? `${change.label}: ${change.to}` : `${change.label}: ${change.from} → ${change.to}`}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          ) : null}

          {toImport > 0 ? (
            <button
              type="button"
              disabled={busy || problemRows.length > 0}
              onClick={() => setConfirming(true)}
              className={`self-start rounded-md px-4 py-2.5 text-sm font-medium ${ui.buttonPrimary}`}
            >
              Import {plural(toImport, "change", "changes")}
            </button>
          ) : null}
        </section>
      ) : null}

      <ConfirmDialog
        open={confirming}
        tone="primary"
        title={`Import ${plural(toImport, "change", "changes")}?`}
        description={`${plural(counts?.added ?? 0, "new product", "new products")} and ${counts?.changed ?? 0} changed. Nothing records what they were before, so export a copy first if you might want it back.`}
        confirmLabel={`Import ${plural(toImport, "change", "changes")}`}
        onCancel={() => setConfirming(false)}
        onConfirm={importNow}
      />
    </form>
  );
}
