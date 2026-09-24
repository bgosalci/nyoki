/** A file that cannot be read as CSV at all, said in words a person can act on. */
export class CsvError extends Error {}

/**
 * Reads CSV as Excel, Numbers and our own export write it (RFC 4180): cells
 * split by commas, a quoted cell may hold commas, doubled quotes and line
 * breaks, rows end in CRLF or LF. A leading byte-order mark is dropped, and
 * rows with nothing in them are skipped.
 */
export function parseCsv(text: string): string[][] {
  const source = text.startsWith("\uFEFF") ? text.slice(1) : text;
  const rows: string[][] = [];

  let row: string[] = [];
  let cell = "";
  let quoted = false;
  let rowNumber = 1;
  let quoteOpenedIn = 0;

  const endRow = () => {
    row.push(cell);
    if (row.some((value) => value.trim().length > 0)) rows.push(row);
    row = [];
    cell = "";
    rowNumber += 1;
  };

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];

    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"' && cell.length === 0) {
      quoted = true;
      quoteOpenedIn = rowNumber;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\r" || char === "\n") {
      if (char === "\r" && source[i + 1] === "\n") i += 1;
      endRow();
    } else {
      cell += char;
    }
  }

  if (quoted) throw new CsvError(`A quote opened in row ${quoteOpenedIn} is never closed.`);
  if (cell.length > 0 || row.length > 0) endRow();

  return rows;
}
