/**
 * Writing CSV that Excel and Numbers both open cleanly: RFC 4180 quoting,
 * CRLF between rows, and a byte-order mark so Excel reads it as UTF-8 rather
 * than mangling £ and accented names.
 */

/** A cell a spreadsheet should read as a number - money, a percentage. */
export interface NumberCell {
  number: string;
}

export type Cell = string | NumberCell | null;

export const num = (text: string): NumberCell => ({ number: text });

// A spreadsheet runs a cell starting with one of these as a formula. Text is
// never meant as one here - names are typed in the admin or came from the
// Shopify import - so it is marked as text with a leading apostrophe, which
// is what a spreadsheet does itself when you type text that looks like one.
const FORMULA_START = /^[=+\-@\t\r]/;

function quoted(text: string): string {
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function write(cell: Cell): string {
  if (cell === null) return "";
  if (typeof cell === "string") return quoted(FORMULA_START.test(cell) ? `'${cell}` : cell);
  return quoted(cell.number);
}

export function toCsv(rows: readonly (readonly Cell[])[]): string {
  return "﻿" + rows.map((row) => row.map(write).join(",") + "\r\n").join("");
}
