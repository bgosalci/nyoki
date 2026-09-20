import { render, screen } from "@testing-library/react";

import { LoginForm } from "@/components/admin/login-form";

const noopAction = async () => ({ error: null });

describe("LoginForm", () => {
  it("renders labelled email and password fields", () => {
    render(<LoginForm action={noopAction} />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("marks the password field as a password input", () => {
    render(<LoginForm action={noopAction} />);

    expect(screen.getByLabelText(/password/i)).toHaveAttribute(
      "type",
      "password",
    );
  });

  it("asks the browser for the right autocomplete hints", () => {
    render(<LoginForm action={noopAction} />);

    expect(screen.getByLabelText(/email/i)).toHaveAttribute(
      "autocomplete",
      "username",
    );
    expect(screen.getByLabelText(/password/i)).toHaveAttribute(
      "autocomplete",
      "current-password",
    );
  });

  it("shows no error region before a failed attempt", () => {
    render(<LoginForm action={noopAction} />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps the typed email after a failed attempt", () => {
    render(
      <LoginForm
        action={noopAction}
        initialState={{ error: "Wrong details", email: "njomza@nyoki.co.uk" }}
      />,
    );

    // Retyping the address after every slip is needless friction.
    expect(screen.getByLabelText(/email/i)).toHaveValue("njomza@nyoki.co.uk");
  });

  it("never echoes the password back", () => {
    render(
      <LoginForm
        action={noopAction}
        initialState={{ error: "Wrong details", email: "njomza@nyoki.co.uk" }}
      />,
    );

    expect(screen.getByLabelText(/password/i)).toHaveValue("");
  });

  it("announces an error to screen readers when one is returned", () => {
    render(
      <LoginForm action={noopAction} initialState={{ error: "Wrong details" }} />,
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Wrong details");
  });
});
