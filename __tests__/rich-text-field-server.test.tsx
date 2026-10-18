/**
 * @jest-environment node
 */
import { renderToStaticMarkup } from "react-dom/server";

import { RichTextField } from "@/components/admin/rich-text-field";

describe("RichTextField before the editor starts", () => {
  // The editor only exists in the browser, so the page arrives - and stays
  // until it starts - showing the saved text as it will look.
  const markup = renderToStaticMarkup(
    <RichTextField id="d" name="description" defaultValue={"Send heavenly wishes.\n\nA keepsake."} />,
  );

  it("shows the saved text, formatted", () => {
    expect(markup).toContain("<p>Send heavenly wishes.</p>");
    expect(markup).toContain("<p>A keepsake.</p>");
  });

  it("spaces its paragraphs once, as the editor will, so nothing jumps when it starts", () => {
    // The shop's paragraphs are already gap-3 apart; the editor's own rule
    // for spacing its children ([&>*+*]:mt-3) on top doubled the gap.
    const preview = /<div class="([^"]*)"><p>Send heavenly wishes/.exec(markup)?.[1] ?? "";

    expect(preview).toContain("gap-3");
    expect(preview).not.toContain("mt-3");
  });

  it("posts the saved text even before the editor starts", () => {
    expect(markup).toContain('<input type="hidden" name="description" value="Send heavenly wishes.');
  });
});
