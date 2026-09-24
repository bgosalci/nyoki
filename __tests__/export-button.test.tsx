import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ExportButton } from "@/components/admin/export-button";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});

/** The download itself: a click on the hidden link to the file. */
let downloaded: HTMLAnchorElement[] = [];
beforeEach(() => {
  downloaded = [];
  jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    downloaded.push(this);
  });
});
afterEach(() => jest.restoreAllMocks());

function setup(props: Partial<React.ComponentProps<typeof ExportButton>> = {}) {
  render(<ExportButton q="" status="" category="" count={237} {...props} />);
  return userEvent.setup();
}

describe("ExportButton", () => {
  it("asks before exporting, saying what the file will hold", async () => {
    const user = setup();

    await user.click(screen.getByRole("button", { name: /export csv/i }));

    const dialog = screen.getByRole("dialog", { name: "Export all 237 products?" });
    expect(dialog).toHaveTextContent(/costs and margins/i);
    expect(downloaded).toHaveLength(0);
  });

  it("exports once confirmed", async () => {
    const user = setup();

    await user.click(screen.getByRole("button", { name: /export csv/i }));
    await user.click(screen.getByRole("button", { name: "Export 237 products" }));

    expect(downloaded).toHaveLength(1);
    expect(downloaded[0]).toHaveAttribute("href", "/admin/products/export");
    expect(downloaded[0]).toHaveAttribute("download");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("exports nothing when called off", async () => {
    const user = setup();

    await user.click(screen.getByRole("button", { name: /export csv/i }));
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(downloaded).toHaveLength(0);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("exports the list as it is filtered, and says so", async () => {
    const user = setup({ q: "card", status: "ACTIVE", category: "christmas-cards", count: 21 });

    await user.click(screen.getByRole("button", { name: /export csv/i }));
    expect(screen.getByRole("dialog", { name: "Export these 21 products?" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Export 21 products" }));

    expect(downloaded[0]).toHaveAttribute("href", "/admin/products/export?q=card&status=ACTIVE&category=christmas-cards");
  });

  it("speaks of one product as one", async () => {
    const user = setup({ q: "stars", count: 1 });

    await user.click(screen.getByRole("button", { name: /export csv/i }));

    expect(screen.getByRole("dialog", { name: "Export this 1 product?" })).toBeInTheDocument();
  });
});
