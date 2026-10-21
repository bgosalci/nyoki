import type { ReactElement } from "react";

import RootLayout from "@/app/layout";

type Element = ReactElement<{ suppressHydrationWarning?: boolean; children?: unknown }>;

describe("RootLayout", () => {
  it("lets <html> carry the theme the admin's script writes before React", () => {
    const html = RootLayout({ children: null } as never) as Element;

    expect(html.type).toBe("html");
    expect(html.props.suppressHydrationWarning).toBe(true);
  });

  it("lets <body> carry what browser extensions write onto it before React", () => {
    // Grammarly marks <body> with data-gr-ext-installed and friends, and the
    // dev overlay reported every admin page as a hydration error for it.
    const body = (RootLayout({ children: null } as never) as Element).props.children as Element;

    expect(body.type).toBe("body");
    expect(body.props.suppressHydrationWarning).toBe(true);
  });
});
