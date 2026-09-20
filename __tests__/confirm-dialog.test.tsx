import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { ui } from "@/lib/brand/ui";

// jsdom does not implement the dialog element's modal methods.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); this.dispatchEvent(new Event("close")); };
});

const props = {
  title: "Delete this category?",
  description: "Its sub-categories move to the top level.",
  confirmLabel: "Delete category",
  onConfirm: jest.fn(),
  onCancel: jest.fn(),
};

describe("ConfirmDialog", () => {
  beforeEach(() => jest.clearAllMocks());

  it("is a labelled dialog showing the question and its consequences when open", () => {
    render(<ConfirmDialog open {...props} />);

    const dialog = screen.getByRole("dialog", { name: "Delete this category?" });
    expect(dialog).toHaveAttribute("open");
    expect(dialog).toHaveTextContent("Its sub-categories move to the top level.");
  });

  it("dims the page with a neutral scrim rather than a blue brand tint", () => {
    render(<ConfirmDialog open {...props} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toContain(ui.scrim);
    expect(dialog.className).not.toMatch(/backdrop:bg-nyoki-/);
  });

  it("stays closed until asked", () => {
    render(<ConfirmDialog open={false} {...props} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("confirms with the action's own wording, never a bare OK", async () => {
    const user = userEvent.setup();
    render(<ConfirmDialog open {...props} />);

    expect(screen.queryByRole("button", { name: /^ok$/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Delete category" }));

    expect(props.onConfirm).toHaveBeenCalledTimes(1);
  });

  it("cancels from the Cancel button", async () => {
    const user = userEvent.setup();
    render(<ConfirmDialog open {...props} />);

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(props.onCancel).toHaveBeenCalledTimes(1);
    expect(props.onConfirm).not.toHaveBeenCalled();
  });

  it("cancels on Escape, which the browser reports as a cancel event", () => {
    render(<ConfirmDialog open {...props} />);

    screen.getByRole("dialog").dispatchEvent(new Event("cancel", { bubbles: true, cancelable: true }));

    expect(props.onCancel).toHaveBeenCalledTimes(1);
  });

  it("puts Cancel before the destructive button so the safe choice gets focus first", () => {
    render(<ConfirmDialog open {...props} />);

    const buttons = screen.getAllByRole("button").map((b) => b.textContent);
    expect(buttons).toEqual(["Cancel", "Delete category"]);
  });

  it("can be a plain confirmation rather than a destructive one", () => {
    render(<ConfirmDialog open {...props} tone="primary" confirmLabel="Reset password" />);

    expect(screen.getByRole("button", { name: "Reset password" })).not.toHaveClass("bg-red-700");
  });
});
