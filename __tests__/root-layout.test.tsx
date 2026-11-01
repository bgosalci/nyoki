import type { ReactElement } from "react";

import RootLayout from "@/app/layout";
import { THEME_BOOTSTRAP } from "@/lib/admin/theme";

type Element = ReactElement<{
  suppressHydrationWarning?: boolean;
  children?: unknown;
  dangerouslySetInnerHTML?: { __html: string };
}>;

const html = () => RootLayout({ children: null } as never) as Element;
const parts = () => [html().props.children].flat() as Element[];

describe("RootLayout", () => {
  it("lets <html> carry the theme the admin's script writes before React", () => {
    expect(html().type).toBe("html");
    expect(html().props.suppressHydrationWarning).toBe(true);
  });

  it("runs the admin's theme script in <head>, so a chosen theme is on the page before it first paints", () => {
    // Rendered by the admin's own layout instead, it ran on a full load but
    // made React warn on every client-side arrival in the admin: a script
    // React renders in the browser is never run.
    const [head, body] = parts();

    expect(head.type).toBe("head");
    expect(body.type).toBe("body");
    const script = [head.props.children].flat()[0] as Element;
    expect(script.type).toBe("script");
    expect(script.props.dangerouslySetInnerHTML).toEqual({ __html: THEME_BOOTSTRAP });
  });

  it("lets <body> carry what browser extensions write onto it before React", () => {
    // Grammarly marks <body> with data-gr-ext-installed and friends, and the
    // dev overlay reported every admin page as a hydration error for it.
    const body = parts().find((part) => part.type === "body")!;

    expect(body.props.suppressHydrationWarning).toBe(true);
  });
});
