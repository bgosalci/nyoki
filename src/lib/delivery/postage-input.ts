import type { PostageFacts } from "@/lib/delivery/parcel";
import { isParcelSize } from "@/lib/delivery/royal-mail";

/**
 * A piece's postage as a form posts it - a product's Details tab, a
 * category's usual postage, a row of the weighing sheet - each part blank to
 * come from the usual. One reader, so all three take the same answers.
 */

export interface PostageNames {
  grams: string;
  size: string;
  mm: string;
}

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/** Blank is null; a whole number is itself; anything else is undefined. */
function whole(raw: string): number | null | undefined {
  if (raw === "") return null;
  return /^\d{1,6}$/.test(raw) ? Number.parseInt(raw, 10) : undefined;
}

export function readPostage(form: FormData, names: PostageNames): { facts: PostageFacts; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  const grams = whole(text(form, names.grams));
  if (grams === undefined) errors[names.grams] = "Weight has to be a whole number of grams.";

  const sizeRaw = text(form, names.size);
  const size = sizeRaw === "" ? null : isParcelSize(sizeRaw) ? sizeRaw : undefined;
  if (size === undefined) errors[names.size] = "Choose how it goes in the post.";

  const mm = whole(text(form, names.mm));
  if (mm === undefined) errors[names.mm] = "Thickness has to be a whole number of millimetres.";

  return { facts: { grams: grams ?? null, size: size ?? null, mm: mm ?? null }, errors };
}

export type PostageStatus = "weighed" | "usual" | "unweighed";

/** Whether a piece has a weight of its own, goes by its category's, or has none and counts as the set weight. */
export function postageStatus(own: PostageFacts, usual: PostageFacts | null): PostageStatus {
  if (own.grams !== null) return "weighed";
  return usual?.grams != null ? "usual" : "unweighed";
}

/** The weighing sheet's rows: each piece it posts, once, with its boxes named "w.<id>", "s.<id>" and "t.<id>". */
export function readWeighSheet(form: FormData): { rows: { id: string; facts: PostageFacts }[]; errors: Record<string, string> } {
  const ids = [...new Set(form.getAll("id").filter((id): id is string => typeof id === "string" && id !== ""))];
  const errors: Record<string, string> = {};
  const rows = ids.map((id) => {
    const read = readPostage(form, { grams: `w.${id}`, size: `s.${id}`, mm: `t.${id}` });
    Object.assign(errors, read.errors);
    return { id, facts: read.facts };
  });
  return { rows, errors };
}
