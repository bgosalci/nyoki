import { render, screen } from "@testing-library/react";

import { SiteName } from "@/components/site-name";

// Smoke test for the test harness itself: proves the SWC transform, the
// `@/*` alias, jsdom rendering and the jest-dom matchers are all wired up.
describe("test harness", () => {
  it("renders a component resolved through the @/ alias", () => {
    render(<SiteName />);

    expect(screen.getByRole("heading", { name: "Nyoki" })).toBeInTheDocument();
  });
});
