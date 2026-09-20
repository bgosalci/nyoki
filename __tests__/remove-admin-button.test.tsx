import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { RemoveAdminButton } from "@/components/admin/remove-admin-button";

const noop = async () => ({ error: null });

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); this.dispatchEvent(new Event("close")); };
});

describe("RemoveAdminButton", () => {
  it("names the account it removes", () => {
    render(<RemoveAdminButton action={noop} name="Njomza" />);

    expect(screen.getByRole("button", { name: /remove njomza/i })).toBeInTheDocument();
  });

  it("asks in a dialog rather than a browser prompt, and only submits once confirmed", async () => {
    const user = userEvent.setup();
    const confirm = jest.spyOn(window, "confirm");
    const action = jest.fn(async () => ({ error: null }));
    render(<RemoveAdminButton action={action} name="Njomza" />);

    await user.click(screen.getByRole("button", { name: /remove njomza/i }));

    expect(confirm).not.toHaveBeenCalled();
    const dialog = screen.getByRole("dialog", { name: /remove njomza/i });
    expect(dialog).toHaveTextContent(/no longer be able to sign in/i);
    expect(action).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(action).not.toHaveBeenCalled();
  });

  it("shows why a removal was refused", () => {
    render(<RemoveAdminButton action={noop} name="Njomza" initialState={{ error: "The last owner cannot be removed." }} />);

    expect(screen.getByRole("alert")).toHaveTextContent("The last owner cannot be removed.");
  });
});
