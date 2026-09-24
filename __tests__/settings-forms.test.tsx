import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ChangePasswordForm } from "@/components/admin/change-password-form";
import { NewAdminForm } from "@/components/admin/new-admin-form";

const noopPassword = async () => ({ errors: {}, done: false });
const noopAdmin = async () => ({ errors: {}, created: null });

describe("ChangePasswordForm", () => {
  it("asks for the current password and the new one twice", () => {
    render(<ChangePasswordForm action={noopPassword} />);

    expect(screen.getByLabelText(/current password/i)).toHaveAttribute("type", "password");
    expect(screen.getByLabelText(/^new password/i)).toHaveAttribute("type", "password");
    expect(screen.getByLabelText(/confirm/i)).toHaveAttribute("type", "password");
  });

  it("gives the browser the right autocomplete hints so a password manager can help", () => {
    render(<ChangePasswordForm action={noopPassword} />);

    expect(screen.getByLabelText(/current password/i)).toHaveAttribute("autocomplete", "current-password");
    expect(screen.getByLabelText(/^new password/i)).toHaveAttribute("autocomplete", "new-password");
    expect(screen.getByLabelText(/confirm/i)).toHaveAttribute("autocomplete", "new-password");
  });

  it("shows a field error where it belongs", () => {
    render(<ChangePasswordForm action={noopPassword} initialState={{ errors: { currentPassword: "Enter your current password." }, done: false }} />);

    expect(screen.getByLabelText(/current password/i)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Enter your current password.")).toBeInTheDocument();
  });

  it("confirms success", () => {
    render(<ChangePasswordForm action={noopPassword} initialState={{ errors: {}, done: true }} />);

    expect(screen.getByRole("status")).toHaveTextContent(/password changed/i);
  });
});

describe("NewAdminForm", () => {
  it("asks for email, name and role", () => {
    render(<NewAdminForm action={noopAdmin} />);

    expect(screen.getByLabelText(/email/i)).toHaveAttribute("type", "email");
    expect(screen.getByLabelText(/^name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/staff/i)).toBeChecked();
    expect(screen.getByLabelText(/owner/i)).not.toBeChecked();
  });

  it("shows the generated password exactly once, with a warning that it will not be shown again", () => {
    render(
      <NewAdminForm
        action={noopAdmin}
        initialState={{ errors: {}, created: { email: "new@nyoki.co.uk", password: "generated-secret-here" } }}
      />,
    );

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("new@nyoki.co.uk");
    expect(status).toHaveTextContent("generated-secret-here");
    expect(status).toHaveTextContent(/won't be shown again|will not be shown again/i);
  });

  it("shows a field error where it belongs", () => {
    render(<NewAdminForm action={noopAdmin} initialState={{ errors: { email: "Another account already uses that email." }, created: null }} />);

    expect(screen.getByLabelText(/email/i)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Another account already uses that email.")).toBeInTheDocument();
  });
});

describe("NewAdminForm, when it is rejected", () => {
  it("keeps the email and name typed", async () => {
    render(<NewAdminForm action={async () => ({ errors: { email: "Another account already uses that email." }, created: null })} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/^email/i), "njomza@nyoki.co.uk");
    await user.type(screen.getByLabelText(/^name/i), "Njomza");
    await user.click(screen.getByRole("button", { name: /create account/i }));
    await screen.findByText("Another account already uses that email.");

    expect(screen.getByLabelText(/^email/i)).toHaveValue("njomza@nyoki.co.uk");
    expect(screen.getByLabelText(/^name/i)).toHaveValue("Njomza");
  });
});

describe("ChangePasswordForm, when it is rejected", () => {
  it("clears the passwords, which are typed again after a failure", async () => {
    render(<ChangePasswordForm action={async () => ({ errors: { currentPassword: "That is not your current password." }, done: false })} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/current password/i), "not-it");
    await user.type(screen.getByLabelText(/^new password/i), "a-new-long-password");
    await user.type(screen.getByLabelText(/confirm/i), "a-new-long-password");
    await user.click(screen.getByRole("button"));
    await screen.findByText("That is not your current password.");

    expect(screen.getByLabelText(/current password/i)).toHaveValue("");
  });
});
