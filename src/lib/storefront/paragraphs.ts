/**
 * Free text from the CMS, split where Njomza left a blank line. Line endings
 * are normalised first: a textarea submits \r\n, so anything saved before the
 * save step began tidying them still holds \r\n\r\n between paragraphs.
 * A single line break stays inside its paragraph, as \n.
 */
export function paragraphs(text: string): string[] {
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n[ \t]*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
}
