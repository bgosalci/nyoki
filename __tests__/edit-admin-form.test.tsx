import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { EditAdminForm } from "@/components/admin/edit-admin-form";
import { ResetPasswordButton } from "@/components/admin/reset-password-button";

const noopEdit = async () => ({ errors: {}, saved: false });
const noopReset = async () => ({ password: null, error: null });

describe("EditAdminForm", () => {
  it("prefills the name and current role", () => {
    render(<EditAdminForm action={noopEdit} admin={{ name: "Njomza", role: "OWNER" }} />);

    expect(screen.getByLabelText(/^name/i)).toHaveValue("Njomza");
    expect(screen.getByLabelText(/owner/i)).toBeChecked();
    expect(screen.getByLabelText(/staff/i)).not.toBeChecked();
  });

  it("shows a role error where it belongs", () => {
    render(
      <EditAdminForm
        action={noopEdit}
        admin={{ name: "Njomza", role: "OWNER" }}
        initialState={{ errors: { role: "The last owner cannot be made staff." }, saved: false }}
      />,
    );

    expect(screen.getByText("The last owner cannot be made staff.")).toBeInTheDocument();
  });

  it("confirms a save", () => {
    render(<EditAdminForm action={noopEdit} admin={{ name: "Njomza", role: "OWNER" }} initialState={{ errors: {}, saved: true }} />);

    expect(screen.getByRole("status")).toHaveTextContent(/saved/i);
  });
});

describe("ResetPasswordButton", () => {
  it("offers to reset the named account's password", () => {
    render(<ResetPasswordButton action={noopReset} name="Burim" />);

    expect(screen.getByRole("button", { name: /reset burim's password/i })).toBeInTheDocument();
  });

  it("shows the new password once, with a warning", () => {
    render(<ResetPasswordButton action={noopReset} name="Burim" initialState={{ password: "fresh-generated-secret", error: null }} />);

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("fresh-generated-secret");
    expect(status).toHaveTextContent(/won't be shown again|will not be shown again/i);
  });

  it("shows why a reset was refused", () => {
    render(<ResetPasswordButton action={noopReset} name="Burim" initialState={{ password: null, error: "Only an owner can reset passwords." }} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Only an owner can reset passwords.");
  });
});

describe("EditAdminForm, when a save is rejected", () => {
  it("keeps the name typed and the role chosen", async () => {
    render(<EditAdminForm action={async () => ({ errors: { role: "The shop needs at least one owner." }, saved: false })} admin={{ name: "Njomza", role: "OWNER" }} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/^name/i), " G");
    await user.click(screen.getByLabelText(/staff/i));
    await user.click(screen.getByRole("button", { name: /save changes/i }));
    await screen.findByText("The shop needs at least one owner.");

    expect(screen.getByLabelText(/^name/i)).toHaveValue("Njomza G");
    expect(screen.getByLabelText(/staff/i)).toBeChecked();
  });
});
