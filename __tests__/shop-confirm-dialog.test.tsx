import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ConfirmDialog } from "@/components/shop/confirm-dialog";
import { ui } from "@/lib/brand/ui";

// jsdom does not implement the dialog element's modal methods.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); this.dispatchEvent(new Event("close")); };
});

const props = {
  title: "Remove Silver Snowflake Card?",
  description: "It comes out of your basket.",
  confirmLabel: "Remove",
  cancelLabel: "Keep it",
  onConfirm: jest.fn(),
  onCancel: jest.fn(),
};

describe("the shop's ConfirmDialog", () => {
  beforeEach(() => jest.clearAllMocks());

  it("is a labelled dialog showing the question and what it means when open", () => {
    render(<ConfirmDialog open {...props} />);

    const dialog = screen.getByRole("dialog", { name: "Remove Silver Snowflake Card?" });
    expect(dialog).toHaveAttribute("open");
    expect(dialog).toHaveAccessibleDescription("It comes out of your basket.");
  });

  it("stays closed until asked", () => {
    render(<ConfirmDialog open={false} {...props} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("puts the safe choice first, and confirms with the action's own words", async () => {
    const user = userEvent.setup();
    render(<ConfirmDialog open {...props} />);

    const [first, second] = screen.getAllByRole("button");
    expect(first).toHaveTextContent("Keep it");
    expect(second).toHaveTextContent("Remove");

    await user.click(second);
    expect(props.onConfirm).toHaveBeenCalledTimes(1);
    expect(props.onCancel).not.toHaveBeenCalled();
  });

  it("cancels from its button and from Escape", async () => {
    const user = userEvent.setup();
    render(<ConfirmDialog open {...props} />);

    await user.click(screen.getByRole("button", { name: "Keep it" }));
    screen.getByRole("dialog").dispatchEvent(new Event("cancel", { cancelable: true }));

    expect(props.onCancel).toHaveBeenCalledTimes(2);
    expect(props.onConfirm).not.toHaveBeenCalled();
  });

  it("is light-only, in the shop's own colours, over a neutral scrim", () => {
    render(<ConfirmDialog open {...props} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toContain(ui.scrim);
    expect(dialog.className).toContain(ui.shopSurface);
    expect(dialog.outerHTML).not.toMatch(/\bdark:/);
  });
});
